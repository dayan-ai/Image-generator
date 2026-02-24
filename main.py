import mimetypes
# Windows Fix: Ye batata hai computer ko ke CSS aur JS files kya hain
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")

import os
import time
import json
import asyncio

import httpx
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# --- CONFIGURATION ---
LEONARDO_API_KEY = os.getenv("LEONARDO_API_KEY", "YOUR_LEONARDO_KEY_HERE")
LEONARDO_BASE    = "https://cloud.leonardo.ai/api/rest/v1"

MODEL_PHOENIX_10   = "6b645e3a-d64f-4341-a6d8-7a3690fbf042"
MODEL_DIFFUSION_XL = "b24e16ff-06e3-43eb-8d33-4416c2d75876"
DEFAULT_MODEL      = MODEL_PHOENIX_10

ASPECT_MAP = {
    "1:1":  (1024, 1024),
    "16:9": (1360, 768),
    "9:16": (768,  1360),
    "4:3":  (1024, 768),
    "3:4":  (768,  1024),
}

STYLE_MAP = {
    "photorealistic": "photorealistic, ultra detailed, 8k, sharp focus, professional photography",
    "anime":          "anime style, vibrant colors, detailed illustration, cel shading",
    "digital-art":    "digital art, concept art, trending on artstation, highly detailed",
    "oil-painting":   "oil painting, classical masterpiece, visible brush strokes, canvas texture",
    "cyberpunk":      "cyberpunk aesthetic, neon lights, futuristic, blade runner style, neon glow",
    "avatar":         "3D avatar, stylized character, game art, Pixar style, clean render",
}

