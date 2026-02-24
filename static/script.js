(function () {
  'use strict';

  const API_BASE = 'http://localhost:8000';

  const tabBtns          = document.querySelectorAll('.tab-btn');
  const imageUploadGroup = document.getElementById('image-upload-group');
  const dropZone         = document.getElementById('drop-zone');
  const referenceImage   = document.getElementById('reference-image');
  const previewImg       = document.getElementById('preview-img');
  const uploadContent    = document.getElementById('upload-content');
  const removeImgBtn     = document.getElementById('remove-img-btn');
  const generateBtn      = document.getElementById('generate-btn');
  const btnText          = document.getElementById('btn-text');
  const promptEl         = document.getElementById('prompt');
  const negPromptEl      = document.getElementById('neg-prompt');
  const charCountEl      = document.getElementById('char-count');
  const aspectRatioEl    = document.getElementById('aspect-ratio');
  const stylePresetEl    = document.getElementById('style-preset');
  const resultPlaceholder = document.getElementById('result-placeholder');
  const genLoader         = document.getElementById('gen-loader');
  const loaderTitle       = document.getElementById('loader-title');
  const resultCard        = document.getElementById('result-card');
  const resultMediaWrap   = document.getElementById('result-media-wrap');
  const resultBadge       = document.getElementById('result-badge');
  const resultPromptPrev  = document.getElementById('result-prompt-preview');
  const btnDownload       = document.getElementById('btn-download');
  const btnFullscreen     = document.getElementById('btn-fullscreen');
  const btnRegenerate     = document.getElementById('btn-regenerate');
  const mobileMenuBtn     = document.getElementById('mobile-menu-btn');
  const navLinksEl        = document.getElementById('nav-links');
  const toastEl           = document.getElementById('toast');
  const loginModal        = document.getElementById('login-modal');
  const signupModal       = document.getElementById('signup-modal');
  const openLoginBtn      = document.getElementById('open-login-btn');
  const openSignupBtn     = document.getElementById('open-signup-btn');
  const closeLoginBtn     = document.getElementById('close-login');
  const closeSignupBtn    = document.getElementById('close-signup');
  const switchToSignup    = document.getElementById('switch-to-signup');
  const switchToLogin     = document.getElementById('switch-to-login');
  const loginForm         = document.getElementById('login-form');
  const signupForm        = document.getElementById('signup-form');
  const signupPwEl        = document.getElementById('signup-password');
  const strengthBar       = document.getElementById('strength-bar');
  const strengthLabel     = document.getElementById('strength-label');
  const lightbox          = document.getElementById('lightbox');
  const lightboxClose     = document.getElementById('lightbox-close');
  const lightboxInner     = document.getElementById('lightbox-inner');
  const galleryGrid       = document.getElementById('gallery-grid');
  const filterBtns        = document.querySelectorAll('.filter-btn');
  const copyCodeBtn       = document.getElementById('copy-code-btn');

  const pages = {
    generator: document.getElementById('page-generator'),
    gallery:   document.getElementById('page-gallery'),
    pricing:   document.getElementById('page-pricing'),
    api:       document.getElementById('page-api'),
  };
  const navMap = {
    'nav-generator': 'generator',
    'nav-gallery':   'gallery',
    'nav-pricing':   'pricing',
    'nav-api':       'api',
  };

  let currentMode      = 'txt2img';
  let isGenerating     = false;
  let currentUpload    = null;
  let currentResultUrl = null;
  let lastPrompt       = '';
  let activeFilter     = 'all';

  function showToast(msg, type = 'info') {
    toastEl.textContent = msg;
    toastEl.className   = `toast show ${type}`;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 4200);
  }

  
  function showPage(name) {
    Object.values(pages).forEach(p => p.classList.add('hidden'));
    pages[name].classList.remove('hidden');
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const link = document.getElementById('nav-' + name);
    if (link) link.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navLinksEl.classList.remove('open');
    if (name === 'gallery') buildGallery();
  }

  Object.keys(navMap).forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function (e) { e.preventDefault(); showPage(navMap[id]); });
  });

  mobileMenuBtn.addEventListener('click', function () {
    navLinksEl.classList.toggle('open');
    const icon = mobileMenuBtn.querySelector('i');
    icon.className = navLinksEl.classList.contains('open') ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.navbar')) navLinksEl.classList.remove('open');
  });

  var PLACEHOLDERS = {
    txt2img: "Describe what you want to see — e.g., 'A cyberpunk city at night with neon reflections on wet streets'...",
    img2img: "Describe how to transform your image — e.g., 'Make it look like an anime oil painting with vibrant colors'...",
  };

  function updateModeUI(mode) {
    currentMode = mode;
    var needsImg = (mode === 'img2img');

    imageUploadGroup.classList.toggle('hidden', !needsImg);

    promptEl.value    = '';
    negPromptEl.value = '';
    charCountEl.textContent = '0 / 500';
    charCountEl.className   = 'char-count';

    promptEl.placeholder = PLACEHOLDERS[mode] || PLACEHOLDERS.txt2img;

    if (!needsImg) clearUpload();
    resetResultArea();
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (isGenerating) return;
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      updateModeUI(btn.dataset.mode);
    });
  });

  promptEl.addEventListener('input', function () {
    var len = promptEl.value.length;
    var max = parseInt(promptEl.maxLength, 10);
    charCountEl.textContent = len + ' / ' + max;
    charCountEl.className   = 'char-count';
    if (len > max * 0.85) charCountEl.classList.add('warn');
    if (len >= max)        charCountEl.classList.add('over');
  });

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024)   { showToast('File too large — max 10 MB.', 'error'); return; }
    currentUpload = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewImg.classList.remove('hidden');
      uploadContent.classList.add('hidden');
      removeImgBtn.classList.remove('hidden');
      referenceImage.style.pointerEvents = 'none';
    };
    reader.readAsDataURL(file);
  }

  referenceImage.addEventListener('change', function (e) { handleFile(e.target.files[0]); });
  dropZone.addEventListener('dragover',  function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function ()  { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop',      function (e) {
    e.preventDefault(); dropZone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]);
  });
  removeImgBtn.addEventListener('click', function (e) { e.stopPropagation(); clearUpload(); });

  function clearUpload() {
    currentUpload = null;
    previewImg.src = '';
    previewImg.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    removeImgBtn.classList.add('hidden');
    referenceImage.value = '';
    referenceImage.style.pointerEvents = 'auto';
  }

  function resetResultArea() {
    genLoader.classList.add('hidden');
    resultCard.classList.add('hidden');
    resultPlaceholder.classList.remove('hidden');
    currentResultUrl = null;
  }
  function showLoader(msg) {
    resultPlaceholder.classList.add('hidden');
    resultCard.classList.add('hidden');
    loaderTitle.textContent = msg || 'Generating your image…';
    genLoader.classList.remove('hidden');
  }
  function showResult() {
    genLoader.classList.add('hidden');
    resultPlaceholder.classList.add('hidden');
    resultCard.classList.remove('hidden');
  }
  function showPlaceholder() {
    genLoader.classList.add('hidden');
    resultCard.classList.add('hidden');
    resultPlaceholder.classList.remove('hidden');
  }


  function setLoading(loading) {
    isGenerating         = loading;
    generateBtn.disabled = loading;
    if (loading) {
      var spinner = document.createElement('div');
      spinner.className = 'btn-spinner';
      spinner.id        = 'btn-spinner';
      var icon = document.getElementById('btn-icon');
      if (icon) icon.replaceWith(spinner);
      btnText.textContent = 'Generating…';
    } else {
      var sp = document.getElementById('btn-spinner');
      if (sp) {
        var ic = document.createElement('i');
        ic.className = 'fa-solid fa-wand-magic-sparkles';
        ic.id        = 'btn-icon';
        sp.replaceWith(ic);
      }
      btnText.textContent = 'Generate Image';
    }
  }


  function buildFormData(prompt) {
    var fd = new FormData();
    fd.append('prompt',          prompt);
    fd.append('negative_prompt', negPromptEl ? negPromptEl.value.trim() : '');
    fd.append('aspect_ratio',    aspectRatioEl.value);
    fd.append('style',           stylePresetEl ? stylePresetEl.value : 'none');
    if (currentUpload) fd.append('image', currentUpload, currentUpload.name);
    return fd;
  }

  var ENDPOINTS = {
    txt2img: API_BASE + '/generate/text-to-image',
    img2img: API_BASE + '/generate/image-to-image',
  };

  generateBtn.addEventListener('click', function () {
    if (!isGenerating) handleGenerate();
  });

  function handleGenerate() {
    var prompt = promptEl.value.trim();
    if (!prompt) { showToast('Please enter a prompt.', 'error'); promptEl.focus(); return; }
    if (currentMode === 'img2img' && !currentUpload) {
      showToast('Please upload a reference image.', 'error'); return;
    }

    lastPrompt = prompt;
    setLoading(true);
    showLoader(currentMode === 'img2img' ? 'Transforming your image…' : 'Generating your image…');

    var fd = buildFormData(prompt);
    fetch(ENDPOINTS[currentMode], { method: 'POST', body: fd })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return { error: 'HTTP ' + res.status }; }).then(function (err) {
            throw new Error(err.error || 'Server error ' + res.status);
          });
        }
        return res.json();
      })
      .then(function (data) {
        var imgUrl = data.image_url;
        if (!imgUrl) throw new Error('No image URL returned from server.');
        currentResultUrl = imgUrl;
        renderImageResult(imgUrl, prompt);
        showToast('Image generated successfully!', 'success');
      })
      .catch(function (err) {
        console.error(err);
        showToast('Error: ' + err.message, 'error');
        showPlaceholder();
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function renderImageResult(url, prompt) {
    resultMediaWrap.innerHTML = '';
    var img = new Image();
    img.alt = 'Generated image';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;max-height:540px;';
    img.onerror = function () { showToast('Image failed to load.', 'error'); showPlaceholder(); };
    img.onload  = function () { showResult(); };
    img.src = url;
    resultMediaWrap.appendChild(img);
    resultPromptPrev.textContent = prompt.length > 45 ? prompt.slice(0, 45) + '…' : prompt;
    resultBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Image Generated';
  }

  btnDownload.addEventListener('click', function () {
    if (!currentResultUrl) return;
    showToast('Preparing download…');
    fetch(currentResultUrl)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = 'imaginex-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        showToast('Downloaded!', 'success');
      })
      .catch(function () {
        window.open(currentResultUrl, '_blank');
        showToast('Opened in new tab.', 'warning');
      });
  });

  btnFullscreen.addEventListener('click', function () {
    if (!currentResultUrl) return;
    lightboxInner.innerHTML = '<img src="' + currentResultUrl + '" alt="Fullscreen preview">';
    lightbox.classList.remove('hidden');
  });
  lightboxClose.addEventListener('click', function () { lightbox.classList.add('hidden'); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) lightbox.classList.add('hidden'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lightbox.classList.add('hidden'); });

  btnRegenerate.addEventListener('click', function () {
    if (!lastPrompt || isGenerating) return;
    promptEl.value = lastPrompt;
    handleGenerate();
  });

  function openModal(m)  { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeModal(m) { m.classList.add('hidden');    document.body.style.overflow = ''; }

  openLoginBtn.addEventListener('click',   function () { openModal(loginModal); });
  openSignupBtn.addEventListener('click',  function () { openModal(signupModal); });
  closeLoginBtn.addEventListener('click',  function () { closeModal(loginModal); });
  closeSignupBtn.addEventListener('click', function () { closeModal(signupModal); });
  loginModal.addEventListener('click',  function (e) { if (e.target === loginModal)  closeModal(loginModal); });
  signupModal.addEventListener('click', function (e) { if (e.target === signupModal) closeModal(signupModal); });
  switchToSignup.addEventListener('click', function (e) { e.preventDefault(); closeModal(loginModal);  openModal(signupModal); });
  switchToLogin.addEventListener('click',  function (e) { e.preventDefault(); closeModal(signupModal); openModal(loginModal); });

  document.getElementById('google-login-btn').addEventListener('click', function () {
    showToast('Google OAuth coming soon!', 'warning'); closeModal(loginModal);
  });
  document.getElementById('google-signup-btn').addEventListener('click', function () {
    showToast('Google OAuth coming soon!', 'warning'); closeModal(signupModal);
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var pw    = document.getElementById('login-password').value;
    if (!email || !pw) { showToast('Please fill in all fields.', 'error'); return; }
    showToast('Welcome back, ' + email.split('@')[0] + '!', 'success');
    closeModal(loginModal); loginForm.reset();
  });

  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name  = document.getElementById('signup-name').value.trim();
    var email = document.getElementById('signup-email').value.trim();
    var pw    = document.getElementById('signup-password').value;
    if (!name || !email || !pw) { showToast('Please fill in all fields.', 'error'); return; }
    if (pw.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    showToast('Account created! Welcome, ' + name + '!', 'success');
    closeModal(signupModal); signupForm.reset();
    strengthBar.style.width = '0';
    strengthLabel.textContent = '';
  });

  signupPwEl.addEventListener('input', function () {
    var v = signupPwEl.value;
    var s = 0;
    if (v.length >= 8)          s++;
    if (/[A-Z]/.test(v))        s++;
    if (/[0-9]/.test(v))        s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    var labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    var colors = ['', '#f87171', '#f59e0b', '#60a5fa', '#4ade80'];
    var widths = ['0%', '25%', '50%', '75%', '100%'];
    strengthBar.style.width      = widths[s]  || '0%';
    strengthBar.style.background = colors[s]  || 'transparent';
    strengthLabel.textContent    = labels[s]  || '';
    strengthLabel.style.color    = colors[s]  || '';
  });

  document.querySelectorAll('.toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var inp  = document.getElementById(btn.dataset.target);
      var icon = btn.querySelector('i');
      inp.type       = inp.type === 'password' ? 'text' : 'password';
      icon.className = inp.type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
    });
  });

  var galleryData = [
    { seed: 10,  tag: 'photorealistic', prompt: 'Mountain landscape at golden hour' },
    { seed: 20,  tag: 'anime',          prompt: 'Samurai warrior in cherry blossom forest' },
    { seed: 30,  tag: 'digital-art',    prompt: 'Futuristic space station interior' },
    { seed: 40,  tag: 'cyberpunk',      prompt: 'Neon-lit rain-soaked Tokyo alley at night' },
    { seed: 50,  tag: 'photorealistic', prompt: 'Ocean wave crashing at sunrise' },
    { seed: 60,  tag: 'anime',          prompt: 'Magical girl with glowing celestial wings' },
    { seed: 70,  tag: 'digital-art',    prompt: 'Abstract geometric portal in deep space' },
    { seed: 80,  tag: 'oil-painting',   prompt: 'Classical Dutch windmill at dusk' },
    { seed: 90,  tag: 'cyberpunk',      prompt: 'Hacker workspace with holographic screens' },
    { seed: 100, tag: 'avatar',         prompt: '3D sci-fi warrior character render' },
    { seed: 110, tag: 'photorealistic', prompt: 'Misty forest path in golden autumn' },
    { seed: 120, tag: 'anime',          prompt: 'Underwater kingdom with glowing sea creatures' },
    { seed: 130, tag: 'digital-art',    prompt: 'Cybernetic dragon breathing plasma fire' },
    { seed: 140, tag: 'oil-painting',   prompt: 'Impressionist Parisian café in the rain' },
    { seed: 150, tag: 'avatar',         prompt: 'Pixar-style fantasy elf character' },
    { seed: 160, tag: 'photorealistic', prompt: 'Aurora borealis over frozen Icelandic lake' },
    { seed: 170, tag: 'cyberpunk',      prompt: 'Mega city skyline at electric dusk' },
    { seed: 180, tag: 'anime',          prompt: 'Shonen hero mid-battle transformation' },
    { seed: 190, tag: 'oil-painting',   prompt: 'Baroque still-life with exotic tropical fruits' },
    { seed: 200, tag: 'digital-art',    prompt: 'Bioluminescent alien jungle at midnight' },
    { seed: 210, tag: 'avatar',         prompt: 'Game-ready steampunk engineer character' },
    { seed: 220, tag: 'photorealistic', prompt: 'Sahara sand dunes at fiery sunset' },
    { seed: 230, tag: 'cyberpunk',      prompt: 'Underground neon rave with laser projections' },
    { seed: 240, tag: 'oil-painting',   prompt: 'Stormy sea crashing on ancient rocky cliffs' },
  ];

  function buildGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    var filtered = activeFilter === 'all'
      ? galleryData
      : galleryData.filter(function (d) { return d.tag === activeFilter; });

    filtered.forEach(function (item, i) {
      var el = document.createElement('div');
      el.className = 'gallery-item';
      el.style.animationDelay = (i * 0.04) + 's';
      var url = 'https://picsum.photos/seed/' + item.seed + '/400/400';
      el.innerHTML =
        '<img src="' + url + '" alt="' + item.prompt + '" loading="lazy">' +
        '<div class="gallery-item-overlay">' +
          '<span class="gallery-item-tag">' + item.tag + '</span>' +
          '<span class="gallery-item-prompt">' + item.prompt + '</span>' +
        '</div>';
      el.addEventListener('click', function () {
        lightboxInner.innerHTML = '<img src="' + url + '" alt="' + item.prompt + '">';
        lightbox.classList.remove('hidden');
      });
      galleryGrid.appendChild(el);
    });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      buildGallery();
    });
  });


  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', function () {
      var code = document.querySelector('.code-content code');
      if (!code) return;
      navigator.clipboard.writeText(code.innerText).then(function () {
        copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(function () { copyCodeBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy'; }, 2200);
      }).catch(function () { showToast('Could not copy.', 'error'); });
    });
  }

  document.querySelectorAll('.plan-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.id === 'api-key-btn') { openModal(signupModal); return; }
      if (btn.classList.contains('primary-plan-btn')) openModal(signupModal);
      else showToast('Contact us at hello@imaginex.ai', 'info');
    });
  });

  var apiKeyBtn = document.getElementById('api-key-btn');
  if (apiKeyBtn) {
    apiKeyBtn.addEventListener('click', function () { openModal(signupModal); });
  }


  updateModeUI('txt2img');
  showPage('generator');

}());