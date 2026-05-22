// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Hero scroll-driven build (canvas + lerp, mobile-aware) ---------- */
(function () {
  const hero    = document.querySelector('.hero');
  const canvas  = document.getElementById('buildCanvas');
  const fbImg   = document.getElementById('buildFrame');
  const loading = document.getElementById('buildLoading');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const stages      = Array.from(hero.querySelectorAll('.stage'));
  const progressBar = hero.querySelector('.stage-progress-bar');
  const captionName = hero.querySelector('.caption-name');

  // Mobile vs desktop frame set
  const isMobile = window.matchMedia('(max-width: 980px)').matches;
  const TOTAL  = isMobile ? 48 : 60;
  const FOLDER = isMobile ? 'frames-mobile' : 'frames';
  const DPR_CAP = isMobile ? 1.5 : 2;
  const LERP   = isMobile ? 0.28 : 0.18;
  const pad   = (n) => (n < 10 ? '0' + n : '' + n);
  const url   = (n) => `assets/${FOLDER}/${pad(n)}.jpg`;

  const phases = [
    { from: 0.00, name: 'Připraveno začít' },
    { from: 0.10, name: 'Základy' },
    { from: 0.28, name: 'Stěny a okna' },
    { from: 0.46, name: 'Krov' },
    { from: 0.62, name: 'Krytina a komín' },
    { from: 0.78, name: 'Pergola a terasa' },
    { from: 0.94, name: 'Hotovo' }
  ];
  const stageRanges = [
    { from: 0.10, to: 0.30 },
    { from: 0.28, to: 0.50 },
    { from: 0.46, to: 0.64 },
    { from: 0.62, to: 0.80 },
    { from: 0.78, to: 1.00 }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Preload všech snímků jako Image objekty
  const images = new Array(TOTAL);
  let loaded = 0, firstReady = false;
  function preload() {
    for (let i = 0; i < TOTAL; i++) {
      const img = new Image();
      img.src = url(i + 1);
      img.onload = () => {
        loaded++;
        if (i === 0) {
          firstReady = true;
          sizeCanvas();
          drawAt(targetIdx);
          canvas.classList.add('ready');
        }
        if (loaded === TOTAL && loading) loading.classList.remove('show');
      };
      img.onerror = () => { loaded++; };
      images[i] = img;
    }
    if (loading) loading.classList.add('show');
  }

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr  = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.max(1, Math.round(rect.width  * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w)  canvas.width  = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
  }

  function drawAt(idx) {
    if (!firstReady) return;
    const i = clamp(Math.round(idx), 1, TOTAL);
    const img = images[i - 1];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // object-fit: cover
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function getProgress() {
    const rect = hero.getBoundingClientRect();
    const total = hero.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  }

  function updateUI(progress) {
    stageRanges.forEach((r, i) => {
      const el = stages[i];
      if (!el) return;
      el.classList.toggle('active', progress >= r.from && progress < r.to);
      el.classList.toggle('done', progress >= r.to);
    });
    if (progressBar) progressBar.style.width = (progress * 100).toFixed(2) + '%';
    if (captionName) {
      let label = phases[0].name;
      for (const p of phases) if (progress >= p.from) label = p.name;
      if (captionName.textContent !== label) captionName.textContent = label;
    }
  }

  // ---------- LERP loop: cílový vs. aktuální index ----------
  let targetIdx  = 1;
  let currentIdx = 1;
  let rendered   = -1;
  let running    = false;

  function loop() {
    const diff = targetIdx - currentIdx;
    if (Math.abs(diff) > 0.005) {
      currentIdx += diff * LERP;
    } else {
      currentIdx = targetIdx;
    }
    const i = Math.round(currentIdx);
    if (i !== rendered) {
      drawAt(i);
      rendered = i;
    }
    if (Math.abs(targetIdx - currentIdx) > 0.005) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  function onScroll() {
    const progress = getProgress();
    updateUI(progress);
    targetIdx = 1 + progress * (TOTAL - 1);
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  // scroll handler omezený na 1× za snímek (rAF throttle)
  preload();
  let scrollQueued = false;
  function onScrollThrottled() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  }
  window.addEventListener('scroll', onScrollThrottled, { passive: true });
  window.addEventListener('resize', () => { sizeCanvas(); drawAt(currentIdx); onScroll(); });
  new ResizeObserver(() => { sizeCanvas(); drawAt(currentIdx); }).observe(canvas);

  // První render
  onScroll();
})();

// Reveal-on-scroll for sections (placeholder for future parallax layers)
const revealEls = document.querySelectorAll(
  '.section-head, .service, .feature, .gallery-item, .review, .hero-card, .form'
);
revealEls.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => io.observe(el));

// Smooth offset scroll for sticky header
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (ev) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    ev.preventDefault();
    const offset = 72;
    const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

/* ---------- Mobile burger menu ---------- */
(function () {
  const burger = document.getElementById('navBurger');
  const links  = document.getElementById('navLinks');
  if (!burger || !links) return;

  const close = () => {
    burger.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    document.body.classList.remove('nav-open');
  };
  const open = () => {
    burger.setAttribute('aria-expanded', 'true');
    links.classList.add('open');
    document.body.classList.add('nav-open');
  };

  burger.addEventListener('click', () => {
    burger.getAttribute('aria-expanded') === 'true' ? close() : open();
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();

/* ---------- Galerie: lightbox ---------- */
(function () {
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  if (!items.length) return;

  const slides = items.map(it => {
    const img = it.querySelector('img');
    const cap = it.querySelector('figcaption');
    return { src: img.src, alt: img.alt, cap: cap ? cap.textContent.trim() : '' };
  });
  let idx = 0;

  const ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    prev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    next:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
  };

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<button class="lb-btn lb-close" aria-label="Zavřít">' + ICON.close + '</button>' +
    '<button class="lb-btn lb-prev" aria-label="Předchozí">' + ICON.prev + '</button>' +
    '<button class="lb-btn lb-next" aria-label="Další">' + ICON.next + '</button>' +
    '<img alt="">' +
    '<div class="lb-cap"></div>';
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('.lb-cap');

  function show(i) {
    idx = (i + slides.length) % slides.length;
    lbImg.src = slides[idx].src;
    lbImg.alt = slides[idx].alt;
    lbCap.textContent = slides[idx].cap;
  }
  function open(i) {
    show(i);
    lb.classList.add('open');
    document.body.classList.add('lightbox-open');
  }
  function close() {
    lb.classList.remove('open');
    document.body.classList.remove('lightbox-open');
  }

  items.forEach((it, i) => {
    it.setAttribute('role', 'button');
    it.setAttribute('tabindex', '0');
    it.addEventListener('click', () => open(i));
    it.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

/* ---------- Multi-step poptávkový form (Web3Forms) ---------- */
(function () {
  const form = document.getElementById('poptavka');
  if (!form) return;

  const panes  = Array.from(form.querySelectorAll('.wizard-pane[data-pane]'));
  const steps  = Array.from(form.querySelectorAll('.wizard-step'));
  const bar    = form.querySelector('#wizardBar');
  const nextBtns = form.querySelectorAll('.wizard-next');
  const prevBtns = form.querySelectorAll('.wizard-prev');
  const retryBtn = form.querySelector('.wizard-retry');

  let current = 1;
  const total = 3;

  function show(stepKey) {
    panes.forEach(p => p.classList.toggle('active', p.dataset.pane === String(stepKey)));
    if (typeof stepKey === 'number') {
      steps.forEach(s => {
        const n = Number(s.dataset.step);
        s.classList.toggle('active', n === stepKey);
        s.classList.toggle('done', n < stepKey);
      });
      if (bar) bar.style.width = ((stepKey - 1) / (total - 1) * 100) + '%';
      current = stepKey;
      const firstInput = form.querySelector(`.wizard-pane[data-pane="${stepKey}"] input, .wizard-pane[data-pane="${stepKey}"] textarea, .wizard-pane[data-pane="${stepKey}"] select`);
      if (firstInput) setTimeout(() => firstInput.focus({ preventScroll: true }), 60);
    }
  }

  function validateStep(step) {
    const pane = form.querySelector(`.wizard-pane[data-pane="${step}"]`);
    if (!pane) return true;
    const required = pane.querySelectorAll('[required]');
    let valid = true;
    required.forEach(el => {
      if (el.type === 'radio') {
        const name = el.name;
        const any = form.querySelector(`input[name="${name}"]:checked`);
        if (!any) valid = false;
      } else if (!el.checkValidity()) {
        valid = false;
        el.classList.add('invalid');
        el.addEventListener('input', () => el.classList.remove('invalid'), { once: true });
      }
    });
    if (!valid) {
      const firstBad = pane.querySelector('.invalid') || pane.querySelector('[required]');
      if (firstBad) firstBad.focus({ preventScroll: false });
    }
    return valid;
  }

  nextBtns.forEach(b => b.addEventListener('click', () => {
    if (!validateStep(current)) return;
    if (current < total) show(current + 1);
  }));
  prevBtns.forEach(b => b.addEventListener('click', () => {
    if (current > 1) show(current - 1);
  }));

  // Auto-advance po výběru služby
  form.querySelectorAll('input[name="sluzba"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) setTimeout(() => show(2), 220);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Odesílám…'; }

    const data = new FormData(form);
    const accessKey = data.get('access_key');

    // Fallback: pokud Web3Forms access key není nastaven, otevři mailto
    if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      const subject = `Poptávka ze StavHor.cz — ${data.get('sluzba') || 'služba'}`;
      const body =
`Jméno: ${data.get('jmeno') || ''}
Telefon: ${data.get('telefon') || ''}
E-mail: ${data.get('email') || ''}
Služba: ${data.get('sluzba') || ''}
Lokalita: ${data.get('lokalita') || ''}
Termín: ${data.get('termin') || ''}

Popis:
${data.get('zprava') || ''}`;
      window.location.href = `mailto:stavhor@stavhor.cz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      show('done');
      return;
    }

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      });
      const json = await res.json();
      if (res.ok && json.success) {
        show('done');
      } else {
        show('error');
      }
    } catch (err) {
      show('error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Odeslat poptávku'; }
    }
  });

  if (retryBtn) retryBtn.addEventListener('click', () => show(1));
})();
