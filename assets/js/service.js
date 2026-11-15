/* ============================================================
   Practical Fusion — service pages
   hero zoom-in (as the wipe leaves) · layered landscape parallax (cursor + scroll) ·
   auto-playing list with dotted loading bars + synced use cases ·
   process rows that open as you scroll · contact reveal · smooth wheel scrolling
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  const smooth = t => t * t * (3 - 2 * t);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const body = document.body;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const startHash = location.hash;
  scrollTo(0, 0);

  /* ---------- text reveals (same as the home page) ---------- */
  $$('[data-words]').forEach(el => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = p; f.appendChild(s);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
  });
  const lineEls = $$('.lines');
  lineEls.forEach(el => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(' ')); return; }
        const m = document.createElement('span'); m.className = 'lm';
        const x = document.createElement('span'); x.className = 'lw'; x.textContent = t;
        m.appendChild(x); f.appendChild(m);
      });
      n.parentNode.replaceChild(f, n);
    });
  });
  const setLineDelays = () => lineEls.forEach(el => {
    let line = -1, last = null;
    $$('.lw', el).forEach(w => {
      const t = w.parentElement.getBoundingClientRect().top;
      if (last === null || Math.abs(t - last) > 4) { line++; last = t; }
      w.style.setProperty('--d', `${(line * 0.08).toFixed(2)}s`);
    });
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(setLineDelays); addEventListener('resize', setLineDelays);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.lines, .fade').forEach(el => io.observe(el));
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { $$(':scope > .slide-in', e.target).forEach(x => x.classList.add('in')); io2.unobserve(e.target); }
  }), { threshold: .2 });
  [...new Set($$('.slide-in').map(el => el.parentElement))].forEach(p => io2.observe(p));

  /* ---------- pointer (touch screens get a slow drift instead) ---------- */
  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  /* ---------- intro: starts as the wipe leaves (or right away when the page is opened directly) ---------- */
  let introStart = null;
  const go = () => { if (body.classList.contains('intro-go')) return; body.classList.add('intro-go'); introStart = performance.now(); };
  if (window.PFWipe && PFWipe.arriving) { addEventListener('pf:reveal', go, { once: true }); setTimeout(go, 2500); }
  else (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));

  const hero = $('.svc-hero'), world = $('#world'), title = $('#svcTitle');
  const layers = $$('.svc-hero .layer').map(el => ({ el, d: +el.dataset.depth, s: +el.dataset.speed }));

  /* ---------- the list: open an item, fill its dotted bar, close, move on ---------- */
  const acc = $('#acc'), items = $$('.acc-item'), cases = $$('.case');
  const ITEM_MS = 7000, GAP_MS = 650;
  let active = -1, prog = 0, waitUntil = 0, accInView = false, accHover = false, stopped = false, started = false;
  const bar = i => items[i].querySelector('.acc-bar');
  const setBar = (i, p) => bar(i).style.setProperty('--p', `${(p * 100).toFixed(2)}%`);
  function resetBar(i) {
    const b = bar(i); b.classList.add('fade-out');
    setTimeout(() => { if (active !== i) { b.style.setProperty('--p', '0%'); b.classList.remove('fade-out'); } }, 420);
  }
  function openItem(i) {
    items.forEach((it, k) => {
      const on = k === i; it.classList.toggle('open', on);
      it.querySelector('.acc-head').setAttribute('aria-expanded', String(on));
      if (!on && k !== active) resetBar(k);
    });
    if (active >= 0 && active !== i) resetBar(active);
    active = i; prog = 0; setBar(i, 0); bar(i).classList.remove('fade-out');
    cases.forEach((c, k) => c.classList.toggle('on', k === i % cases.length));
  }
  function closeItem(i) { items[i].classList.remove('open'); items[i].querySelector('.acc-head').setAttribute('aria-expanded', 'false'); }
  items.forEach((it, k) => it.querySelector('.acc-head').addEventListener('click', () => {
    if (k === active && it.classList.contains('open')) { closeItem(k); resetBar(k); stopped = true; return; }   // they closed it: stop the autoplay
    stopped = false; waitUntil = 0; openItem(k);
  }));
  if (acc) {
    new IntersectionObserver(es => es.forEach(e => {
      accInView = e.isIntersecting;
      if (accInView && !started) { started = true; openItem(0); }
    }), { threshold: .35 }).observe(acc);
    acc.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') accHover = true; });
    acc.addEventListener('pointerleave', () => accHover = false);
  }
  function tickList(now, dt) {
    if (!started || stopped || reduce || active < 0) return;
    if (waitUntil) {                                      // the finished item is closing; open the next one after a beat
      if (now >= waitUntil) { waitUntil = 0; openItem((active + 1) % items.length); }
      return;
    }
    if (!accInView || accHover) return;                   // hold while it's off screen or being read
    prog = Math.min(1, prog + dt / ITEM_MS); setBar(active, prog);
    if (prog >= 1) { closeItem(active); waitUntil = now + GAP_MS; }
  }

  /* ---------- process rows: clipped to number + label, opened to the right as they come up ---------- */
  const rows = $$('.p-row').map(el => ({ el, frame: el.querySelector('.p-frame'), left: el.querySelector('.p-left'), p: 0, minW: 0, w: 0 }));
  const measureRows = () => rows.forEach(r => {
    const pad = parseFloat(getComputedStyle(r.frame).paddingLeft);
    r.w = r.frame.offsetWidth;
    const label = r.left.lastElementChild;               // the frame starts just wide enough for the number + label
    r.minW = Math.min(r.w, label.offsetLeft + label.scrollWidth - r.frame.offsetLeft + pad * 1.4);
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(measureRows); addEventListener('resize', measureRows); measureRows();

  /* ---------- contact: pinned beneath the stack, layers drift as it comes in ---------- */
  const contactEl = $('#contact'), contactBg = $('#contactBg'), contactCard = $('.contact-card'), contactFloor = $('#contactFloor');
  const pinContact = () => { contactEl.style.top = `${Math.min(0, innerHeight - contactEl.offsetHeight)}px`; };
  addEventListener('resize', pinContact); addEventListener('load', pinContact); pinContact();

  /* ---------- frame loop ---------- */
  let lastT = 0;
  function frame(now) {
    const W = innerWidth, H = innerHeight, dt = lastT ? Math.min(now - lastT, 60) : 16; lastT = now;
    const y = Math.max(0, scrollY);

    if (!finePointer && !reduce) { tx = Math.sin(now / 4200) * .35; ty = Math.cos(now / 5200) * .2; }
    const k = reduce ? 0 : 1 - Math.pow(1 - 0.06, dt / 16.67);
    mx += ((reduce ? 0 : tx) - mx) * k; my += ((reduce ? 0 : ty) - my) * k;

    // hero: zoom in from wide (same camera move as the home page), then layers part as you scroll
    if (y < hero.offsetHeight + 50) {
      const it = reduce || introStart == null ? (reduce ? 1 : 0) : clamp((now - introStart) / 2200, 0, 1);
      const sp = clamp(y / hero.offsetHeight, 0, 1);
      const s = lerp(1.32, 1, easeOutQuart(it)) * (1 + (reduce ? 0 : 0.05 * sp));
      world.style.transform = `rotateX(${(-my * 2.2).toFixed(3)}deg) rotateY(${(mx * 3).toFixed(3)}deg) scale(${s.toFixed(4)})`;
      for (const L of layers) {
        const lx = -mx * L.d * 46, ly = -my * L.d * 28 + (reduce ? 0 : y * L.s);
        L.el.style.transform = `translate3d(${lx.toFixed(2)}px, ${ly.toFixed(2)}px, 0)`;
      }
      if (!reduce && finePointer) {                       // phones/tablets: the title block just scrolls with the page (no lag)
        title.style.transform = `translate3d(-50%, ${(y * 0.42).toFixed(1)}px, 0)`;
        title.style.opacity = (1 - clamp(y / (H * 0.55), 0, 1)).toFixed(3);
      }
    }

    tickList(now, dt);

    // process rows: each opens across the screen as it rises; rows still waiting their turn stay dim
    for (const r of rows) {
      const b = r.el.getBoundingClientRect();
      if (b.top > H + 40 && r.p === 0) continue;
      const raw = reduce ? 1 : clamp((H * 0.84 - b.top) / (H * 0.34), 0, 1);
      r.p += (raw - r.p) * (1 - Math.pow(1 - 0.16, dt / 16.67));
      if (Math.abs(raw - r.p) < 0.0005) r.p = raw;
      const e = smooth(r.p);
      r.frame.style.setProperty('--r', `${((1 - e) * Math.max(0, r.w - r.minW)).toFixed(1)}px`);
      r.el.style.setProperty('--o', lerp(0.3, 1, clamp(r.p / 0.2, 0, 1)).toFixed(3));
      r.el.style.setProperty('--d', clamp((e - 0.55) / 0.4, 0, 1).toFixed(3));
    }

    const cr = contactEl.getBoundingClientRect();
    if (cr.top < H && cr.bottom > 0) {
      const d = Math.max(0, cr.top + contactEl.offsetHeight - H);
      contactBg.style.transform = `translate3d(0, ${(d * 0.25).toFixed(1)}px, 0)`;
      contactCard.style.transform = `translate3d(0, ${(d * 0.12).toFixed(1)}px, 0)`;
      contactFloor.style.transform = `translate3d(calc(-50% + ${(-mx * 18).toFixed(1)}px), ${(-d * 0.1).toFixed(1)}px, 0)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- in-page links glide to their section ---------- */
  $$('[data-jump]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));
  if (startHash && $(startHash)) setTimeout(() => $(startHash).scrollIntoView({ block: 'start' }), 60);

  /* ---------- smooth wheel scrolling (mouse + trackpad; touch stays native) ---------- */
  if (!reduce) {
    let target = scrollY, cur = scrollY, running = false, last = 0;
    const maxY = () => document.documentElement.scrollHeight - innerHeight;
    const px = e => e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    const innerScroller = t => {
      for (let el = t; el && el !== body && el !== document.documentElement; el = el.parentElement)
        if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return true;
      return false;
    };
    const step = now => {
      const d = last ? Math.min(now - last, 50) : 16; last = now;
      cur += (target - cur) * (1 - Math.pow(1 - 0.1, d / 16.67));
      if (Math.abs(target - cur) < 0.4) cur = target;
      scrollTo(0, cur);
      if (cur !== target) requestAnimationFrame(step); else { running = false; last = 0; }
    };
    addEventListener('wheel', e => {
      if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (body.classList.contains('menu-open') || innerScroller(e.target)) return;
      e.preventDefault();
      if (!running) target = cur = scrollY;
      target = clamp(target + px(e), 0, maxY());
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    addEventListener('scroll', () => { if (running && Math.abs(scrollY - cur) > 3) { running = false; last = 0; target = cur = scrollY; } }, { passive: true });
  }

  /* ---------- contact form ---------- */
  const form = $('#form'), status = $('#status');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { status.textContent = 'Please fill in every field marked with *.'; form.reportValidity(); return; }
    if (typeof FORM_ENDPOINT === 'undefined' || !FORM_ENDPOINT) { status.textContent = 'The form isn’t connected yet. Add a form endpoint in assets/js/config.js.'; return; }
    status.textContent = 'Sending…';
    try {
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw 0;
      form.reset(); status.textContent = 'Message sent. We’ll be in touch soon.';
    } catch { status.textContent = 'Something went wrong. Please try again.'; }
  });
})();
