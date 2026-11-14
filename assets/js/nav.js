// Header dropdowns: open on hover, stay open briefly after the cursor leaves so crossing the gap never closes them
(() => {
  const items = [...document.querySelectorAll('.nav-item')]; let closeT = null;
  const closeAll = except => items.forEach(x => { if (x !== except) x.classList.remove('open'); });
  items.forEach(it => {
    it.addEventListener('mouseenter', () => { clearTimeout(closeT); closeAll(it); it.classList.remove('shut'); it.classList.add('open'); });
    it.addEventListener('mouseleave', () => { clearTimeout(closeT); closeT = setTimeout(() => it.classList.remove('open', 'shut'), 350); });
    it.querySelector('.nav-top').addEventListener('click', () => { clearTimeout(closeT); const o = !it.classList.contains('open'); closeAll(); it.classList.toggle('open', o); });
    it.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { it.classList.remove('open'); it.classList.add('shut'); document.activeElement && document.activeElement.blur(); }));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-item')) closeAll(); });
})();

// Phones: a MENU button opens a full-screen menu built from the header links.
// Services / Work / About expand in place, with their links indented behind a vertical line.
(() => {
  const nav = document.getElementById('nav'), right = nav && nav.querySelector('.nav-right'); if (!right) return;
  const chev = '<svg class="m-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 4.5l3 3 3-3"/></svg>';
  const btn = document.createElement('button');
  btn.className = 'm-btn'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'mMenu');
  btn.innerHTML = '<span class="m-lbl"><span>Menu</span><span>Close</span></span><span class="m-ic" aria-hidden="true"><i></i><i></i></span>';
  nav.appendChild(btn);

  const menu = document.createElement('div');
  menu.className = 'm-menu'; menu.id = 'mMenu'; menu.setAttribute('aria-hidden', 'true');
  const list = document.createElement('nav'); list.className = 'm-list'; list.setAttribute('aria-label', 'Menu');
  // every link in the menu forwards to the original header link, so the page's own handlers still run
  const proxy = (orig, cls, html) => {
    const a = document.createElement('a'); a.className = cls; a.href = orig.getAttribute('href'); a.innerHTML = html;
    a.addEventListener('click', e => { e.preventDefault(); close(); setTimeout(() => orig.click(), 60); });
    return a;
  };
  [...right.children].forEach(el => {
    if (el.matches('a.nav-top')) list.appendChild(proxy(el, 'm-row', `<span>${el.textContent.trim()}</span>`));
    else if (el.matches('.nav-item')) {
      const g = document.createElement('div'); g.className = 'm-group';
      const head = document.createElement('button'); head.type = 'button'; head.className = 'm-row';
      head.innerHTML = `<span>${el.querySelector('.nav-top').textContent.trim()}</span>${chev}`;
      head.setAttribute('aria-expanded', 'false');
      const sub = document.createElement('div'); sub.className = 'm-sub';
      const inner = document.createElement('div'); inner.className = 'm-sub-in';
      el.querySelectorAll('.dd-item').forEach(it => inner.appendChild(proxy(it, 'm-link', it.querySelector('b').textContent.trim())));
      const all = el.querySelector('.dd-all'); if (all) inner.appendChild(proxy(all, 'm-link m-all', all.textContent.trim()));
      sub.appendChild(inner); g.append(head, sub); list.appendChild(g);
      head.addEventListener('click', () => {
        const open = !g.classList.contains('open');
        list.querySelectorAll('.m-group.open').forEach(x => { x.classList.remove('open'); x.firstChild.setAttribute('aria-expanded', 'false'); });
        g.classList.toggle('open', open); head.setAttribute('aria-expanded', String(open));
      });
    }
  });
  const foot = document.createElement('div'); foot.className = 'm-foot';
  const cta = right.querySelector('.nav-cta');
  if (cta) foot.appendChild(proxy(cta, 'm-cta', 'Contact Us<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 8h11M9 4l4 4-4 4"/></svg>'));
  foot.insertAdjacentHTML('beforeend', '<p class="m-small">Consultancy &amp; venture studio<br><b>West Palm Beach, Florida</b></p>');
  menu.append(list, foot);
  nav.after(menu);

  function open() { document.body.classList.add('menu-open'); btn.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); }
  function close() { document.body.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); }
  btn.addEventListener('click', () => document.body.classList.contains('menu-open') ? close() : open());
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (innerWidth > 640) close(); });
})();
