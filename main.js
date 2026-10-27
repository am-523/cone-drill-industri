import Lenis from 'lenis';

/* ==========================================================================
   TITAN 40-XR // MAIN CONTROLLER
   Pure Inter Typography, Fixed Full-Bleed Canvas & Natural Vertical Scroll Flow
   ========================================================================== */

const TOTAL_FRAMES = 50;
const FRAME_PATH = (idx) => `/asset/ezgif-frame-${String(idx).padStart(3, '0')}.jpg`;

// Frames state
const frames = [];
let loadedCount = 0;
let isLoaded = false;

// LERP interpolation state for silky 60fps scrubbing
let currentFrame = 1;
let targetFrame = 1;

/* ==========================================================================
   1. LENIS SMOOTH SCROLL INITIALIZATION
   ========================================================================== */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);

  // Smooth LERP interpolation
  currentFrame += (targetFrame - currentFrame) * 0.15;
  renderCanvas();

  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* ==========================================================================
   2. 50-FRAME PRELOADER
   ========================================================================== */
const preloader = document.getElementById('preloader');
const loadingPct = document.getElementById('loading-pct');
const loadingBar = document.getElementById('loading-bar');
const loadingStatus = document.getElementById('loading-status');

function preloadFrames() {
  // Render first frame immediately to eliminate layout flash
  const firstImg = new Image();
  firstImg.src = FRAME_PATH(1);
  firstImg.onload = () => {
    frames[1] = firstImg;
    renderCanvas();
  };
  if (firstImg.complete) {
    frames[1] = firstImg;
    renderCanvas();
  }

  // Stream load remaining frames
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    if (i === 1) continue;

    const img = new Image();
    img.src = FRAME_PATH(i);
    img.onload = () => {
      loadedCount++;
      const pct = Math.round((loadedCount / (TOTAL_FRAMES - 1)) * 100);

      if (loadingPct) loadingPct.textContent = `${pct}%`;
      if (loadingBar) loadingBar.style.width = `${pct}%`;

      if (loadedCount >= TOTAL_FRAMES - 1) {
        completePreload();
      }
    };
    img.onerror = () => {
      loadedCount++;
      if (loadedCount >= TOTAL_FRAMES - 1) completePreload();
    };
    frames[i] = img;
  }
}

function completePreload() {
  isLoaded = true;
  if (preloader) {
    preloader.classList.add('loaded');
  }
}

/* ==========================================================================
   3. FULL-BLEED RETINA CANVAS RENDERER
   ========================================================================== */
const canvas = document.getElementById('drill-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.scale(dpr, dpr);
  renderCanvas();
}
window.addEventListener('resize', resizeCanvas);

function renderCanvas() {
  if (!ctx || !canvas) return;

  const frameIdx = Math.min(Math.max(Math.round(currentFrame), 1), TOTAL_FRAMES);
  let img = frames[frameIdx];

  // Graceful fallback to nearest available loaded frame
  if (!img || !img.complete || img.naturalWidth === 0) {
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = frameIdx - offset;
      const next = frameIdx + offset;
      if (prev >= 1 && frames[prev]?.complete && frames[prev].naturalWidth > 0) {
        img = frames[prev];
        break;
      }
      if (next <= TOTAL_FRAMES && frames[next]?.complete && frames[next].naturalWidth > 0) {
        img = frames[next];
        break;
      }
    }
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  // Solid dark background fill
  ctx.fillStyle = '#070a0e';
  ctx.fillRect(0, 0, w, h);

  if (img && img.complete && img.naturalWidth > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;
    let renderW, renderH, offsetX, offsetY;

    // Full-bleed cover: fills entire viewport edge-to-edge
    if (canvasRatio > imgRatio) {
      renderW = w;
      renderH = w / imgRatio;
      offsetX = 0;
      offsetY = (h - renderH) / 2;
    } else {
      renderH = h;
      renderW = h * imgRatio;
      offsetX = (w - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }
}

/* ==========================================================================
   4. NATURAL SCROLL SYNCHRONIZATION WITH LENIS
   ========================================================================== */
const sections = document.querySelectorAll('.story-section');
const navItems = document.querySelectorAll('.nav-item');

function onScrollUpdate() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return;

  const scrollY = window.scrollY;
  const progress = Math.max(0, Math.min(1, scrollY / maxScroll));

  // Map progress (0.0 to 1.0) to frame index (1 to 50)
  targetFrame = 1 + Math.round(progress * (TOTAL_FRAMES - 1));

  // Determine active section based on scroll position
  const vh = window.innerHeight;
  let activeIdx = 0;

  sections.forEach((sec, idx) => {
    const top = sec.offsetTop;
    if (scrollY >= top - vh * 0.45) {
      activeIdx = idx;
    }
  });

  navItems.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === activeIdx);
  });
}

// Hook into Lenis scroll events
lenis.on('scroll', onScrollUpdate);

/* ==========================================================================
   5. NAVBAR CLICK NAVIGATION
   ========================================================================== */
navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      lenis.scrollTo(targetEl, { duration: 1.2 });
    }
  });
});

const ctaInquire = document.getElementById('cta-inquire');
if (ctaInquire) {
  ctaInquire.addEventListener('click', () => {
    const lastSection = document.getElementById('act-3');
    if (lastSection) {
      lenis.scrollTo(lastSection, { duration: 1.4 });
    }
  });
}

/* ==========================================================================
   6. BOOTSTRAP INITIALIZATION
   ========================================================================== */
resizeCanvas();
preloadFrames();
onScrollUpdate();
