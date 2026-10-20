(() => {
  const el = document.getElementById('intro');
  if (!el) return;
  const root = document.documentElement;
  let seen = false;
  try {
    seen = sessionStorage.getItem('navi_intro') === '1';
    sessionStorage.setItem('navi_intro', '1');
  } catch (e) {}
  if (seen || /[?&]nointro/.test(location.search)) {
    el.remove();
    return;
  }
  root.classList.add('intro-on');
  const lift = [0, 9, 14, 14, 9, 0];
  const bots = el.querySelector('.in-bots');
  if (window.NaviBots && bots) {
    bots.innerHTML = NaviBots.KEYS.map((k, i) => `<span style="--i:${i};--y:${lift[i] || 0}px">${NaviBots.svg(k, i === 2 || i === 3 ? 'wink' : 'happy')}</span>`).join('');
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false;
  const finish = fast => {
    if (done) return;
    done = true;
    el.classList.add(fast ? 'skip' : 'out');
    root.classList.add('intro-reveal');
    setTimeout(() => {
      el.remove();
      root.classList.remove('intro-on', 'intro-reveal');
    }, fast ? 280 : 620);
  };
  el.addEventListener('pointerdown', () => finish(true));
  addEventListener('keydown', () => finish(true), { once: true });
  setTimeout(() => finish(false), reduce ? 650 : 1550);
})();
