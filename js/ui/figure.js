// Figuras dos exercícios: um modelo de articulações com comprimentos de segmento fixos.
// Cada pose é um conjunto de ângulos, por isso duas poses interpolam-se e o movimento anima-se.
// Proporções: ~7 cabeças de altura. Todas as medidas no espaço do viewBox.
import { POSES } from '../data/poses.js';

export const SEG = {
  torso: 26, shoulder: 23, neck: 9.5, head: 5.8,
  upper: 14.5, fore: 13.5, thigh: 18, shin: 18, foot: 6,
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
// Quantas poses tem a figura. 1 = posição fixa (isometria), não há nada para animar.
export function frameCount(id) { return POSES[id]?.frames?.length || 0; }
export function prefersStill() { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }

function joints(f, farOff = FAR, wide = false) {
  const hip = f.hip;
  const t = f.torso;
  const dir = [Math.cos(rad(t)), -Math.sin(rad(t))];
  const neck = step(hip, SEG.torso, t);
  const shoulder = step(hip, SEG.shoulder, t);
  const headC = step(neck, SEG.neck, t + (f.head || 0));
  const off = (pt, far) => (far ? [pt[0] + farOff[0], pt[1] + farOff[1]] : pt);
  // ombro assenta na frente do tronco, para o braço não se fundir com o corpo
  const perp = [-dir[1], dir[0]];
  const sfOff = wide ? SEG.shoulderFront * 2.6 : SEG.shoulderFront;
  const shoulderFront = [shoulder[0] + perp[0] * sfOff, shoulder[1] + perp[1] * sfOff];
  // vista de frente: o membro do outro lado é o reflexo do próximo em torno da anca
  const mir = p => [2 * hip[0] - p[0], p[1]];
  const arms = (f.arms || []).map(spec => {
    const far = !!(Array.isArray(spec) ? spec[2] : spec.far);
    const mirror = !Array.isArray(spec) && !!spec.mirror;
    const s = off(shoulderFront, far && !mirror);
    let pts;
    if (Array.isArray(spec) || spec.a) {
      const ang = Array.isArray(spec) ? spec : spec.a;
      const e = step(s, SEG.upper, ang[0]);
      pts = [s, e, step(e, SEG.fore, ang[1])];
    } else {
      const r = ik(s, off(spec.pin, far && !mirror), SEG.upper, SEG.fore, spec.bend ?? 1);
      pts = [s, r.mid, r.end];
    }
    if (mirror) pts = pts.map(mir);
    return { pts, wrist: pts[2], far };
  });
  const legs = (f.legs || []).map(spec => {
    const far = !!(Array.isArray(spec) ? spec[3] : spec.far);
    const mirror = !Array.isArray(spec) && !!spec.mirror;
    const h = off(hip, far && !mirror);
    let pts; let toe = null;
    if (Array.isArray(spec) || spec.a) {
      const ang = Array.isArray(spec) ? spec : spec.a;
      const k = step(h, SEG.thigh, ang[0]);
      const a = step(k, SEG.shin, ang[1]);
      pts = [h, k, a];
      const ft = Array.isArray(spec) ? spec[2] : spec.foot;
      if (ft != null) toe = step(a, SEG.foot, ft);
    } else {
      const r = ik(h, off(spec.pin, far && !mirror), SEG.thigh, SEG.shin, spec.bend ?? 1);
      pts = [h, r.mid, r.end];
      if (spec.foot != null) toe = step(r.end, SEG.foot, spec.foot);
    }
    if (mirror) { pts = pts.map(mir); if (toe) toe = mir(toe); }
    return { pts, ankle: pts[2], toe, far };
  });
  return { hip, neck, shoulder, headC, arms, legs, dir, torsoAngle: t, wide };
}

// Exposto para a auditoria de geometria (tools/audit3.mjs).
export function debugJoints(frame, farOff, wide) { return joints(frame, farOff || FAR, wide); }

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
      if (ar.a) return { ...ar, a: [A(ar.a[0], br.a[0]), A(ar.a[1], br.a[1])] };
      return { ...ar, pin: [L(ar.pin[0], br.pin[0]), L(ar.pin[1], br.pin[1])] };
    }),
    legs: (a.legs || []).map((lg, i) => {
      const br = b.legs[i];
      if (Array.isArray(lg)) return lg.map((v, k) => (k < 3 && v != null && br?.[k] != null ? A(v, br[k]) : v));
      if (lg.a) return { ...lg, a: [A(lg.a[0], br.a[0]), A(lg.a[1], br.a[1])], foot: lg.foot == null ? null : A(lg.foot, br.foot) };
      return { ...lg, pin: [L(lg.pin[0], br.pin[0]), L(lg.pin[1], br.pin[1])], foot: lg.foot == null ? null : A(lg.foot, br.foot) };
    }),
    items: a.items, marks: a.marks,
  };
}

