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
