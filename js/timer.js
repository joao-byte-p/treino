// Temporizador com sons (Web Audio) e wake lock. Beeps: 3 curtos nos últimos segundos, 1 longo no fim.
let ctx = null;
let wakeLock = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // toque silencioso para desbloquear no iOS
    const o = ctx.createOscillator(); const g = ctx.createGain();
    g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
  } catch { /* sem áudio */ }
}

export function beep(kind = 'tick') {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const spec = {
      tick: { f: 880, d: 0.09, v: 0.25 },
      go: { f: 1320, d: 0.35, v: 0.35 },
      rest: { f: 520, d: 0.3, v: 0.3 },
      done: { f: 990, d: 0.6, v: 0.35 },
    }[kind];
    o.type = 'sine';
    o.frequency.setValueAtTime(spec.f, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(spec.v, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + spec.d);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + spec.d + 0.02);
  } catch { /* ignora */ }
}

export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release(); wakeLock = null;
    }
  } catch { wakeLock = null; }
}

// Contagem decrescente baseada em timestamps (não deriva se o separador abrandar).
export function countdown(seconds, { onTick, onDone, onFrame, tone = 'rest' } = {}) {
  const total = Math.max(0.001, seconds);
  const end = Date.now() + seconds * 1000;
  let last = seconds;
  let raf = null;
  let stopped = false;
  let paused = false;
  let pauseRemain = 0;
  let endAt = end;

  function loop() {
    if (stopped) return;
    if (paused) { raf = requestAnimationFrame(loop); return; }
    const remain = Math.max(0, (endAt - Date.now()) / 1000);
    const whole = Math.ceil(remain);
    onFrame?.(Math.min(1, remain / total));
    if (whole !== last) {
      last = whole;
      if (whole > 0 && whole <= 3) beep('tick');
      onTick?.(whole, remain);
    }
    if (remain <= 0) {
      stopped = true;
      beep(tone === 'rest' ? 'go' : 'rest');
      onDone?.();
      return;
    }
    raf = requestAnimationFrame(loop);
  }
  onTick?.(seconds, seconds);
  onFrame?.(1);
  raf = requestAnimationFrame(loop);

  return {
    stop() { stopped = true; if (raf) cancelAnimationFrame(raf); },
    pause() { if (!paused) { paused = true; pauseRemain = endAt - Date.now(); } },
    resume() { if (paused) { paused = false; endAt = Date.now() + pauseRemain; } },
    add(sec) { endAt += sec * 1000; if (paused) pauseRemain += sec * 1000; },
    get paused() { return paused; },
  };
}

export function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
}

export function fmtLong(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
