// Figuras dos exercícios: um modelo de articulações com comprimentos de segmento fixos.
// Cada pose é um conjunto de ângulos, por isso duas poses interpolam-se e o movimento anima-se.
// Proporções: ~7 cabeças de altura. Todas as medidas no espaço do viewBox.
import { POSES } from '../data/poses.js';

export const SEG = {
  torso: 26, shoulder: 23, neck: 9.5, head: 5.8,
  upper: 16, fore: 15, thigh: 18, shin: 18, foot: 6,
  chestW: 6.3, waistW: 4.7, shoulderFront: 2.9,
};
const FAR = [-5.2, 0]; // desvio dos membros do lado afastado; poses deitadas passam { far: [0, -5.2] }

const rad = d => (d * Math.PI) / 180;
const step = (p, len, deg) => [p[0] + len * Math.cos(rad(deg)), p[1] - len * Math.sin(rad(deg))];
const n = v => Math.round(v * 10) / 10;
const xy = p => `${n(p[0])} ${n(p[1])}`;
const pts = a => a.map(p => `${n(p[0])},${n(p[1])}`).join(' ');

// IK de dois segmentos: dada a raiz (ombro/anca) e um alvo fixo (mão/pé no chão),
// resolve a posição do cotovelo/joelho. É isto que mantém a mão pregada ao chão
// enquanto o resto do corpo se move, em vez de a arrastar.
function ik(root, target, l1, l2, bend = 1) {
  let dx = target[0] - root[0];
  let dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const min = Math.abs(l1 - l2) + 0.01;
  const max = l1 + l2 - 0.01;
  if (d < min || d > max) {
    const k = (d < min ? min : max) / d;
    dx *= k; dy *= k; d = d < min ? min : max;
  }
  const end = [root[0] + dx, root[1] + dy];
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const th = Math.atan2(dy, dx) + bend * Math.acos(cosA);
  return { mid: [root[0] + l1 * Math.cos(th), root[1] + l1 * Math.sin(th)], end };
}

export function hasPose(id) { return !!POSES[id]; }
export function poseOf(id) { return POSES[id] || null; }

function joints(f, farOff = FAR) {
  const hip = f.hip;
  const t = f.torso;
  const dir = [Math.cos(rad(t)), -Math.sin(rad(t))];
  const neck = step(hip, SEG.torso, t);
  const shoulder = step(hip, SEG.shoulder, t);
  const headC = step(neck, SEG.neck, t + (f.head || 0));
  const off = (pt, far) => (far ? [pt[0] + farOff[0], pt[1] + farOff[1]] : pt);
  // ombro assenta na frente do tronco, para o braço não se fundir com o corpo
  const perp = [-dir[1], dir[0]];
  const shoulderFront = [shoulder[0] + perp[0] * SEG.shoulderFront, shoulder[1] + perp[1] * SEG.shoulderFront];
  const arms = (f.arms || []).map(spec => {
    if (Array.isArray(spec)) {
      const [u, fo, far] = spec;
      const s = off(shoulderFront, far);
      const e = step(s, SEG.upper, u);
      const w = step(e, SEG.fore, fo);
      return { pts: [s, e, w], wrist: w, far: !!far };
    }
    const far = !!spec.far;
    const s = off(shoulderFront, far);
    const r = ik(s, off(spec.pin, far), SEG.upper, SEG.fore, spec.bend ?? 1);
    return { pts: [s, r.mid, r.end], wrist: r.end, far };
  });
  const legs = (f.legs || []).map(spec => {
    if (Array.isArray(spec)) {
      const [th, sh, ft, far] = spec;
      const h = off(hip, far);
      const k = step(h, SEG.thigh, th);
      const a = step(k, SEG.shin, sh);
      return { pts: [h, k, a], ankle: a, toe: ft == null ? null : step(a, SEG.foot, ft), far: !!far };
    }
    const far = !!spec.far;
    const h = off(hip, far);
    const r = ik(h, off(spec.pin, far), SEG.thigh, SEG.shin, spec.bend ?? 1);
    return { pts: [h, r.mid, r.end], ankle: r.end, toe: spec.foot == null ? null : step(r.end, SEG.foot, spec.foot), far };
  });
  return { hip, neck, shoulder, headC, arms, legs, dir, torsoAngle: t };
}

