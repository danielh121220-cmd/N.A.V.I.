(function () {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };
  const state = { sounds: read('navi_sfx', true), voices: read('navi_voices', true) };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone({ f, f2, type = 'sine', t = 0, dur = 0.1, peak = 0.08, a = 0.004, vib = 0, vibRate = 7, filter = 0, dest }) {
    const c = ac();
    if (!c) return;
    const now = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur * 0.9);
    let node = o;
    if (vib) {
      const l = c.createOscillator();
      const lg = c.createGain();
      l.frequency.value = vibRate;
      lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(now);
      l.stop(now + dur + 0.05);
    }
    if (filter) {
      const bq = c.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = filter;
      bq.Q.value = 6;
      node.connect(bq);
      node = bq;
    }
    node.connect(g).connect(dest || master);
    env(g, now, peak, a, dur);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  function noise({ t = 0, dur = 0.02, peak = 0.05, freq = 4000, q = 1.2, type = 'bandpass', sweep }) {
    const c = ac();
    if (!c) return;
    const now = c.currentTime + t;
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const bq = c.createBiquadFilter();
    bq.type = type;
    bq.frequency.setValueAtTime(freq, now);
    if (sweep) bq.frequency.exponentialRampToValueAtTime(sweep, now + dur);
    bq.Q.value = q;
    const g = c.createGain();
    s.connect(bq).connect(g).connect(master);
    env(g, now, peak, 0.002, dur);
    s.start(now, Math.random() * 0.3);
    s.stop(now + dur + 0.02);
  }

  function chime(notes, { gap = 0.09, peak = 0.07, dur = 0.7 } = {}) {
    notes.forEach((f, i) => {
      tone({ f, t: i * gap, dur, peak, a: 0.003 });
      tone({ f: f * 2, t: i * gap, dur: dur * 0.6, peak: peak * 0.28, a: 0.003 });
      tone({ f: f * 3.01, t: i * gap, dur: dur * 0.3, peak: peak * 0.1, a: 0.002 });
    });
  }

  const UI = {
    tap() { noise({ dur: 0.012, peak: 0.07, freq: 5200, q: 0.9 }); tone({ f: 2400, dur: 0.018, peak: 0.018 }); },
    soft() { noise({ dur: 0.01, peak: 0.04, freq: 3800, q: 1 }); },
    on() { tone({ f: 1700, dur: 0.035, peak: 0.05 }); tone({ f: 2500, t: 0.035, dur: 0.04, peak: 0.045 }); },
    off() { tone({ f: 2300, dur: 0.035, peak: 0.045 }); tone({ f: 1500, t: 0.035, dur: 0.045, peak: 0.04 }); },
    open() { tone({ f: 420, f2: 880, dur: 0.12, peak: 0.05, type: 'sine' }); noise({ dur: 0.12, peak: 0.02, freq: 1200, sweep: 5000, type: 'bandpass' }); },
    close() { tone({ f: 760, f2: 380, dur: 0.12, peak: 0.04 }); noise({ dur: 0.1, peak: 0.015, freq: 4000, sweep: 900, type: 'bandpass' }); },
    notify() { chime([1568, 2093], { gap: 0.07, peak: 0.05, dur: 0.5 }); },
    success() { chime([1046.5, 1318.5, 1568], { gap: 0.075, peak: 0.06, dur: 0.6 }); },
    error() { tone({ f: 300, f2: 250, type: 'triangle', dur: 0.12, peak: 0.12 }); tone({ f: 240, f2: 190, type: 'triangle', t: 0.13, dur: 0.18, peak: 0.12 }); },
    warn() { tone({ f: 880, dur: 0.1, peak: 0.06 }); tone({ f: 660, t: 0.1, dur: 0.16, peak: 0.06 }); },
    scan() { tone({ f: 1975, dur: 0.06, peak: 0.07 }); tone({ f: 2637, t: 0.06, dur: 0.12, peak: 0.06 }); },
    sos() { [0, 0.18, 0.36].forEach(t => tone({ f: 988, t, dur: 0.12, peak: 0.08, type: 'triangle' })); },
    whoosh() { noise({ dur: 0.22, peak: 0.03, freq: 600, sweep: 6000, q: 0.7 }); }
  };

  const PITCH = { pebble: 330, triangle: 523, cloud: 622, circle: 262, capsule: 698, clover: 440 };
  const TIMBRE = { pebble: 'sine', triangle: 'triangle', cloud: 'sine', circle: 'triangle', capsule: 'sine', clover: 'triangle' };

  function voice(character, mood) {
    const m = /^m(\d+)$/.exec(character || '');
    const n = m ? Number(m[1]) : -1;
    const p = m ? 280 + ((n * 47) % 520) : PITCH[character] || 523;
    const type = m ? (n % 3 === 0 ? 'triangle' : 'sine') : TIMBRE[character] || 'sine';
    const v = (o) => tone({ type, filter: 2400, ...o });
    switch (mood) {
      case 'happy':
        v({ f: p, dur: 0.09, peak: 0.07 });
        v({ f: p * 1.26, t: 0.08, dur: 0.09, peak: 0.07 });
        v({ f: p * 1.5, f2: p * 2, t: 0.16, dur: 0.16, peak: 0.07, vib: 12 });
        break;
      case 'wink':
        v({ f: p * 0.9, f2: p * 1.8, dur: 0.12, peak: 0.07 });
        v({ f: p * 1.8, f2: p * 1.2, t: 0.12, dur: 0.14, peak: 0.06 });
        break;
      case 'angry':
        tone({ f: p * 0.5, f2: p * 0.38, type: 'sawtooth', dur: 0.32, peak: 0.07, vib: 30, vibRate: 22, filter: 900 });
        tone({ f: p * 0.42, f2: p * 0.33, type: 'sawtooth', t: 0.12, dur: 0.3, peak: 0.05, vib: 25, vibRate: 18, filter: 700 });
        break;
      case 'confused':
        v({ f: p * 0.9, f2: p * 1.5, dur: 0.32, peak: 0.07, vib: 18, vibRate: 9 });
        break;
      case 'surprised':
        v({ f: p * 1.2, f2: p * 2.1, dur: 0.14, peak: 0.08 });
        break;
      case 'sad':
        v({ f: p * 1.1, f2: p * 0.7, dur: 0.5, peak: 0.06, vib: 10, vibRate: 5 });
        break;
      case 'worried':
        v({ f: p, f2: p * 0.85, dur: 0.28, peak: 0.06, vib: 22, vibRate: 11 });
        break;
      case 'shy':
        v({ f: p * 1.4, dur: 0.06, peak: 0.035 });
        v({ f: p * 1.6, t: 0.09, dur: 0.07, peak: 0.03 });
        break;
      case 'peek':
        v({ f: p * 1.3, f2: p * 1.55, dur: 0.1, peak: 0.035 });
        break;
      case 'thinking':
        v({ f: p * 0.8, dur: 0.4, peak: 0.04, vib: 6, vibRate: 4 });
        break;
      case 'sleepy':
        noise({ dur: 0.7, peak: 0.02, freq: 500, q: 2, type: 'bandpass' });
        break;
      default:
        break;
    }
  }

  let lastTap = 0;
  window.NaviSFX = {
    get sounds() { return state.sounds; },
    get voices() { return state.voices; },
    setSounds(v) { state.sounds = v; write('navi_sfx', v); },
    setVoices(v) { state.voices = v; write('navi_voices', v); },
    play(name) {
      if (!state.sounds || !UI[name]) return;
      if (name === 'tap' || name === 'soft') {
        const n = performance.now();
        if (n - lastTap < 35) return;
        lastTap = n;
      }
      try { UI[name](); } catch (e) {}
    },
    bot(character, mood) {
      if (!state.voices || reduce) return;
      try { voice(character, mood); } catch (e) {}
    },
    unlock() { ac(); }
  };
})();
