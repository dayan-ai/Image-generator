# ✨ Imaginex — AI Image Generator

![Imaginex Banner](https://via.placeholder.com/1200x400.png?text=Imaginex+AI+Generator+Banner)

> **Dream it. Generate it.** > Create stunning AI images from text or reference photos in seconds, powered by **Leonardo AI Phoenix**.

## 🚀 Overview

**Imaginex** is a cutting-edge web application that leverages the power of the Leonardo AI API to generate high-quality, artistic images. Whether you are an artist looking for inspiration or a developer exploring generative AI, Imaginex provides a seamless, responsive, and beautiful interface to bring your imagination to life.

Built with a robust **FastAPI** backend and a sleek, glassmorphism-styled **HTML/CSS/JS** frontend, this project demonstrates full-stack integration of modern AI tools.

## 🌟 Key Features

* **🎨 Text-to-Image Generation:** Turn your words into vivid visual art using the powerful *Leonardo Phoenix 1.0* model.
* **🖼️ Image-to-Image Transformation:** Upload an existing image and transform it into a new style (Anime, Cyberpunk, Oil Painting, etc.).
* **✨ Diverse Art Styles:** Choose from presets like *Photorealistic, Anime, Digital Art, 3D Avatar, and more*.
* **📐 Custom Aspect Ratios:** Support for Square (1:1), Landscape (16:9), Portrait (9:16), and others.
* **⚡ High Performance:** Built on `FastAPI` for lightning-fast backend responses.
* **📱 Fully Responsive:** A modern, dark-themed UI that looks great on desktop and mobile.

## 🛠️ Tech Stack

* **Backend:** Python 3.10+, FastAPI, Uvicorn, HTTPX
* **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
* **AI Engine:** Leonardo AI API (Phoenix & Diffusion XL models)
* **Styling:** FontAwesome Icons, Google Fonts (Outfit)

## ⚙️ Installation & Setup

Follow these steps to run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/dayan-ai/imaginex-backend.git](https://github.com/dayan-ai/imaginex-backend.git)
cd imaginex-backend
2. Create a Virtual Environment
It's recommended to use a virtual environment to manage dependencies.

Windows:

Bash
python -m venv .venv
.venv\Scripts\activate
Mac/Linux:

Bash
python3 -m venv .venv
source .venv/bin/activate
3. Install Dependencies
Bash
pip install -r Requirements.txt
4. Configure API Key
You need a Leonardo AI API key to generate images.

Get your key from Leonardo.ai.

Option A (Temporary): Set it in your terminal:

Windows: set LEONARDO_API_KEY=your_actual_api_key

Mac/Linux: export LEONARDO_API_KEY=your_actual_api_key

Option B (Permanent): Create a .env file (if configured) or hardcode it in main.py (not recommended for public repos).

5. Run the Server
Start the backend server using Uvicorn:

Bash
uvicorn main:app --reload --port 8000
6. Access the App
Open your browser and navigate to:
http://127.0.0.1:8000

📂 Project Structure
imaginex-backend/
├── main.py              # FastAPI Backend & Routing Logic
├── index.html           # Main Frontend Interface
├── style.css            # Custom Glassmorphism Styling
├── script.js            # Frontend Logic & API Integration
├── Requirements.txt     # Python Dependencies
├── .gitignore           # Ignored files (venv, pycache)
└── README.md            # Project Documentation
📸 Screenshots
Generator Interface	Gallery View
🤝 Contributing
Contributions are welcome! If you have ideas to improve Imaginex, feel free to fork the repository and submit a pull request.

Fork the Project

Create your Feature Branch (git checkout -b feature/AmazingFeature)

Commit your Changes (git commit -m 'Add some AmazingFeature')

Push to the Branch (git push origin feature/AmazingFeature)

Open a Pull Request

📄 License
Distributed under the MIT License. See LICENSE for more information.

💖 Acknowledgements
Leonardo AI for their incredible generative models.

FastAPI for the high-performance web framework.

FontAwesome for the beautiful icons.

Made with ❤️ by Muhammad Dayan