function resolve(name, j) {
  if (!name) return null;
  const m = /^(wrist|elbow|ankle|knee)(\d+)?$/.exec(name);
  if (m) {
    const i = Number(m[2] || 0);
    if (m[1] === 'wrist') return j.arms[i]?.pts[2];
    if (m[1] === 'elbow') return j.arms[i]?.pts[1];
    if (m[1] === 'ankle') return j.legs[i]?.pts[2];
    if (m[1] === 'knee') return j.legs[i]?.pts[1];
  }
  if (name === 'hip') return j.hip;
  if (name === 'neck') return j.neck;
  if (name === 'shoulder') return j.shoulder;
  if (name === 'head') return j.headC;
  if (name === 'chest') return [(j.hip[0] + j.neck[0]) / 2, (j.hip[1] + j.neck[1]) / 2];
  return null;
}

// ---- interpolação entre poses ----
// Ângulos interpolam pelo arco mais curto: de -90° para 180° o braço desce por trás
// (-90 → -180) em vez de dar a volta por cima do ombro (-90 → 0 → 90 → 180).
const lerpAngle = (a, b, u) => {
  const d = ((((b - a + 180) % 360) + 360) % 360) - 180;
  return a + d * u;
};

function lerpFrame(a, b, u) {
  const L = (x, y) => x + (y - x) * u;
  const A = (x, y) => lerpAngle(x, y, u);
  return {
    hip: [L(a.hip[0], b.hip[0]), L(a.hip[1], b.hip[1])],
    torso: A(a.torso, b.torso),
    head: A(a.head || 0, b.head || 0),
    arms: (a.arms || []).map((ar, i) => {
      const br = b.arms[i];
      if (Array.isArray(ar)) return ar.map((v, k) => (k < 2 ? A(v, br[k]) : v));
      return { ...ar, pin: [L(ar.pin[0], br.pin[0]), L(ar.pin[1], br.pin[1])] };
    }),
    legs: (a.legs || []).map((lg, i) => {
      const br = b.legs[i];
      if (Array.isArray(lg)) return lg.map((v, k) => (k < 3 && v != null && br?.[k] != null ? A(v, br[k]) : v));
      return { ...lg, pin: [L(lg.pin[0], br.pin[0]), L(lg.pin[1], br.pin[1])], foot: lg.foot == null ? null : A(lg.foot, br.foot) };
    }),
    items: a.items, marks: a.marks,
  };
}

const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

// t em [0,1) percorre pose 1 → 2 → … → 1, com pausa nos extremos
export function frameAt(frames, t) {
  if (frames.length === 1) return frames[0];
  const loop = [...frames, frames[0]];
  const segs = loop.length - 1;
  const raw = t * segs;
  const i = Math.min(segs - 1, Math.floor(raw));
  let u = raw - i;
  const hold = 0.18;
  u = u < hold ? 0 : u > 1 - hold ? 1 : (u - hold) / (1 - 2 * hold);
  return lerpFrame(loop[i], loop[i + 1], easeInOut(u));
}

// ---- cenário ----
function propsSVG(props = []) {
  return (props || []).map(p => {
    if (p.type === 'floor') return `<line class="fig-floor" x1="${p.x1 ?? 2}" y1="${p.y}" x2="${p.x2 ?? 98}" y2="${p.y}"/>`;
    if (p.type === 'box') return `<rect class="fig-prop" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.rx ?? 1.5}"/>`;
    if (p.type === 'bar') return `<line class="fig-prop-line" x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}"/>`;
    if (p.type === 'wall') return `<line class="fig-prop-line" x1="${p.x}" y1="${p.y1 ?? 6}" x2="${p.x}" y2="${p.y2 ?? 92}"/>`;
    return '';
  }).join('');
}

function dumbbell(at, rot = 0, scale = 1) {
  if (!at) return '';
  return `<g class="fig-db" transform="translate(${xy(at)}) rotate(${rot}) scale(${scale})">
    <rect x="-2" y="-1.1" width="4" height="2.2" rx="1"/>
    <rect x="-5.2" y="-3.3" width="3.2" height="6.6" rx="1.3"/>
    <rect x="2" y="-3.3" width="3.2" height="6.6" rx="1.3"/>
  </g>`;
}

