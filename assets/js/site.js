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
  const PF = window.PF = { mx: 0, my: 0, sun: { x: 0, y: 0, r: 1 }, heroVisible: true, ready: false };

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
  let missionStart = null, m = 0, missionOn = false;

  const beginBtn = $('#beginBtn');
  beginBtn.addEventListener('pointerenter', () => hoverTarget = 1);
  beginBtn.addEventListener('pointerleave', () => hoverTarget = 0);
  beginBtn.addEventListener('focus', () => hoverTarget = 1);
  beginBtn.addEventListener('blur', () => hoverTarget = 0);
  beginBtn.addEventListener('click', () => startMission());

  function startMission(instant = false) {
    if (missionOn) return;
    missionOn = true; hoverTarget = 0;
    body.classList.add('on-mission');
    if (instant || reduce) { m = 1; missionStart = -1; unlock(); return; }
    missionStart = performance.now();
    setTimeout(unlock, 1500);
  }
  function unlock() { body.classList.remove('locked'); }

  // Before the mission starts, the first scroll gesture plays the transition instead of scrolling.
  const wantsScroll = e => {
    if (missionOn) return;
    if (e.type === 'keydown' && !['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key)) return;
    if (e.type === 'wheel' && e.deltaY <= 0) return;
    if (e.cancelable) e.preventDefault();
    startMission();
  };
  addEventListener('wheel', wantsScroll, { passive: false });
  addEventListener('keydown', wantsScroll);
  let touchY = null;
  addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', e => {
    if (missionOn || touchY == null) return;
    if (touchY - e.touches[0].clientY > 24) { if (e.cancelable) e.preventDefault(); startMission(); }
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
  $$('[data-home]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); setMenu(false);
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- story parallax targets ---------- */
  const stories = $$('[data-parallax]').map(el => ({ el, ly: $$('.ly', el).map(l => ({ l, s: +l.dataset.speed, ph: l.classList.contains('ph'), bg: l.classList.contains('ly-bg') })) }));

  /* ---------- the frame loop ---------- */
  function frame(now) {
    const W = innerWidth, H = innerHeight;

    // intro camera: starts zoomed in & tilted, settles
    if (!reduce && PF.ready) {
      if (introStart == null) introStart = now;
      introT = clamp((now - introStart) / 2000, 0, 1);
    }
    const ie = reduce ? 1 : easeOutQuart(introT);

    // mission tween
    if (missionStart != null && missionStart > 0) m = easeInOutCubic(clamp((now - missionStart) / 1700, 0, 1));

    // cursor smoothing (touch devices get a slow drift instead)
    if (!finePointer && !reduce) { tx = Math.sin(now / 4200) * .35; ty = Math.cos(now / 5200) * .2; }
    const k = reduce ? 0 : 0.06;
    mx += ((reduce ? 0 : tx) - mx) * k; my += ((reduce ? 0 : ty) - my) * k;
    hz += (hoverTarget - hz) * 0.08;
    PF.mx = mx; PF.my = my;

    const heroRect = hero.getBoundingClientRect();
    const stackTop = stack.getBoundingClientRect().top;
    const p1 = clamp(1 - stackTop / H, 0, 1);         // how far the stack has covered the hero
    PF.heroVisible = p1 < 0.999;

    if (PF.heroVisible) {
      const s = lerp(1.55, 1, ie) * (1 + 0.04 * hz);
      const rz = lerp(-7, 0, ie), rx = lerp(14, 0, ie), tyPct = lerp(-14, 0, ie);
      world.style.transform =
        `translate3d(0, ${tyPct}%, 0) rotateZ(${rz}deg) rotateX(${rx - my * 2.4}deg) rotateY(${mx * 3.4}deg) scale(${s})`;
      for (const L of layers) {
        const x = -mx * L.d * 46 + m * L.shift * W, y = -my * L.d * 28 + m * L.lift * H * 0.32;
        L.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      // sun position in frame pixels (the canvas fills the 16:10 frame)
      const Fw = Math.max(W, H * 1.6), Fh = Fw * 0.625, ox = (Fw - W) / 2, oy = (Fh - H) / 2;
      const narrow = W < 1100;
      const sx = lerp(0.70, narrow ? 0.5 : 0.27, m) * W, sy = lerp(0.74, narrow ? 0.28 : 0.47, m) * H;
      PF.sun.x = ox + sx - mx * 0.15 * 46; PF.sun.y = oy + sy - my * 0.15 * 28;
      PF.sun.r = Math.min(W, H * 1.6) * lerp(0.115, narrow ? 0.16 : 0.17, m);

      // the hero becomes a rounded card as the stack slides over it
      hero.style.transform = `scale(${1 - 0.08 * p1})`;
      hero.style.borderRadius = `${28 * p1}px`;
      shade.style.opacity = (0.6 * p1).toFixed(3);
    }

    // the stack becomes a rounded card as the contact section is revealed
    const sb = stack.getBoundingClientRect().bottom;
    const p2 = clamp((H - sb) / (H * 0.7), 0, 1);
    stack.style.transform = p2 > 0 ? `scale(${1 - 0.06 * p2})` : '';
    stack.style.borderRadius = `28px 28px ${(32 * p2).toFixed(1)}px ${(32 * p2).toFixed(1)}px`;
    if (contactFloor) {
      const cr = contactFloor.parentElement.getBoundingClientRect();
      if (cr.top < H && cr.bottom > 0) contactFloor.style.transform = `translate3d(calc(-50% + ${(-mx * 20).toFixed(1)}px), ${((cr.bottom - H) * 0.12).toFixed(1)}px, 0)`;
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