const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

// t em [0,1) percorre pose 1 → 2 → … → 1, com pausa nos extremos
export function frameAt(frames, t) {
  if (!frames || !frames.length) return null;
  if (frames.length === 1) return frames[0];
  const loop = [...frames, frames[0]];
  const segs = loop.length - 1;
  const tt = (((t % 1) + 1) % 1); // normaliza para [0,1): o relógio pode chegar negativo
  const raw = tt * segs;
  const i = Math.min(segs - 1, Math.max(0, Math.floor(raw)));
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
    if (p.type === 'rope') {
      const mx = (p.x1 + p.x2) / 2;
      return `<path class="fig-rope" d="M ${p.x1} ${p.y1} Q ${mx} ${p.y1 + (p.bow ?? 60)} ${p.x2} ${p.y2}"/>`;
    }
    if (p.type === 'water') {
      const y = p.y;
      return `<line class="fig-water" x1="${p.x1 ?? 2}" y1="${y}" x2="${p.x2 ?? 98}" y2="${y}"/>`
        + `<line class="fig-water dim" x1="${p.x1 ?? 2}" y1="${y + 5}" x2="${p.x2 ?? 98}" y2="${y + 5}"/>`;
    }
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
    if (it.type === 'ball' && at) return `<circle class="fig-ball" cx="${n(at[0])}" cy="${n(at[1])}" r="${it.r ?? 5}"/>`;
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

// Seta de movimento ancorada ao corpo: descobre qual a articulação que mais se
// desloca entre as poses e desenha a seta ao lado dela, na direção do movimento.
// Assim a pista fica junto da parte que se move, em vez de flutuar num canto.
function autoArrow(P, frame, farOff, wide) {
  const [vx, vy, vw, vh] = (P.viewBox || '0 0 100 100').split(' ').map(Number);
  if (!P.frames || P.frames.length < 2) return null;
  const A = joints(P.frames[0], farOff, wide);
  const B = joints(P.frames[P.frames.length - 1], farOff, wide);
  const now = joints(frame, farOff, wide);
  const pick = j => [
    ['wrist', j.arms[j.arms.length - 1]?.pts[2]],
    ['ankle', j.legs[j.legs.length - 1]?.pts[2]],
    ['knee', j.legs[j.legs.length - 1]?.pts[1]],
    ['shoulder', j.shoulder],
    ['hip', j.hip],
    ['head', j.headC],
  ];
  const a = pick(A), b = pick(B), c = pick(now);
  let best = null;
  for (let i = 0; i < a.length; i++) {
    if (!a[i][1] || !b[i][1] || !c[i][1]) continue;
    const d = Math.hypot(b[i][1][0] - a[i][1][0], b[i][1][1] - a[i][1][1]);
    if (!best || d > best.d) best = { d, from: a[i][1], to: b[i][1], at: c[i][1] };
  }
  if (!best || best.d < 5) return null;
  const ux = (best.to[0] - best.from[0]) / best.d;
  const uy = (best.to[1] - best.from[1]) / best.d;
  // desloca a seta PERPENDICULARMENTE ao movimento, para ficar ao lado do
  // percurso e não em cima do corpo; escolhe o lado mais afastado da anca
  const away = (best.at[0] - now.hip[0]) * -uy + (best.at[1] - now.hip[1]) * ux;
  const sgn = away >= 0 ? 1 : -1;
  const ox = -uy * sgn;
  const oy = ux * sgn;
  const len = Math.max(12, Math.min(17, best.d));
  let start = [best.at[0] + ox * 15 - ux * len / 2, best.at[1] + oy * 15 - uy * len / 2];
  let end = [start[0] + ux * len, start[1] + uy * len];
  // a seta tem de ficar dentro do enquadramento, senão bate no texto em volta
  const m = 5;
  const shift = (i, lo, hi) => {
    const min = Math.min(start[i], end[i]);
    const max = Math.max(start[i], end[i]);
    let d = 0;
    if (min < lo) d = lo - min;
    else if (max > hi) d = hi - max;
    start[i] += d; end[i] += d;
    return Math.max(start[i], end[i]) <= hi + 0.5 && Math.min(start[i], end[i]) >= lo - 0.5;
  };
  const okX = shift(0, vx + m, vx + vw - m);
  const okY = shift(1, vy + m, vy + vh - m);
  if (!okX || !okY) return null;
  return { from: start, to: end };
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

// Calcanhar: um traço curto e mais grosso sobre o primeiro terço do pé, a partir do
// tornozelo. Dá massa ao tornozelo e é isso que faz o pé ler-se como pé — inclusive
// quando está em linha com a canela (ponta esticada), onde antes desaparecia.
function heelEnd(l) {
  const dx = l.toe[0] - l.ankle[0];
  const dy = l.toe[1] - l.ankle[1];
  return [l.ankle[0] + dx * 0.42, l.ankle[1] + dy * 0.42];
}

function legSVG(l) {
  const c = l.far ? ' far' : '';
  const h = l.toe ? heelEnd(l) : null;
  const foot = l.toe ? `<line class="fig-halo-foot${c}" x1="${n(l.ankle[0])}" y1="${n(l.ankle[1])}" x2="${n(l.toe[0])}" y2="${n(l.toe[1])}"/>` : '';
  const foot2 = l.toe ? `<line class="fig-foot${c}" x1="${n(l.ankle[0])}" y1="${n(l.ankle[1])}" x2="${n(l.toe[0])}" y2="${n(l.toe[1])}"/>`
    + `<line class="fig-heel${c}" x1="${n(l.ankle[0])}" y1="${n(l.ankle[1])}" x2="${n(h[0])}" y2="${n(h[1])}"/>` : '';
  return `<polyline class="fig-halo${c}" points="${pts(l.pts)}"/>${foot}`
    + `<polyline class="fig-limb${c}" points="${pts(l.pts)}"/>${foot2}`;
}

function torsoPath(j) {
  const d = j.dir;
  const perp = [-d[1], d[0]];
  const T = [j.hip[0] + d[0] * (SEG.torso - 4.5), j.hip[1] + d[1] * (SEG.torso - 4.5)];
  const B = [j.hip[0] - d[0] * 1.6, j.hip[1] - d[1] * 1.6];
  const k = j.wide ? 1.5 : 1;
  const o = (p, w, s) => [p[0] + perp[0] * w * k * s, p[1] + perp[1] * w * k * s];
  return `M ${xy(o(T, SEG.chestW, 1))} L ${xy(o(T, SEG.chestW, -1))} L ${xy(o(B, SEG.waistW, -1))} L ${xy(o(B, SEG.waistW, 1))} Z`;
}

function torsoSVG(j) {
  const d = torsoPath(j);
  const T = [j.hip[0] + j.dir[0] * (SEG.torso - 4.5), j.hip[1] + j.dir[1] * (SEG.torso - 4.5)];
  const neck = (cls) => `<line class="${cls}" x1="${n(T[0])}" y1="${n(T[1])}" x2="${n(j.headC[0])}" y2="${n(j.headC[1])}"/>`;
  return `<path class="fig-torso-halo" d="${d}"/>${neck('fig-halo-neck')}`
    + `<path class="fig-torso" d="${d}"/>${neck('fig-neck')}`;
}

function bodySVG(f, farOff, wide) {
  const j = joints(f, farOff, wide);
  const far = [];
  const near = [];
  j.legs.forEach(l => (l.far ? far : near).push(legSVG(l)));
  j.arms.forEach(a => (a.far ? far : near).push(armSVG(a)));
  const head = `<circle class="fig-head-halo" cx="${n(j.headC[0])}" cy="${n(j.headC[1])}" r="${SEG.head + 1.6}"/>`
    + `<circle class="fig-head" cx="${n(j.headC[0])}" cy="${n(j.headC[1])}" r="${SEG.head}"/>`;
  return { far: far.join(''), torso: torsoSVG(j), near: near.join(''), head, marks: marksSVG(f.marks, j), j };
}

// ---- SVG estático (miniaturas, tira passo a passo) ----
// Calcula largura/altura respeitando um limite de altura, para poses altas e
// estreitas não estourarem o espaço disponível.
function fit(vw, vh, size, maxH) {
  let w = size;
  let h = (size * vh) / vw;
  if (maxH && h > maxH) { h = maxH; w = (maxH * vw) / vh; }
  return [Math.round(w), Math.round(h)];
}

export function figureSVG(id, { frame = 0, size = 120, maxH = 0, showProps = true, arrow = false, className = '' } = {}) {
  const P = POSES[id];
  if (!P) return '';
  const f = P.frames[Math.min(frame, P.frames.length - 1)];
  const b = bodySVG(f, P.far, P.wide);
  const vb = P.viewBox || '0 0 100 100';
  const [, , vw, vh] = vb.split(' ').map(Number);
  const [w, h] = fit(vw, vh, size, maxH);
  return `<svg class="fig ${className}" viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true">
    ${showProps ? propsSVG(P.props) : ''}
    ${b.far}${b.torso}${b.head}${b.near}${b.marks}
    ${itemsSVG(f.items, b.j)}
    ${arrow ? arrowSVG(f.arrow || P.arrow || autoArrow(P, f, P.far || FAR, P.wide)) : ''}
  </svg>`;
}

// ---- SVG animado ----
export function mountFigure(host, id, { size = 200, maxH = 0, period = 3200, animate = true, arrow = true } = {}) {
  const P = POSES[id];
  if (!P || !host) return () => {};
  const vb = P.viewBox || '0 0 100 100';
  const [, , vw, vh] = vb.split(' ').map(Number);
  const f0 = P.frames[0];
  const b0 = bodySVG(f0, P.far, P.wide);
  const [w, h] = fit(vw, vh, size, maxH);
  host.innerHTML = `<svg class="fig fig-anim" viewBox="${vb}" width="${w}" height="${h}" aria-hidden="true">
    ${propsSVG(P.props)}
    <g data-far>${b0.far}</g>
    <g data-torso>${b0.torso}</g>
    <g data-head>${b0.head}</g>
    <g data-near>${b0.near}</g>
    <g data-marks>${b0.marks}</g>
    <g data-items>${itemsSVG(f0.items, b0.j)}</g>
    <g data-arrow>${arrow ? arrowSVG(f0.arrow || P.arrow || autoArrow(P, f0, P.far || FAR, P.wide)) : ''}</g>
  </svg>`;

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduce || P.frames.length < 2) return () => {};

  const svg = host.querySelector('svg');
  const g = {
    far: svg.querySelector('[data-far]'), torso: svg.querySelector('[data-torso]'),
    near: svg.querySelector('[data-near]'), head: svg.querySelector('[data-head]'),
    marks: svg.querySelector('[data-marks]'), items: svg.querySelector('[data-items]'),
    arrow: svg.querySelector('[data-arrow]'),
  };
  let raf = null;
  let visible = true;
  const t0 = performance.now();

  function tick(now) {
    if (visible) {
      const f = frameAt(P.frames, (Math.max(0, now - t0) % period) / period);
      const b = bodySVG(f, P.far, P.wide);
      g.far.innerHTML = b.far;
      g.torso.innerHTML = b.torso;
      g.near.innerHTML = b.near;
      g.head.innerHTML = b.head;
      g.marks.innerHTML = b.marks;
      g.items.innerHTML = itemsSVG(f.items, b.j);
      if (g.arrow && arrow) g.arrow.innerHTML = arrowSVG(f.arrow || P.arrow || autoArrow(P, f, P.far || FAR, P.wide));
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