function itemsSVG(items = [], j) {
  return (items || []).map(it => {
    const at = Array.isArray(it.at) ? it.at : resolve(it.at, j);
    if (it.type === 'db') return dumbbell(at, it.rot || 0, it.scale || 1);
    return '';
  }).join('');
}

function marksSVG(marks = [], j) {
  return (marks || []).map(m => {
    const at = Array.isArray(m.at) ? m.at : resolve(m.at, j);
    if (!at) return '';
    return `<circle class="fig-mark${m.tone === 'warn' ? ' warn' : ''}" cx="${n(at[0])}" cy="${n(at[1])}" r="${m.r ?? 5.4}"/>`;
  }).join('');
}

function arrowSVG(a) {
  if (!a) return '';
  const [x1, y1] = a.from, [x2, y2] = a.to;
  const bow = a.bow ?? 0;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bow * 0.32;
  const my = (y1 + y2) / 2 + (x2 - x1) * bow * 0.32;
  const dx = x2 - mx, dy = y2 - my;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const s = 3.6;
  const p1 = [x2 - ux * s - uy * s * 0.62, y2 - uy * s + ux * s * 0.62];
  const p2 = [x2 - ux * s + uy * s * 0.62, y2 - uy * s - ux * s * 0.62];
  return `<g class="fig-arrow">
    <path d="M ${xy([x1, y1])} Q ${xy([mx, my])} ${xy([x2 - ux * 2.6, y2 - uy * 2.6])}"/>
    <path class="fig-arrow-head" d="M ${xy([x2, y2])} L ${xy(p1)} L ${xy(p2)} Z"/>
  </g>`;
}

// ---- corpo ----
// Cada parte leva um contorno da cor do fundo desenhado imediatamente antes,
// para que partes sobrepostas se distingam sem depender de cor.
function armSVG(a) {
  const c = a.far ? ' far' : '';
  return `<polyline class="fig-halo${c}" points="${pts(a.pts)}"/>`
    + `<circle class="fig-halo-dot${c}" cx="${n(a.wrist[0])}" cy="${n(a.wrist[1])}" r="3.9"/>`
    + `<polyline class="fig-limb${c}" points="${pts(a.pts)}"/>`
    + `<circle class="fig-hand${c}" cx="${n(a.wrist[0])}" cy="${n(a.wrist[1])}" r="2.6"/>`;
}

function legSVG(l) {
  const c = l.far ? ' far' : '';
  const foot = l.toe ? `<line class="fig-halo-foot${c}" x1="${n(l.ankle[0])}" y1="${n(l.ankle[1])}" x2="${n(l.toe[0])}" y2="${n(l.toe[1])}"/>` : '';
  const foot2 = l.toe ? `<line class="fig-foot${c}" x1="${n(l.ankle[0])}" y1="${n(l.ankle[1])}" x2="${n(l.toe[0])}" y2="${n(l.toe[1])}"/>` : '';
  return `<polyline class="fig-halo${c}" points="${pts(l.pts)}"/>${foot}`
    + `<polyline class="fig-limb${c}" points="${pts(l.pts)}"/>${foot2}`;
}

function torsoPath(j) {
  const d = j.dir;
  const perp = [-d[1], d[0]];
  const T = [j.hip[0] + d[0] * (SEG.torso - 4.5), j.hip[1] + d[1] * (SEG.torso - 4.5)];
  const B = [j.hip[0] - d[0] * 1.6, j.hip[1] - d[1] * 1.6];
  const o = (p, w, s) => [p[0] + perp[0] * w * s, p[1] + perp[1] * w * s];
  return `M ${xy(o(T, SEG.chestW, 1))} L ${xy(o(T, SEG.chestW, -1))} L ${xy(o(B, SEG.waistW, -1))} L ${xy(o(B, SEG.waistW, 1))} Z`;
}

function torsoSVG(j) {
  const d = torsoPath(j);
  const T = [j.hip[0] + j.dir[0] * (SEG.torso - 4.5), j.hip[1] + j.dir[1] * (SEG.torso - 4.5)];
  const neck = (cls) => `<line class="${cls}" x1="${n(T[0])}" y1="${n(T[1])}" x2="${n(j.headC[0])}" y2="${n(j.headC[1])}"/>`;
  return `<path class="fig-torso-halo" d="${d}"/>${neck('fig-halo-neck')}`
    + `<path class="fig-torso" d="${d}"/>${neck('fig-neck')}`;
}

