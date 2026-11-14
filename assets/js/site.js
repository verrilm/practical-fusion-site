/* ============================================================
   Practical Fusion — interactions
   intro camera move · cursor perspective · mission transition ·
   stacked-card scroll · text reveals · layered story parallax
   ============================================================ */

// Paste a Formspree (or similar) endpoint here to receive contact form messages.
const FORM_ENDPOINT = "";

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  const body = document.body;
  const hero = $('.hero'), world = $('#world'), shade = $('#heroShade');
  const stack = $('#stack'), contactFloor = $('#contactFloor');
  const layers = $$('.hero .layer').map(el => ({ el, d: +el.dataset.depth, lift: +el.dataset.lift, shift: +(el.dataset.shift || 0) }));

  // shared with the three.js scenes (three-scenes.js)
  const PF = window.PF = { mx: 0, my: 0, m: 0, sun: { x: 0, y: 0, r: 1 }, heroVisible: true, ready: false };

  /* ---------- split text into words ---------- */
  function splitWords(el, startIndex = 0) {
    let i = startIndex;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  }
  $$('[data-words], .split').forEach(el => splitWords(el));

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  $$('.split, .fade').forEach(el => io.observe(el));

  /* ---------- pointer ---------- */
  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  /* ---------- intro + hover + mission state ---------- */
  let introStart = null, introT = reduce ? 1 : 0;
  let hoverTarget = 0, hz = 0;
  // m: 0 = landing, 1 = mission. Tweened either way so scrolling back up returns to the landing.
  let m = 0, mFrom = 0, mTo = 0, mStart = null, missionOn = false, busyUntil = 0;
  const MISSION_MS = 1700;

  const beginBtn = $('#beginBtn');
  beginBtn.addEventListener('pointerenter', () => hoverTarget = 1);
  beginBtn.addEventListener('pointerleave', () => hoverTarget = 0);
  beginBtn.addEventListener('focus', () => hoverTarget = 1);
  beginBtn.addEventListener('blur', () => hoverTarget = 0);
  beginBtn.addEventListener('click', () => startMission());

  function tweenTo(target, instant) {
    mFrom = m; mTo = target;
    if (instant || reduce) { m = target; mStart = null; } else mStart = performance.now();
    busyUntil = performance.now() + (instant ? 0 : 1500);
  }
  function startMission(instant = false) {
    if (missionOn) return;
    missionOn = true; hoverTarget = 0;
    body.classList.add('on-mission');
    tweenTo(1, instant);
    if (instant) unlock(); else setTimeout(() => { if (missionOn) unlock(); }, 1500);
  }
  function endMission() {
    if (!missionOn) return;
    missionOn = false;
    body.classList.remove('on-mission');
    body.classList.add('locked');
    tweenTo(0, false);
  }
  function unlock() { body.classList.remove('locked'); }

  // Landing: the first scroll down plays the mission transition instead of scrolling.
  // Mission (at the very top): scrolling up goes back to the landing.
  let lastAwayFromTop = 0;
  addEventListener('scroll', () => { if (scrollY > 2) lastAwayFromTop = performance.now(); }, { passive: true });
  const atTopSettled = () => scrollY <= 2 && performance.now() - lastAwayFromTop > 450;
  function gesture(dir, e) {
    const now = performance.now();
    if (!missionOn) {
      if (e && e.cancelable) e.preventDefault();
      if (dir > 0 && now > busyUntil) startMission();
    } else if (dir < 0 && atTopSettled() && now > busyUntil) {
      if (e && e.cancelable) e.preventDefault();
      endMission();
    } else if (now < busyUntil && e && e.cancelable && scrollY <= 2) e.preventDefault();
  }
  addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 2) gesture(Math.sign(e.deltaY), e); }, { passive: false });
  addEventListener('keydown', e => {
    if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key)) gesture(1, missionOn ? null : e);
    else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) gesture(-1, null);
  });
  let touchY = null;
  addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => {
    if (touchY == null) return;
    const d = touchY - e.touches[0].clientY;
    if (Math.abs(d) > 24) { gesture(Math.sign(d), e); touchY = null; }
  }, { passive: false });

  /* ---------- menu ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  const setMenu = open => { nav.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(!nav.classList.contains('menu-open')); });
  document.addEventListener('click', e => { if (!e.target.closest('.menu')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // in-page links: make sure the mission state is on, then glide to the section
  $$('[data-jump]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const target = $(id); if (!target) return;
    e.preventDefault(); setMenu(false);
    const go = () => target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!missionOn) { startMission(true); requestAnimationFrame(go); } else go();
  }));
  // Home: back to the top, then back to the landing scene
  let goingHome = false;
  $$('[data-home]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); setMenu(false);
    if (scrollY <= 2) { endMission(); return; }
    goingHome = true; scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- story parallax targets ---------- */
  const stories = $$('[data-parallax]').map(el => ({ el, ly: $$('.ly', el).map(l => ({ l, s: +l.dataset.speed, ph: l.classList.contains('ph'), bg: l.classList.contains('ly-bg') })) }));

  /* ---------- the frame loop ---------- */
  const FRAME_AR = 2847 / 1618;
  function frame(now) {
    const W = innerWidth, H = innerHeight;

    // intro camera: a straight zoom out, no tilt
    if (!reduce && PF.ready) {
      if (introStart == null) introStart = now;
      introT = clamp((now - introStart) / 2200, 0, 1);
    }
    const ie = reduce ? 1 : easeOutQuart(introT);

    if (mStart != null) {
      const t = clamp((now - mStart) / MISSION_MS, 0, 1);
      m = lerp(mFrom, mTo, easeInOutCubic(t));
      if (t >= 1) mStart = null;
    }
    PF.m = m;
    if (goingHome && scrollY <= 2) { goingHome = false; endMission(); }

    // cursor smoothing (touch devices get a slow drift instead)
    if (!finePointer && !reduce) { tx = Math.sin(now / 4200) * .35; ty = Math.cos(now / 5200) * .2; }
    const k = reduce ? 0 : 0.06;
    mx += ((reduce ? 0 : tx) - mx) * k; my += ((reduce ? 0 : ty) - my) * k;
    hz += (hoverTarget - hz) * 0.08;
    PF.mx = mx; PF.my = my;

    const stackTop = stack.getBoundingClientRect().top;
    const p1 = clamp(1 - stackTop / H, 0, 1);         // how far the stack has covered the hero
    PF.heroVisible = p1 < 0.999;

    if (PF.heroVisible) {
      const s = lerp(1.32, 1, ie) * (1 + 0.045 * hz);
      world.style.transform = `rotateX(${(-my * 2.2).toFixed(3)}deg) rotateY(${(mx * 3).toFixed(3)}deg) scale(${s.toFixed(4)})`;
      for (const L of layers) {
        const x = -mx * L.d * 46 + m * L.shift * W, y = -my * L.d * 28 + m * L.lift * H;
        L.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      // sun: big, bottom-right of the landing composition → left side on the mission
      const Fw = Math.max(W, H * FRAME_AR), Fh = Fw / FRAME_AR, fx = (W - Fw) / 2, fy = H - Fh;
      const narrow = W < 1100;
      const x0 = fx + 0.875 * Fw, y0 = fy + 0.78 * Fh, r0 = 0.46 * Fh;
      const x1 = narrow ? 0.5 * W : 0.27 * W, y1 = narrow ? 0.34 * H : 0.5 * H, r1 = narrow ? 0.22 * Math.min(W, H) : 0.34 * H;
      PF.sun.x = lerp(x0, x1, m) - mx * 0.15 * 46; PF.sun.y = lerp(y0, y1, m) - my * 0.15 * 28;
      PF.sun.r = lerp(r0, r1, m);

      // the scene keeps its size; only its corners round off as the stack slides over it
      hero.style.clipPath = p1 > 0 ? `inset(0 round ${(28 * Math.min(1, p1 * 2.5)).toFixed(1)}px)` : '';
    }

    // the stack is cropped into a smaller rounded window as the contact section is revealed
    const sb = stack.getBoundingClientRect().bottom;
    const p2 = clamp((H - sb) / (H * 0.6), 0, 1);
    if (p2 > 0) {
      const sx = (W * 0.03 * p2).toFixed(1), sy = (H * 0.04 * p2).toFixed(1);
      stack.style.clipPath = `inset(0 ${sx}px ${sy}px ${sx}px round 28px 28px ${(28 * p2 + 1).toFixed(1)}px ${(28 * p2 + 1).toFixed(1)}px)`;
    } else stack.style.clipPath = '';
    if (contactFloor) {
      const cr = contactFloor.parentElement.getBoundingClientRect();
      if (cr.top < H && cr.bottom > 0) contactFloor.style.transform = `translate3d(calc(-50% + ${(-mx * 18).toFixed(1)}px), 0, 0)`;
    }

    // success stories: background, piece and logo move at different speeds
    if (!reduce) for (const st of stories) {
      const r = st.el.getBoundingClientRect(); if (r.bottom < -100 || r.top > H + 100) continue;
      const c = (r.top + r.height / 2 - H / 2) / H;
      for (const L of st.ly) {
        const y = c * L.s * r.height * 1.6, x = -mx * L.s * 30;
        L.l.style.transform = L.ph ? `translate(${x}px, calc(-50% + ${y}px))` : `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${L.bg ? ' scale(1.04)' : ''}`;
      }
    }
    nav.classList.toggle('solid', scrollY > 40);
    requestAnimationFrame(frame);
  }

  // start the intro once the fonts are in, so the headline doesn't jump
  const go = () => { body.classList.add('intro-go'); PF.ready = true; };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
  setTimeout(go, 1500); // fallback
  requestAnimationFrame(frame);

  // someone arriving at a section link (e.g. /#contact) skips the intro gate
  if (location.hash && location.hash !== '#top' && $(location.hash)) { startMission(true); }

  /* ---------- contact form ---------- */
  const form = $('#form'), status = $('#status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { status.textContent = 'Please fill in every field marked with *.'; form.reportValidity(); return; }
    if (!FORM_ENDPOINT) { status.textContent = 'The form isn’t connected yet. Add a form endpoint in assets/js/site.js.'; return; }
    status.textContent = 'Sending…';
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw 0;
      form.reset(); status.textContent = 'Message sent. We’ll be in touch soon.';
    } catch { status.textContent = 'Something went wrong. Please try again.'; }
  });
})();
