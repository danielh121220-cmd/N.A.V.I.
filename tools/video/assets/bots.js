(function () {
  const CHARACTERS = {
    pebble: {
      name: 'Pebble',
      color: '#727781',
      body: '<path d="M50 14C68 14 84 46 84 68C84 84 70 94 50 94C30 94 16 84 16 68C16 46 32 14 50 14Z"/>',
      eyes: [[40.5, 57], [57.5, 57]], w: 9, h: 22, tilt: 0, pivot: [49, 57]
    },
    triangle: {
      name: 'Delta',
      color: '#1382FD',
      body: '<path d="M50 16C54 16 58 20 62 26L86 70C90 77 85 86 77 86L23 86C15 86 10 77 14 70L38 26C42 20 46 16 50 16Z"/>',
      eyes: [[45, 64], [57, 64]], w: 8, h: 20, tilt: 0, pivot: [51, 64]
    },
    cloud: {
      name: 'Nimbo',
      color: '#FF5B00',
      body: '<path d="M36 30C42 22 56 22 62 28C70 24 80 30 82 40C90 46 90 62 82 70C78 78 66 82 58 78C50 84 38 82 32 76C24 72 22 60 26 50C22 40 28 32 36 30Z"/>',
      eyes: [[43.5, 47], [55.5, 47]], w: 7, h: 18, tilt: -20, pivot: [48, 50]
    },
    circle: {
      name: 'Kuro',
      color: '#111114',
      body: '<circle cx="50" cy="50" r="42"/>',
      eyes: [[38.5, 43], [50.5, 43]], w: 7, h: 18, tilt: -28, pivot: [42, 44]
    },
    capsule: {
      name: 'Bean',
      color: '#00C96F',
      body: '<rect x="12" y="24" width="76" height="52" rx="26"/>',
      eyes: [[43, 50], [57, 50]], w: 8, h: 20, tilt: 0, pivot: [50, 50]
    },
    clover: {
      name: 'Bloom',
      color: '#8B5732',
      body: '<rect x="18" y="28" width="64" height="44" rx="22" transform="rotate(25 50 50)"/><rect x="18" y="28" width="64" height="44" rx="22" transform="rotate(-65 50 50)"/>',
      eyes: [[43.5, 47], [55.5, 47]], w: 7, h: 18, tilt: -25, pivot: [48, 48]
    }
  };

  const KEYS = Object.keys(CHARACTERS);
  const EXTRA = {};
  const get = k => CHARACTERS[k] || EXTRA[k];
  const has = k => Boolean(get(k));

  function eye(cx, cy, w, h, side, iris) {
    const hw = w / 2;
    const hh = h / 2;
    const bw = w * 0.95;
    const by = -hh - 4.5;
    const dir = side === 'l' ? 1 : -1;
    const angry = `M${-bw * dir} ${by - 1.8}L${bw * 0.7 * dir} ${by + 2.2}`;
    const sad = `M${-bw * dir} ${by + 2}L${bw * 0.7 * dir} ${by - 1.6}`;
    return `
      <g class="bot-eye bot-eye-${side}" transform="translate(${cx} ${cy})">
        <g class="eye-inner">
          ${iris ? `<g class="eye-open"><rect x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="${hw}"/><ellipse cx="0" cy="${(hh * 0.18).toFixed(2)}" rx="${(hw * 0.68).toFixed(2)}" ry="${(hh * 0.62).toFixed(2)}" fill="${iris}"/><circle cx="${(hw * 0.3).toFixed(2)}" cy="${(-hh * 0.12).toFixed(2)}" r="${(hw * 0.26).toFixed(2)}" fill="#fff"/></g>` : `<rect class="eye-open" x="${-hw}" y="${-hh}" width="${w}" height="${h}" rx="${hw}"/>`}
          <path class="eye-happy" d="M${-hw - 1} ${hh * 0.25}Q0 ${-hh * 0.75} ${hw + 1} ${hh * 0.25}"/>
          <path class="eye-closed" d="M${-hw - 1} 0Q0 ${hh * 0.45} ${hw + 1} 0"/>
        </g>
        <path class="brow brow-angry" d="${angry}"/>
        <path class="brow brow-sad" d="${sad}"/>
      </g>`;
  }

  function build(key, extraClass) {
    const c = get(key) || CHARACTERS.triangle;
    const [[lx, ly], [rx, ry]] = c.eyes;
    const mx = (lx + rx) / 2;
    const my = Math.max(ly, ry) + c.h / 2 + 4.5;
    return `
      <svg class="bot ${extraClass || ''}" viewBox="0 0 100 100" data-bot="${key}" aria-hidden="true"${c.ink ? ` style="--bot-ink:${c.ink}"` : ''}>
        <g class="bot-wrap">
          ${c.back || ''}
          <g class="bot-body" fill="${c.color}">${c.body}</g>
          ${c.pattern || ''}
          <g class="bot-face" transform="rotate(${c.tilt} ${c.pivot[0]} ${c.pivot[1]})">
            <g class="bot-look">
              ${eye(lx, ly, c.w, c.h, 'l', c.iris)}
              ${eye(rx, ry, c.w, c.h, 'r', c.iris)}
              <ellipse class="blush" cx="${lx - c.w * 0.9}" cy="${ly + c.h * 0.55}" rx="${c.w * 0.55}" ry="${c.w * 0.32}"/>
              <ellipse class="blush" cx="${rx + c.w * 0.9}" cy="${ry + c.h * 0.55}" rx="${c.w * 0.55}" ry="${c.w * 0.32}"/>
              <path class="mouth mouth-smile" d="M${mx - 5} ${my}Q${mx} ${my + 4.5} ${mx + 5} ${my}"/>
              <path class="mouth mouth-frown" d="M${mx - 4.5} ${my + 2.5}Q${mx} ${my - 1.5} ${mx + 4.5} ${my + 2.5}"/>
              <ellipse class="mouth mouth-o" cx="${mx}" cy="${my + 1}" rx="2.6" ry="3.2"/>
              <path class="mouth mouth-flat" d="M${mx - 4} ${my + 1}L${mx + 4} ${my + 1}"/>
            </g>
          </g>
          ${c.front || ''}
        </g>
      </svg>`.replace(/\s{2,}/g, ' ');
  }

  const MOODS = ['neutral', 'happy', 'angry', 'sad', 'confused', 'surprised', 'shy', 'peek', 'sleepy', 'worried', 'thinking', 'wink'];

  const pointer = { x: innerWidth / 2, y: innerHeight / 2, t: 0 };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = new Set();
  let raf = 0;
  let sleepTimer = 0;

  addEventListener('pointermove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = performance.now();
    wake();
  }, { passive: true });

  function tick(now) {
    raf = 0;
    let busy = now - pointer.t < 3500;
    let nextIdle = Infinity;
    for (const b of live) {
      const r = b._frame(now);
      if (r.moving) busy = true;
      nextIdle = Math.min(nextIdle, r.idleUntil);
    }
    if (!live.size) return;
    if (busy) {
      raf = requestAnimationFrame(tick);
    } else {
      clearTimeout(sleepTimer);
      if (nextIdle !== Infinity) sleepTimer = setTimeout(wake, Math.min(10000, Math.max(16, nextIdle - performance.now())));
    }
  }
  function wake() {
    clearTimeout(sleepTimer);
    if (!raf && live.size) raf = requestAnimationFrame(tick);
  }

  function mount(host, opts = {}) {
    let key = has(opts.character) ? opts.character : 'triangle';
    let base = opts.mood || 'neutral';
    let current = base;
    let moodTimer = 0;
    let blinkTimer = 0;
    let gazeOverride = null;
    let gx = 0, gy = 0, tx = 0, ty = 0;
    let idleTarget = null, idleUntil = 0;
    let svg, look;
    let lastT = '';

    function render() {
      host.innerHTML = build(key, opts.className || '');
      svg = host.firstElementChild;
      look = svg.querySelector('.bot-look');
      lastT = '';
      apply(current);
    }

    function apply(m) {
      for (const x of MOODS) svg.classList.remove('mood-' + x);
      svg.classList.add('mood-' + m);
    }

    function setMood(m, ms, silent) {
      clearTimeout(moodTimer);
      const changed = m !== current;
      current = m;
      apply(m);
      if (!silent && changed && opts.voice !== false && window.NaviSFX) window.NaviSFX.bot(key, m);
      if (m === 'shy') gazeOverride = [-0.9, 0.3];
      else if (m === 'thinking') gazeOverride = [0.7, -0.8];
      else if (m === 'sad' || m === 'worried') gazeOverride = [0, 0.6];
      else gazeOverride = null;
      svg.classList.remove('anim-shake', 'anim-hop', 'anim-squish');
      void svg.getBoundingClientRect();
      if (!reduce) {
        if (m === 'angry') svg.classList.add('anim-shake');
        if (m === 'happy' || m === 'surprised' || m === 'wink') svg.classList.add('anim-hop');
      }
      if (ms) moodTimer = setTimeout(() => setMood(base, 0, true), ms);
      wake();
    }

    function blink() {
      if (!svg || current === 'shy' || current === 'sleepy' || current === 'happy') return;
      svg.classList.add('blink');
      setTimeout(() => svg && svg.classList.remove('blink'), 120);
    }

    function scheduleBlink() {
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(() => {
        blink();
        if (Math.random() < 0.18) setTimeout(blink, 220);
        scheduleBlink();
      }, 2200 + Math.random() * 3400);
    }

    const api = {
      get character() { return key; },
      setCharacter(k) {
        if (!has(k)) return;
        key = k;
        render();
        if (!reduce) {
          svg.classList.add('anim-squish');
        }
      },
      mood(m, ms) { setMood(m, ms); },
      setBase(m) {
        base = m;
        setMood(m);
      },
      look(x, y) {
        gazeOverride = x == null ? null : [x, y];
        wake();
      },
      poke() {
        current = '';
        setMood('wink', 900);
        if (navigator.vibrate) navigator.vibrate(8);
      },
      destroy() {
        clearTimeout(moodTimer);
        clearTimeout(blinkTimer);
        live.delete(api);
        host.innerHTML = '';
      },
      _frame(now) {
        if (!svg || !svg.isConnected) {
          live.delete(api);
          return { moving: false, idleUntil: Infinity };
        }
        if (gazeOverride) {
          tx = gazeOverride[0];
          ty = gazeOverride[1];
        } else if (opts.follow !== false && now - pointer.t < 3500) {
          const r = svg.getBoundingClientRect();
          const dx = pointer.x - (r.left + r.width / 2);
          const dy = pointer.y - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, d / 260);
          tx = (dx / d) * k;
          ty = (dy / d) * k;
        } else {
          if (!idleTarget || now > idleUntil) {
            idleTarget = Math.random() < 0.45 ? [0, 0] : [Math.random() * 1.6 - 0.8, Math.random() * 1.0 - 0.5];
            idleUntil = now + 1400 + Math.random() * 2600;
          }
          tx = idleTarget[0];
          ty = idleTarget[1];
        }
        const ease = reduce ? 1 : 0.16;
        gx += (tx - gx) * ease;
        gy += (ty - gy) * ease;
        const t = `translate(${(gx * 5).toFixed(1)} ${(gy * 3.6).toFixed(1)})`;
        if (t !== lastT) {
          lastT = t;
          look.setAttribute('transform', t);
        }
        const moving = Math.abs(tx - gx) > 0.004 || Math.abs(ty - gy) > 0.004;
        return { moving, idleUntil: gazeOverride || now - pointer.t < 3500 ? Infinity : idleUntil };
      }
    };

    render();
    if (opts.interactive !== false) {
      live.add(api);
      scheduleBlink();
      wake();
      if (opts.pokeable !== false) host.addEventListener('click', () => api.poke());
    }
    return api;
  }

  function svgMarkup(key, mood, cls) {
    return build(has(key) ? key : 'triangle', `mood-${mood || 'neutral'} ${cls || ''}`);
  }

  function define(key, def) {
    EXTRA[key] = def;
  }

  window.NaviBots = { CHARACTERS, KEYS, mount, svg: svgMarkup, define, has };
})();