# --- APP SETUP ---
app = FastAPI(
    title="Imaginex API",
    description="AI Image generation via Leonardo AI",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LIFECYCLE EVENTS ---
@app.on_event("startup")
async def startup():
    app.state.http = httpx.AsyncClient(timeout=180.0)

@app.on_event("shutdown")
async def shutdown():
    await app.state.http.aclose()

# --- HELPER FUNCTIONS ---
def leo_headers() -> dict:
    return {
        "Authorization": f"Bearer {LEONARDO_API_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }

def build_prompt(prompt: str, style: str) -> str:
    suffix = STYLE_MAP.get(style, "")
    return f"{prompt}, {suffix}".strip(", ") if suffix else prompt

def validate_image(image: UploadFile, image_bytes: bytes) -> str:
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (PNG / JPG / WEBP)")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image must be under 10 MB")
    ext = (image.filename or "upload.jpg").rsplit(".", 1)[-1].lower()
    ext = ext if ext in ("jpg", "jpeg", "png", "webp") else "jpg"
    return "jpg" if ext == "jpeg" else ext

async def poll_image(
    client: httpx.AsyncClient,
    generation_id: str,
    max_wait: int = 180,
) -> list:
    url      = f"{LEONARDO_BASE}/generations/{generation_id}"
    deadline = time.time() + max_wait

    while time.time() < deadline:
        await asyncio.sleep(4)
        r = await client.get(url, headers=leo_headers())
        if r.status_code != 200:
            raise HTTPException(r.status_code, f"Leonardo poll error: {r.text}")

        data   = r.json().get("generations_by_pk", {})
        status = data.get("status", "PENDING")
        print(f"[Poll] {generation_id[:8]}... status={status}")

        if status == "COMPLETE":
            imgs = data.get("generated_images", [])
            if not imgs:
                raise HTTPException(502, "Leonardo returned no images")
            return [img["url"] for img in imgs]

        if status == "FAILED":
            raise HTTPException(502, "Leonardo image generation failed")

    raise HTTPException(504, "Image generation timed out (3 min)")

async def upload_init_image(
    client: httpx.AsyncClient,
    image_bytes: bytes,
    ext: str = "jpg",
) -> str:
    r = await client.post(
        f"{LEONARDO_BASE}/init-image",
        headers=leo_headers(),
        json={"extension": ext},
    )
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Leonardo init-image failed: {r.text}")

    resp        = r.json()
    upload_data = resp.get("uploadInitImage") or resp.get("data")
    if not upload_data:
        raise HTTPException(502, f"Unexpected Leonardo init-image response: {resp}")

    image_id   = upload_data["id"]
    upload_url = upload_data["url"]
    fields_raw = upload_data.get("fields", {})
    fields     = json.loads(fields_raw) if isinstance(fields_raw, str) else fields_raw

    form_data = [(k, (None, str(v))) for k, v in fields.items()]
    form_data.append(("file", (f"image.{ext}", image_bytes, f"image/{ext}")))

    async with httpx.AsyncClient(timeout=60.0) as s3:
        s3r = await s3.post(upload_url, files=form_data)

    if s3r.status_code not in (200, 204):
        raise HTTPException(502, f"S3 upload failed ({s3r.status_code}): {s3r.text}")

    print(f"[Upload] Init image uploaded -> id={image_id}")
    return image_id

# --- ROUTES ---

@app.post("/generate/text-to-image")
async def text_to_image(
    request:         Request,
    prompt:          str = Form(...),
    negative_prompt: str = Form(""),
    aspect_ratio:    str = Form("1:1"),
    style:           str = Form("none"),
):
    width, height = ASPECT_MAP.get(aspect_ratio, (1024, 1024))
    full_prompt   = build_prompt(prompt, style)
    neg           = negative_prompt or "blurry, low quality, distorted, deformed, ugly, watermark, text, nsfw"

    payload = {
        "prompt":              full_prompt,
        "negative_prompt":     neg,
        "modelId":             DEFAULT_MODEL,
        "width":               width,
        "height":              height,
        "num_images":          1,
        "guidance_scale":      7,
        "num_inference_steps": 30,
        "public":              False,
        "tiling":              False,
    }

    print(f"[Text->Image] '{full_prompt[:70]}' @ {width}x{height}")

    client = request.app.state.http
    r = await client.post(f"{LEONARDO_BASE}/generations", headers=leo_headers(), json=payload)

    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Leonardo error: {r.text}")

    resp   = r.json()
    gen_id = resp.get("sdGenerationJob", {}).get("generationId")
    if not gen_id:
        raise HTTPException(502, f"No generationId returned: {resp}")

    urls = await poll_image(client, gen_id)
    return JSONResponse({"image_url": urls[0], "all_urls": urls, "generation_id": gen_id})


@app.post("/generate/image-to-image")
async def image_to_image(
    request:         Request,
    prompt:          str        = Form(...),
    negative_prompt: str        = Form(""),
    aspect_ratio:    str        = Form("1:1"),
    style:           str        = Form("none"),
    strength:        float      = Form(0.65),
    image:           UploadFile = File(...),
):
    image_bytes   = await image.read()
    ext           = validate_image(image, image_bytes)
    width, height = ASPECT_MAP.get(aspect_ratio, (1024, 1024))
    full_prompt   = build_prompt(prompt, style)
    neg           = negative_prompt or "blurry, low quality, distorted, deformed, ugly"

    init_strength = round(max(0.1, min(0.9, 1.0 - strength)), 2)

    print(f"[Image->Image] Uploading ref ({len(image_bytes)//1024} KB)...")
    client        = request.app.state.http
    init_image_id = await upload_init_image(client, image_bytes, ext)

    payload = {
        "prompt":          full_prompt,
        "negative_prompt": neg,
        "modelId":         DEFAULT_MODEL,
        "width":           width,
        "height":          height,
        "num_images":      1,
        "init_image_id":   init_image_id,
        "init_strength":   init_strength,
        "guidance_scale":  7,
        "public":          False,
    }

    print(f"[Image->Image] '{full_prompt[:70]}' strength={init_strength}")

    r = await client.post(f"{LEONARDO_BASE}/generations", headers=leo_headers(), json=payload)

    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Leonardo error: {r.text}")

    resp   = r.json()
    gen_id = resp.get("sdGenerationJob", {}).get("generationId")
    if not gen_id:
        raise HTTPException(502, f"No generationId returned: {resp}")

    urls = await poll_image(client, gen_id)
    return JSONResponse({"image_url": urls[0], "all_urls": urls, "generation_id": gen_id})


@app.get("/status/image/{generation_id}")
async def image_status(generation_id: str, request: Request):
    client = request.app.state.http
    r = await client.get(f"{LEONARDO_BASE}/generations/{generation_id}", headers=leo_headers())
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Status check failed: {r.text}")

    data   = r.json().get("generations_by_pk", {})
    status = data.get("status", "UNKNOWN")
    images = [img["url"] for img in data.get("generated_images", [])]
    return JSONResponse({"status": status, "images": images, "generation_id": generation_id})


@app.get("/health")
async def health():
    return {
        "status":      "ok",
        "service":     "Imaginex API v4",
        "provider":    "Leonardo AI",
        "image_model": "Leonardo Phoenix 1.0",
    }

@app.exception_handler(Exception)
async def global_error(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    print(f"[Error] {exc}")
    return JSONResponse(status_code=500, content={"error": f"Internal error: {str(exc)}"})

# --- STATIC FILES & FRONTEND ROUTES FIX (MAGIC PART) ---

app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
def read_root():
    return FileResponse("index.html")

# 1. Zabardasti CSS chalane wala code
@app.get("/style.css")
async def style():
    return FileResponse("style.css", media_type="text/css")

# 2. Zabardasti JS chalane wala code
@app.get("/script.js")
async def script():
    return FileResponse("script.js", media_type="application/javascript")

# 3. Favicon Error ko chup karane wala code
@app.get("/favicon.ico")
async def favicon():
    return JSONResponse({})