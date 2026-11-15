/* ============================================================
   Page wipe: links marked [data-wipe] sweep a bar in from the bottom-right corner
   until it covers the page, then load the new page. The new page starts covered,
   and the bar carries on out through the top-left corner to reveal it.
   A violet edge runs just ahead of the dark bar on the way in, and trails it on the way out.
   ============================================================ */
(() => {
  const KEY = 'pf-wipe';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ov = document.createElement('div');
  ov.className = 'wipe'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<i class="wipe-a"></i><i class="wipe-b"></i>';
  document.body.appendChild(ov);
  const [a, b] = ov.children;

  // x/W + y/H = c is a line parallel to the bottom-left → top-right diagonal; c runs from 2 (bottom-right corner) to 0 (top-left corner)
  const coverFrom = (el, c) => { const p = c * 100; el.style.clipPath = `polygon(${p}% 0, 200% 0, 200% 200%, 0 200%, 0 ${p}%)`; };   // the part of the screen past the line (bottom-right side)
  const keepBefore = (el, c) => { const p = c * 100; el.style.clipPath = `polygon(0 0, ${p}% 0, 0 ${p}%)`; };                         // the part before the line (top-left side)

  function run(dur, lag, draw, done) {
    const t0 = performance.now(), total = dur + lag;
    const step = now => {
      const t = now - t0;
      draw(ease(clamp(t / dur, 0, 1)), ease(clamp((t - lag) / dur, 0, 1)));
      if (t < total) requestAnimationFrame(step); else done && done();
    };
    requestAnimationFrame(step);
  }

  /* ---- leaving: cover, then go ---- */
  function leave(href) {
    if (reduce) { location.href = href; return; }
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    ov.classList.add('on');
    // violet edge first, dark bar right behind it
    run(720, 70, (ta, tb) => { coverFrom(a, 2 - 2 * ta); coverFrom(b, 2 - 2 * tb); }, () => { location.href = href; });
  }
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-wipe]');
    if (!link || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname) return;   // same page: let it scroll normally
    e.preventDefault();
    leave(url.href);
  });

  /* ---- Home / logo on a service page: keep a copy of exactly what's on screen, then load home under it ---- */
  const SLIDE = 'pf-slide';
  const strip = el => {                                   // a lifeless copy: no ids (home has its own), no links or buttons
    el.querySelectorAll('[id]').forEach(x => x.removeAttribute('id')); el.removeAttribute('id');
    el.querySelectorAll('a,button').forEach(x => { const s = document.createElement('span'); s.className = x.className; s.innerHTML = x.innerHTML; x.replaceWith(s); });
    el.querySelectorAll('input,select,textarea').forEach(x => x.setAttribute('tabindex', '-1'));
    return el;
  };
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-home-slide]');
    if (!link || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce) return;
    e.preventDefault();
    document.body.classList.remove('menu-open');
    const page = [...document.body.children]
      .filter(el => !el.matches('script, .nav, .m-menu, .wipe, .tilt-ask'))
      .map(el => strip(el.cloneNode(true)).outerHTML).join('');
    const nav = document.getElementById('nav');
    const data = { y: scrollY, page, nav: nav ? strip(nav.cloneNode(true)).outerHTML : '' };
    try { sessionStorage.setItem(SLIDE, JSON.stringify(data)); } catch {}
    location.href = link.href;
  });

  /* ---- arriving on home from a service page: that page covers the screen as it was left, then lifts away ---- */
  const lifting = root.classList.contains('scene-lift');
  if (lifting) {
    let data = null; try { data = JSON.parse(sessionStorage.getItem(SLIDE)); sessionStorage.removeItem(SLIDE); } catch {}
    const cur = document.createElement('div');
    cur.className = 'scene-curtain intro-go'; cur.setAttribute('aria-hidden', 'true'); cur.inert = true;
    // the copy scrolls inside its own box, so sticky parts (the use-case panel, the contact) sit where they were
    cur.innerHTML = `<div class="sc-scroll"><div class="sc-page">${data ? data.page : ''}</div></div>${data ? data.nav : ''}`;
    document.body.appendChild(cur);
    const box = cur.firstElementChild, y = data ? data.y : 0;
    box.scrollTop = y;
    root.classList.remove('scene-lift');
    const imgs = [...cur.querySelectorAll('img')];
    const ready = Promise.race([
      Promise.all([document.fonts ? document.fonts.ready : null, ...imgs.map(i => i.decode().catch(() => {}))]),
      new Promise(r => setTimeout(r, 900))
    ]);
    ready.then(() => requestAnimationFrame(() => {
      box.scrollTop = y;                                  // again, now that images have their heights
      dispatchEvent(new Event('pf:reveal'));
      const t0 = performance.now(), dur = 1150;
      const step = now => {
        const t = clamp((now - t0) / dur, 0, 1);
        cur.style.transform = `translate3d(0, ${(-102 * ease(t)).toFixed(3)}%, 0)`;
        if (t < 1) requestAnimationFrame(step); else cur.remove();
      };
      requestAnimationFrame(step);
    }));
  }

  /* ---- arriving: start covered (the inline <head> script sets .wipe-in), then sweep out ---- */
  const arriving = root.classList.contains('wipe-in') || lifting;
  window.PFWipe = { arriving };
  if (arriving && !lifting) {
    try { sessionStorage.removeItem(KEY); } catch {}
    ov.classList.add('on'); coverFrom(a, 0); coverFrom(b, 0);
    root.classList.remove('wipe-in');
    const go = () => {
      if (go.done) return; go.done = true;
      dispatchEvent(new Event('pf:reveal'));
      // the dark bar leaves first and the violet edge trails it out through the top-left corner
      run(950, 80, (tb, ta) => { keepBefore(b, 2 - 2 * tb); keepBefore(a, 2 - 2 * ta); }, () => ov.classList.remove('on'));
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
    setTimeout(go, 1500);
  }

  // coming back with the browser's back button restores the old page as it was left: covered. Uncover it.
  addEventListener('pageshow', e => { if (e.persisted) { ov.classList.remove('on'); a.style.clipPath = b.style.clipPath = ''; } });
})();
