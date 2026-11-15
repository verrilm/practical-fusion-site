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
  const stack = $('#stack'), contactFloor = $('#contactFloor'), contactBg = $('#contactBg'), contactCard = $('.contact-card'), contactEl = $('#contact');
  const layers = $$('.hero .layer').map(el => ({ el, d: +el.dataset.depth, lift: +el.dataset.lift, lift2: +(el.dataset.lift2 || el.dataset.lift), shift: +(el.dataset.shift || 0),
    cur: /rocks/.test(el.className) ? 2 : 1 }));   // rocks react more strongly to the cursor

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
  $$('[data-words]').forEach(el => splitWords(el));

  // land on the first section on every load / refresh
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const startHash = location.hash;
  if (startHash) history.replaceState(null, '', location.pathname + location.search);
  scrollTo(0, 0);

  /* ---------- reveals (verrilm.com style) ---------- */
  // text: wrap every word in a mask; words on the same line share a delay, lines follow 80ms apart
  function splitLines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(' ')); return; }
        const m = document.createElement('span'); m.className = 'lm';
        const x = document.createElement('span'); x.className = 'lw'; x.textContent = w;
        m.appendChild(x); f.appendChild(m);
      });
      n.parentNode.replaceChild(f, n);
    });
  }
  const setLineDelays = el => {
    let line = -1, last = null;
    $$('.lw', el).forEach(w => {
      const t = w.parentElement.getBoundingClientRect().top;
      if (last === null || Math.abs(t - last) > 4) { line++; last = t; }
      w.style.setProperty('--d', `${(line * 0.08).toFixed(2)}s`);
    });
  };
  const lineEls = $$('.lines'); lineEls.forEach(splitLines);
  const relayout = () => lineEls.forEach(setLineDelays);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(relayout); addEventListener('resize', relayout);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.lines, .fade').forEach(el => io.observe(el));
  // fully clipped blocks never report as visible, so watch their container
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { $$(':scope > .slide-in', e.target).forEach(x => x.classList.add('in')); io2.unobserve(e.target); }
  }), { threshold: .2 });
  [...new Set($$('.slide-in').map(el => el.parentElement))].forEach(p => io2.observe(p));

  /* ---------- pointer ---------- */
  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  /* ---------- phone tilt drives the same perspective as the cursor ---------- */
  let gyroOn = false, base = null;
  const onTilt = e => {
    if (e.beta == null || e.gamma == null) return;
    const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    let x = e.gamma, y = e.beta;                       // portrait: gamma = left/right, beta = front/back
    if (ang === 90) { x = e.beta; y = -e.gamma; } else if (ang === -90 || ang === 270) { x = -e.beta; y = e.gamma; }
    if (!base) base = { x, y };                        // whatever angle the phone is held at counts as centre
    base.y += (y - base.y) * 0.004;                    // slowly re-centre if they change how they hold it
    base.x += (x - base.x) * 0.004;
    tx = clamp((x - base.x) / 20, -1, 1); ty = clamp((y - base.y) / 20, -1, 1);
    gyroOn = true;
  };
  function enableTilt() {
    if (finePointer || reduce || gyroOn || !('DeviceOrientationEvent' in window)) return;
    const D = window.DeviceOrientationEvent;
    if (typeof D.requestPermission === 'function') {        // iOS asks once, after a tap
      D.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => {});
    } else addEventListener('deviceorientation', onTilt);
  }
  const needsAsk = !!(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function');
  if (!finePointer && !reduce) {
    if (!needsAsk) enableTilt();
    else {
      // iPhone: Safari only allows the permission request from a tap, so offer it right after the intro
      const ask = $('#tiltAsk'), store = (() => { try { return localStorage; } catch { return null; } })();
      const answered = store && store.getItem('pf-tilt');
      const hide = v => { ask.classList.remove('show'); if (v && store) try { store.setItem('pf-tilt', v); } catch {} };
      if (ask) {
        $('#tiltYes').addEventListener('click', () => { enableTilt(); hide('yes'); });
        $('#tiltNo').addEventListener('click', () => hide('no'));
        if (answered === 'yes') addEventListener('touchend', enableTilt, { once: true, passive: true });   // already allowed: re-grant silently on first tap
        else if (answered !== 'no') setTimeout(() => ask.classList.add('show'), 2600);
      }
    }
  }

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

  /* ---------- desktop story: scene 1 (zoom) → 2 (lift) → 3 (centre), 8s each ---------- */
  const storyCapable = () => !reduce;
  let story = false, scene = 0, sceneAt = 0;
  const SCENE_MS = 8000;
  const tw = v => ({ v, from: v, to: v, t0: null, dur: 1 });
  const ZOOM = tw(0), LIFT = tw(0), CENTRE = tw(0), HALO = tw(0), HALO_A = tw(1);
  const tweenV = (o, to, dur, instant) => { o.from = o.v; o.to = to; o.dur = dur; if (instant) { o.v = to; o.t0 = null; } else o.t0 = performance.now(); };
  const stepV = (o, now) => { if (o.t0 == null) return; const t = clamp((now - o.t0) / o.dur, 0, 1); o.v = lerp(o.from, o.to, easeInOutCubic(t)); if (t >= 1) o.t0 = null; };
  const beats = $$('.beat'), bars = $$('.story-bars b');
  const skipBtn = $('#storySkip');
  if (skipBtn) skipBtn.addEventListener('click', () => { if (story && scene > 0 && scene < 3) setScene(3); skipBtn.blur(); });
  function setScene(n, instant = false) {
    scene = n; sceneAt = performance.now();
    body.classList.toggle('in-story', n > 0);
    body.classList.toggle('can-skip', n === 1 || n === 2);
    beats.forEach((b, i) => b.classList.toggle('show', i === n - 1));
    if (n === 0 && HALO_A.v < 0.5) { HALO.v = 0; HALO.t0 = null; }   // circles were already faded: reset them unseen
    tweenV(ZOOM, n >= 1 ? 1 : 0, 2000, instant);
    tweenV(LIFT, n >= 2 ? 1 : 0, 2600, instant);
    tweenV(CENTRE, n >= 3 ? 1 : 0, 2400, instant);
    tweenV(HALO, n >= 2 ? 1 : 0, n >= 2 ? 2800 : 1200, instant);
    tweenV(HALO_A, n >= 3 ? 0 : 1, n >= 3 ? 1400 : 10, instant || n < 3);
    busyUntil = performance.now() + (instant ? 0 : 1600);
    if (n === 3) { if (instant) unlock(); else setTimeout(() => { if (scene === 3) unlock(); }, 1800); }
  }

  function tweenTo(target, instant) {
    mFrom = m; mTo = target;
    if (instant || reduce) { m = target; mStart = null; } else mStart = performance.now();
    busyUntil = performance.now() + (instant ? 0 : 1500);
  }
  function startMission(instant = false) {
    if (missionOn) return;
    missionOn = true; hoverTarget = 0;
    body.classList.add('on-mission');
    if (storyCapable()) { story = true; setScene(instant ? 3 : 1, instant); return; }
    tweenTo(1, instant);
    if (instant) unlock(); else setTimeout(() => { if (missionOn) unlock(); }, 1500);
  }
  function endMission() {
    if (!missionOn) return;
    missionOn = false;
    body.classList.remove('on-mission');
    body.classList.add('locked');
    if (story) { setScene(0); story = false; return; }
    tweenTo(0, false);
  }
  function unlock() { body.classList.remove('locked'); }

  // Landing: the first scroll down plays the mission transition instead of scrolling.
  // Mission (at the very top): scrolling up goes back to the landing.
  let lastAwayFromTop = 0;
  addEventListener('scroll', () => { if (scrollY > 2) lastAwayFromTop = performance.now(); }, { passive: true });
  const atTopSettled = () => scrollY <= 2 && performance.now() - lastAwayFromTop > 450;
  function gesture(dir, e) {
    if (body.classList.contains('menu-open')) return;
    const now = performance.now();
    if (!missionOn) {
      if (e && e.cancelable) e.preventDefault();
      if (dir > 0 && now > busyUntil) startMission();
    } else if (story && scene < 3 && dir > 0) {
      if (e && e.cancelable) e.preventDefault();
      if (now > busyUntil) setScene(scene + 1);
    } else if (dir < 0 && atTopSettled() && now > busyUntil) {
      if (e && e.cancelable) e.preventDefault();
      endMission();
    } else if (now < busyUntil && e && e.cancelable && scrollY <= 2) e.preventDefault();
  }
  addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 2) gesture(Math.sign(e.deltaY), e); }, { passive: false });

  /* ---------- smooth wheel scrolling (mouse + trackpad; touch stays native) ----------
     Runs after the scene gestures above: anything they consumed (defaultPrevented) is left alone. */
  if (!reduce) {
    let target = scrollY, cur = scrollY, running = false, last = 0;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    const px = e => e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    const innerScroller = t => {
      for (let el = t; el && el !== body && el !== document.documentElement; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return true;
      }
      return false;
    };
    function step(now) {
      const dt = last ? Math.min(now - last, 50) : 16; last = now;
      cur += (target - cur) * (1 - Math.pow(1 - 0.1, dt / 16.67));   // ~0.1 per frame at 60fps, same feel at 120Hz
      if (Math.abs(target - cur) < 0.4) cur = target;
      scrollTo(0, cur);
      lastAwayFromTop = performance.now();   // the top only counts as 'reached' once the glide has stopped
      if (cur !== target) requestAnimationFrame(step); else { running = false; last = 0; }
    }
    addEventListener('wheel', e => {
      if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (body.classList.contains('locked') || body.classList.contains('menu-open') || innerScroller(e.target)) return;
      e.preventDefault();
      if (!running) target = cur = scrollY;
      target = clamp(target + px(e), 0, maxY());
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    // anything else that moves the page (links, keys, scrollbar) takes over and the glide stops
    addEventListener('scroll', () => { if (running && Math.abs(scrollY - cur) > 3) { running = false; last = 0; target = cur = scrollY; } }, { passive: true });
    addEventListener('resize', () => { target = clamp(target, 0, maxY()); });
  }
  // Enter on the landing presses "Begin your Mission" (unless focus is on another control, which keeps its own Enter)
  addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.repeat || missionOn || body.classList.contains('menu-open')) return;
    const f = document.activeElement;
    if (f && f !== body && f !== beginBtn && f.matches('a, button, input, textarea, select, [contenteditable]')) return;
    e.preventDefault(); beginBtn.classList.add('pressed'); setTimeout(() => beginBtn.classList.remove('pressed'), 180);
    startMission();
  });
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

  /* ---------- header links ---------- */
  const nav = $('#nav');
  const setMenu = () => {};
  // touch screens have no hover: unfold the button once its card is well in view
  if (matchMedia('(hover: none)').matches) {
    const io3 = new IntersectionObserver(es => es.forEach(e => {
      const t = e.target; clearTimeout(t._iv);
      if (e.isIntersecting) t._iv = setTimeout(() => t.classList.add('inview'), 500);
      else t.classList.remove('inview');
    }), { rootMargin: '0px 0px -25% 0px', threshold: 0.6 });
    $$('.card, .story').forEach(c => { if (c.querySelector('.more')) io3.observe(c); });
  }
  // each "learn more" label unfolds to its own width
  const sizeMore = () => $$('.more-lbl').forEach(l => l.style.setProperty('--w', Math.ceil(l.firstElementChild.scrollWidth) + 'px'));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(sizeMore); addEventListener('resize', sizeMore);

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
    if (story || ZOOM.t0 != null || ZOOM.v > 0) {
      [ZOOM, LIFT, CENTRE, HALO, HALO_A].forEach(o => stepV(o, now));
      if (story && (scene === 1 || scene === 2) && now - sceneAt > SCENE_MS) setScene(scene + 1);
      bars.forEach((b, i) => { const f = scene > i + 1 ? 1 : scene === i + 1 ? clamp((now - sceneAt) / SCENE_MS, 0, 1) : 0; b.style.transform = `scaleX(${f.toFixed(4)})`; });
    }
    const storyOn = story || ZOOM.v > 0.0001 || LIFT.v > 0.0001;
    PF.m = storyOn ? LIFT.v : m;
    PF.halo = storyOn ? HALO.v : null; PF.haloA = storyOn ? HALO_A.v : null;
    if (goingHome && scrollY <= 2) { goingHome = false; endMission(); }

    // cursor smoothing (touch devices get a slow drift instead)
    if (!finePointer && !reduce && !gyroOn) { tx = Math.sin(now / 4200) * .35; ty = Math.cos(now / 5200) * .2; }
    const k = reduce ? 0 : 0.06;
    mx += ((reduce ? 0 : tx) - mx) * k; my += ((reduce ? 0 : ty) - my) * k;
    hz += (hoverTarget - hz) * 0.08;
    PF.mx = mx; PF.my = my;

    const stackTop = stack.getBoundingClientRect().top;
    const p1 = clamp(1 - stackTop / H, 0, 1);         // how far the stack has covered the hero
    PF.heroVisible = p1 < 0.999;

    if (PF.heroVisible) {
      const s = lerp(1.32, 1, ie) * (1 + 0.045 * hz) * (1 + 0.07 * ZOOM.v);
      world.style.transform = `rotateX(${(-my * 2.2).toFixed(3)}deg) rotateY(${(mx * 3).toFixed(3)}deg) scale(${s.toFixed(4)})`;
      for (const L of layers) {
        const lm = storyOn ? LIFT.v : m, lift = storyOn ? L.lift2 : L.lift;
        const x = -mx * L.d * 46 * L.cur + lm * L.shift * W, y = -my * L.d * 28 * L.cur + lm * lift * H;
        L.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        if (L.cur > 1) L.el.style.opacity = storyOn ? (1 - clamp(LIFT.v * 1.8, 0, 1)).toFixed(3) : '';
      }
      // sun: big, bottom-right of the landing composition → left side on the mission
      const narrow = W < 1100;
      const Fw = Math.max(W, H * FRAME_AR), Fh = Fw / FRAME_AR, fx = W < H ? 0.32 * W - 0.268 * Fw : (W - Fw) / 2, fy = H - Fh;
      const x0 = W < H ? 0.95 * W : fx + (narrow ? 0.875 : 0.905) * Fw, y0 = fy + (W < H || narrow ? 0.78 : 0.86) * Fh, r0 = W < H ? 0.26 * Fh : 0.46 * Fh;
      const x1 = narrow ? 0.5 * W : 0.27 * W, y1 = narrow ? (W < H ? 0.3 * H : 0.34 * H) : 0.5 * H, r1 = narrow ? 0.22 * Math.min(W, H) : 0.34 * H;
      if (storyOn) {
        // scene 2: left and a little higher than before; scene 3: the centre, between the two lines of text
        const x2 = narrow ? 0.5 * W : 0.27 * W, y2 = narrow ? 0.3 * H : 0.5 * H, x3 = 0.5 * W, y3 = 0.5 * H, r3 = narrow ? 0.2 * Math.min(W, H) : 0.17 * H;
        PF.sun.x = lerp(lerp(x0, x2, LIFT.v), x3, CENTRE.v) - mx * 0.15 * 46;
        PF.sun.y = lerp(lerp(y0, y2, LIFT.v), y3, CENTRE.v) - my * 0.15 * 28;
        PF.sun.r = lerp(lerp(r0, r1, LIFT.v), r3, CENTRE.v);
      } else {
        PF.sun.x = lerp(x0, x1, m) - mx * 0.15 * 46; PF.sun.y = lerp(y0, y1, m) - my * 0.15 * 28;
        PF.sun.r = lerp(r0, r1, m);
      }


    }

    // the stack is cropped into a smaller rounded window as the contact section is revealed
    const sb = stack.getBoundingClientRect().bottom;
    const p2 = clamp((H - sb) / (H * 0.6), 0, 1);

    // contact: background, card and landscape move at different speeds as it comes in
    if (contactEl) {
      const cr = contactEl.getBoundingClientRect();
      if (cr.top < H && cr.bottom > 0) {
        const d = Math.max(0, cr.top + contactEl.offsetHeight - H);   // distance left until it is fully shown
        contactBg.style.transform = `translate3d(0, ${(d * 0.25).toFixed(1)}px, 0)`;
        contactCard.style.transform = `translate3d(0, ${(d * 0.12).toFixed(1)}px, 0)`;
        contactFloor.style.transform = `translate3d(calc(-50% + ${(-mx * 18).toFixed(1)}px), ${(-d * 0.1).toFixed(1)}px, 0)`;
      }
    }

    requestAnimationFrame(frame);
  }

  const pinContact = () => { contactEl.style.top = `${Math.min(0, innerHeight - contactEl.offsetHeight)}px`; };
  addEventListener('resize', pinContact); addEventListener('load', pinContact); pinContact();

  // start the intro once the fonts are in, so the headline doesn't jump
  const go = () => { body.classList.add('intro-go'); PF.ready = true; };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
  setTimeout(go, 1500); // fallback
  requestAnimationFrame(frame);

  // someone arriving at a section link (e.g. /#contact) skips the intro gate
  // arriving from another page with a section link (e.g. about.html → index.html#services)
  if (startHash && startHash !== '#top' && $(startHash) && document.referrer && new URL(document.referrer).pathname !== location.pathname) { const t = $(startHash); startMission(true); requestAnimationFrame(() => t.scrollIntoView({ block: 'start' })); }

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