function bodySVG(f, farOff) {
  const j = joints(f, farOff);
  const far = [];
  const near = [];
  j.legs.forEach(l => (l.far ? far : near).push(legSVG(l)));
  j.arms.forEach(a => (a.far ? far : near).push(armSVG(a)));
  const head = `<circle class="fig-head-halo" cx="${n(j.headC[0])}" cy="${n(j.headC[1])}" r="${SEG.head + 1.6}"/>`
    + `<circle class="fig-head" cx="${n(j.headC[0])}" cy="${n(j.headC[1])}" r="${SEG.head}"/>`;
  return { far: far.join(''), torso: torsoSVG(j), near: near.join(''), head, marks: marksSVG(f.marks, j), j };
}

// ---- SVG estático (miniaturas, tira passo a passo) ----
export function figureSVG(id, { frame = 0, size = 120, showProps = true, arrow = false, className = '' } = {}) {
  const P = POSES[id];
  if (!P) return '';
  const f = P.frames[Math.min(frame, P.frames.length - 1)];
  const b = bodySVG(f, P.far);
  const vb = P.viewBox || '0 0 100 100';
  const [, , vw, vh] = vb.split(' ').map(Number);
  return `<svg class="fig ${className}" viewBox="${vb}" width="${size}" height="${Math.round((size * vh) / vw)}" aria-hidden="true">
    ${showProps ? propsSVG(P.props) : ''}
    ${b.far}${b.torso}${b.head}${b.near}${b.marks}
    ${itemsSVG(f.items, b.j)}
    ${arrow ? arrowSVG(f.arrow || P.arrow) : ''}
  </svg>`;
}

// ---- SVG animado ----
export function mountFigure(host, id, { size = 200, period = 3200, animate = true, arrow = true } = {}) {
  const P = POSES[id];
  if (!P || !host) return () => {};
  const vb = P.viewBox || '0 0 100 100';
  const [, , vw, vh] = vb.split(' ').map(Number);
  const f0 = P.frames[0];
  const b0 = bodySVG(f0, P.far);
  host.innerHTML = `<svg class="fig fig-anim" viewBox="${vb}" width="${size}" height="${Math.round((size * vh) / vw)}" aria-hidden="true">
    ${propsSVG(P.props)}
    <g data-far>${b0.far}</g>
    <g data-torso>${b0.torso}</g>
    <g data-head>${b0.head}</g>
    <g data-near>${b0.near}</g>
    <g data-marks>${b0.marks}</g>
    <g data-items>${itemsSVG(f0.items, b0.j)}</g>
    ${arrow ? arrowSVG(f0.arrow || P.arrow) : ''}
  </svg>`;

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduce || P.frames.length < 2) return () => {};

  const svg = host.querySelector('svg');
  const g = {
    far: svg.querySelector('[data-far]'), torso: svg.querySelector('[data-torso]'),
    near: svg.querySelector('[data-near]'), head: svg.querySelector('[data-head]'),
    marks: svg.querySelector('[data-marks]'), items: svg.querySelector('[data-items]'),
  };
  let raf = null;
  let visible = true;
  const t0 = performance.now();

  function tick(now) {
    if (visible) {
      const f = frameAt(P.frames, ((now - t0) % period) / period);
      const b = bodySVG(f, P.far);
      g.far.innerHTML = b.far;
      g.torso.innerHTML = b.torso;
      g.near.innerHTML = b.near;
      g.head.innerHTML = b.head;
      g.marks.innerHTML = b.marks;
      g.items.innerHTML = itemsSVG(f.items, b.j);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(host);
  }
  return () => { if (raf) cancelAnimationFrame(raf); io?.disconnect(); };
}

// ---- tira passo a passo ----
export function stepsStrip(id, { size = 130 } = {}) {
  const P = POSES[id];
  if (!P) return '';
  return `<ol class="figstrip">${P.frames.map((f, i) => `
    <li>
      <div class="figstrip-art">${figureSVG(id, { frame: i, size, arrow: i === P.frames.length - 1 })}<span class="figstrip-n">${i + 1}</span></div>
      <span class="figstrip-l">${f.label || ''}</span>
    </li>`).join('')}</ol>`;
}
