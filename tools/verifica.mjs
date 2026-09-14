// Mede as afirmações concretas dos relatórios de revisão, para eu decidir com números
// em vez de acreditar no relatório. Correr: node tools/verifica.mjs
import { POSES } from '../js/data/poses.js';
import { SEG, frameAt, debugJoints } from '../js/ui/figure.js';

const r = v => Math.round(v * 10) / 10;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang3 = (a, b, c) => { // ângulo interno em b, em graus
  const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
  const d = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
  return r(Math.acos(Math.min(1, Math.max(-1, d))) * 180 / Math.PI);
};
const chao = id => ((POSES[id].props || []).find(p => p.type === 'floor') || {}).y ?? null;
const prop = (id, t) => (POSES[id].props || []).filter(p => p.type === t);
const F = (id, i) => { const P = POSES[id]; return debugJoints(P.frames[Math.min(i, P.frames.length - 1)], P.far, P.wide); };

const linha = (rot, txt) => console.log(`  ${String(rot).padEnd(30)} ${txt}`);
const sec = t => console.log(`\n── ${t}`);

const braco = (id, i, lado = 1) => { const a = F(id, i).arms[lado]; return { corda: r(dist(a.pts[0], a.pts[2])), cotovelo: ang3(a.pts[0], a.pts[1], a.pts[2]) }; };
const perna = (id, i, lado = 1) => { const l = F(id, i).legs[lado]; return { corda: r(dist(l.pts[0], l.pts[2])), joelho: ang3(l.pts[0], l.pts[1], l.pts[2]) }; };

function pesMaisBaixo(id) {
  const P = POSES[id]; let y = -1e9, t0 = 0;
  for (let k = 0; k <= 40; k++) {
    const j = debugJoints(frameAt(P.frames, k / 40), P.far, P.wide);
    for (const l of j.legs) { const v = l.toe ? Math.max(l.ankle[1], l.toe[1]) : l.ankle[1]; if (v > y) { y = v; t0 = k / 40; } }
  }
  return { y: r(y), t: t0 };
}

// em quantos instantes os DOIS pés estão claramente no ar
function voo(id, margem = 2) {
  const P = POSES[id], c = chao(id); if (c == null) return [];
  const maus = [];
  for (let k = 0; k <= 40; k++) {
    const j = debugJoints(frameAt(P.frames, k / 40), P.far, P.wide);
    const ys = j.legs.map(l => (l.toe ? Math.max(l.ankle[1], l.toe[1]) : l.ankle[1]));
    if (Math.min(...ys.map(y => c - y)) > margem) maus.push(k / 40);
  }
  return maus;
}

sec('ELEVAÇÕES: o queixo passa a barra?');
for (const id of ['pullup', 'pullup-negative']) {
  const b = prop(id, 'bar')[0];
  POSES[id].frames.forEach((f, i) => {
    const j = F(id, i); const br = braco(id, i);
    linha(`${id} f${i}`, `queixo y=${r(j.headC[1] + SEG.head)} vs barra y=${b.y1} · braço ${br.corda}/28 cotovelo ${br.cotovelo}°`);
  });
}

sec('LOCOMOÇÃO: os pés tocam o chão? há fase de voo?');
for (const id of ['run-z2', 'run-tempo', 'walk-brisk', 'march-in-place', 'rope-skip-light', 'burpee-stepout', 'bear-crawl']) {
  const p = pesMaisBaixo(id);
  linha(id, `chão ${chao(id)} · pé mais baixo ${p.y} (t=${p.t}) · instantes com os dois pés no ar: ${voo(id).length}/41`);
}

sec('PÉS EM SINCRONIA (burpee step-out, marcha)');
for (const id of ['burpee-stepout', 'march-in-place', 'walk-brisk']) {
  POSES[id].frames.forEach((f, i) => {
    const j = F(id, i);
    linha(`${id} f${i}`, `pés ${j.legs.map(l => `${r((l.toe || l.ankle)[0])},${r((l.toe || l.ankle)[1])}`).join('  |  ')}`);
  });
}

sec('AGACHAMENTOS: profundidade, joelho vs ponta do pé, tronco');
for (const [id, i] of [['goblet-squat', 1], ['db-thruster', 0], ['squat-to-stand', 1], ['bulgarian-split-squat', 1], ['reverse-lunge', 1], ['walking-lunge', 1], ['split-squat', 1], ['step-up', 1], ['pistol-full', 1], ['pistol-assisted', 1], ['wall-sit', 0], ['wall-sit-single', 0], ['spanish-squat-iso', 0]]) {
  const j = F(id, i); const l = j.legs[1];
  const [anca, joelho, torn] = l.pts;
  const fr = POSES[id].frames[Math.min(i, POSES[id].frames.length - 1)];
  linha(`${id} f${i}`, `joelho ${ang3(anca, joelho, torn)}° · anca-joelho Δy ${r(joelho[1] - anca[1])} · joelho-ponta Δx ${l.toe ? r(joelho[0] - l.toe[0]) : '—'} · tronco ${fr.torso}°`);
}

sec('JOELHO DE TRÁS: altura acima do chão');
for (const [id, i] of [['bulgarian-split-squat', 1], ['reverse-lunge', 1], ['walking-lunge', 1], ['split-squat', 1], ['hip-flexor-stretch', 0]]) {
  const l = F(id, i).legs[0];
  linha(`${id} f${i}`, `joelho de trás y=${r(l.pts[1][1])} · chão ${chao(id)} · folga ${r((chao(id) ?? 0) - l.pts[1][1])}`);
}

sec('PERNAS QUE DEVIAM ESTICAR (36 = esticada)');
for (const [id, i, lado] of [['hamstring-stretch', 0, 1], ['tibialis-raise', 0, 1], ['tibialis-raise', 1, 1], ['downdog-cobra', 1, 1], ['swim-easy', 0, 1], ['pike-elevated', 0, 1]]) {
  const p = perna(id, i, lado);
  linha(`${id} f${i} perna${lado}`, `anca-tornozelo ${p.corda}/36 · joelho ${p.joelho}°`);
}

sec('BRAÇOS: esticados ou dobrados? (28 = esticado)');
for (const [id, i, lado] of [['chair-dips', 0, 1], ['chair-dips', 1, 1], ['bar-dips', 0, 1], ['pike-elevated', 1, 1], ['pike-pushup', 1, 1], ['pushup-archer', 1, 0], ['db-curl-concentration', 1, 1], ['db-curl', 1, 1], ['shadow-boxing', 0, 1], ['shadow-boxing', 1, 1], ['db-press-seated', 1, 1], ['rope-skip-light', 0, 1], ['deep-squat-hold', 0, 1], ['thoracic-rotation', 1, 1]]) {
  const b = braco(id, i, lado);
  linha(`${id} f${i} braço${lado}`, `ombro-mão ${b.corda}/28 · cotovelo ${b.cotovelo}°`);
}

sec('MÃOS: separação e posição');
for (const id of ['diamond-pushup', 'pushup-board', 'pushup-archer', 'bar-dips', 'bar-dips-lsit', 'renegade-row', 'towel-pull-apart']) {
  const j = F(id, 0);
  linha(id, `mãos ${j.arms.map(a => `${r(a.wrist[0])},${r(a.wrist[1])}`).join(' | ')} · separação ${r(Math.abs(j.arms[0].wrist[0] - j.arms[1].wrist[0]))} · pés x ${j.legs.map(l => r((l.toe || l.ankle)[0])).join(' | ')}`);
}

sec('ACESSÓRIOS: existem? onde está a figura em relação a eles?');
for (const id of ['towel-pull-apart', 'deep-squat-hold', 'rope-skip-light', 'calf-raise-single', 'db-press-seated', 'pistol-assisted', 'ninety-ninety', 'figure-four', 'hamstring-stretch']) {
  const j = F(id, 0);
  linha(id, `props: ${(POSES[id].props || []).map(p => p.type).join(', ') || 'NENHUM'} · anca ${r(j.hip[0])},${r(j.hip[1])} · chão ${chao(id) ?? '—'}`);
}

sec('PARADA DE MÃOS: de que lado está a parede?');
for (const id of ['wall-handstand-hold', 'handstand-pushup-wall']) {
  const w = prop(id, 'wall')[0];
  POSES[id].frames.forEach((f, i) => {
    const j = F(id, i);
    linha(`${id} f${i}`, `parede x=${w.x} · mãos x ${j.arms.map(a => r(a.wrist[0])).join('/')} · pés x ${j.legs.map(l => r((l.toe || l.ankle)[0])).join('/')} · cabeça ${r(j.headC[0])},${r(j.headC[1])}`);
  });
}

sec('FIGURA 4 e 90/90: onde está o tornozelo cruzado?');
{
  const j = F('figure-four', 0);
  linha('figure-four', `tornozelo cruzado ${r(j.legs[0].ankle[0])},${r(j.legs[0].ankle[1])} · joelho de baixo ${r(j.legs[1].pts[1][0])},${r(j.legs[1].pts[1][1])} · distância ${r(dist(j.legs[0].ankle, j.legs[1].pts[1]))}`);
  const k = F('ninety-ninety', 0);
  linha('ninety-ninety', `anca y=${r(k.hip[1])} · chão ${chao('ninety-ninety')} · folga ${r(chao('ninety-ninety') - k.hip[1])}`);
}

sec('MOVIMENTO ENTRE POSES: quanto se desloca cada ponto');
for (const id of ['cat-cow', 'thoracic-rotation', 'towel-pull-apart', 'swim-easy', 'arm-circles', 'diaphragm-breathing', 'walk-brisk', 'diamond-pushup', 'tibialis-raise']) {
  const P = POSES[id];
  if (P.frames.length < 2) { linha(id, 'isometria'); continue; }
  const a = F(id, 0), b = F(id, 1);
  const pts = j => [j.hip, j.headC, ...j.arms.map(x => x.wrist), ...j.legs.map(x => x.ankle)];
  const nomes = ['anca', 'cabeça', 'mão0', 'mão1', 'pé0', 'pé1'];
  linha(id, pts(a).map((p, k) => `${nomes[k]} ${r(dist(p, pts(b)[k]))}`).join(' · '));
}

sec('MOUNTAIN CLIMBER: o joelho vai à frente ou atrás da anca?');
for (const i of [0, 1]) {
  const j = F('mountain-climber-slow', i);
  linha(`f${i}`, `anca ${r(j.hip[0])},${r(j.hip[1])} · joelho perto ${r(j.legs[1].pts[1][0])},${r(j.legs[1].pts[1][1])} · pé ${r(j.legs[1].ankle[0])},${r(j.legs[1].ankle[1])} · cabeça x ${r(j.headC[0])}`);
}

sec('MEMBROS OPOSTOS: dead-bug e bird-dog estendem o mesmo lado ou lados opostos?');
for (const id of ['dead-bug', 'bird-dog']) {
  const a = F(id, 0), b = F(id, 1);
  const dB = a.arms.map((x, k) => r(dist(x.wrist, b.arms[k].wrist)));
  const dP = a.legs.map((x, k) => r(dist(x.ankle, b.legs[k].ankle)));
  linha(id, `mãos movem ${dB.join(' / ')} · pés movem ${dP.join(' / ')} → ${dB[0] > dB[1] ? 'braço afastado' : 'braço próximo'} + ${dP[0] > dP[1] ? 'perna afastada' : 'perna próxima'}`);
}

sec('BALANÇO (hollow rock): ombros e pés movem-se no mesmo sentido?');
{
  const a = F('hollow-rock', 0), b = F('hollow-rock', 1);
  const dOmbro = r(b.shoulder[1] - a.shoulder[1]);
  const dPe = r(b.legs[1].ankle[1] - a.legs[1].ankle[1]);
  linha('hollow-rock', `ombro Δy ${dOmbro} · pé Δy ${dPe} → ${Math.sign(dOmbro) === Math.sign(dPe) ? 'MESMO sentido (abre e fecha, não balança)' : 'sentidos opostos (balança)'}`);
}

sec('PONTE DE GLÚTEOS e HIP THRUSTS: anca no chão em baixo, em linha em cima?');
for (const [id, nome] of [['glute-bridge', 'ponte'], ['db-hip-thrust', 'hip thrust'], ['single-leg-hip-thrust', 'unilateral'], ['hip-thrust-single-elevated', 'unilateral elevado']]) {
  POSES[id].frames.forEach((f, i) => {
    const j = F(id, i);
    const [ombro, anca, joelho] = [j.shoulder, j.hip, j.legs[1].pts[1]];
    linha(`${id} f${i}`, `anca y=${r(anca[1])} (chão ${chao(id)}) · ombro-anca-joelho ${ang3(ombro, anca, joelho)}° · anca vs joelho Δy ${r(anca[1] - joelho[1])}`);
  });
}

sec('PERNA LIVRE dos hip thrusts: o joelho dobra para o lado certo?');
for (const id of ['single-leg-hip-thrust', 'hip-thrust-single-elevated']) {
  const j = F(id, 1); const l = j.legs[0];
  linha(id, `anca ${r(l.pts[0][0])},${r(l.pts[0][1])} · joelho ${r(l.pts[1][0])},${r(l.pts[1][1])} · pé ${r(l.pts[2][0])},${r(l.pts[2][1])} · cabeça x ${r(j.headC[0])}`);
}

sec('APOIOS QUE TÊM DE FICAR QUIETOS');
for (const [id, lado] of [['side-plank-dips', 1], ['copenhagen-plank', 1]]) {
  POSES[id].frames.forEach((f, i) => {
    const j = F(id, i);
    linha(`${id} f${i}`, `cotovelo ${r(j.arms[lado].pts[1][0])},${r(j.arms[lado].pts[1][1])} · mão ${r(j.arms[lado].wrist[0])},${r(j.arms[lado].wrist[1])} · chão ${chao(id)}`);
  });
}

sec('COPENHAGEN: apoia o joelho (curta) ou o pé (longa)?');
{
  const j = F('copenhagen-plank', 0); const box = prop('copenhagen-plank', 'box')[0];
  const l = j.legs[0];
  linha('perna de cima', `joelho ${r(l.pts[1][0])},${r(l.pts[1][1])} · pé ${r(l.pts[2][0])},${r(l.pts[2][1])} · banco x ${box.x}-${box.x + box.w} y ${box.y}`);
  linha('perna de baixo', `joelho ${r(j.legs[1].pts[1][0])},${r(j.legs[1].pts[1][1])} · pé ${r(j.legs[1].ankle[0])},${r(j.legs[1].ankle[1])}`);
}

sec('RDL: canela vertical? halteres junto às pernas?');
for (const [id, i] of [['db-rdl', 1], ['db-single-leg-rdl', 1], ['db-staggered-rdl', 1]]) {
  const j = F(id, i); const l = j.legs[1];
  const canela = r(Math.abs(l.pts[1][0] - l.pts[2][0]));
  linha(`${id} f${i}`, `joelho ${ang3(l.pts[0], l.pts[1], l.pts[2])}° · canela fora da vertical ${canela} · mão ${r(j.arms[1].wrist[0])},${r(j.arms[1].wrist[1])} · joelho x ${r(l.pts[1][0])}`);
}
{
  const j = F('db-staggered-rdl', 1); const t = j.legs[0];
  linha('perna de trás', `anca ${r(t.pts[0][0])} · joelho ${r(t.pts[1][0])},${r(t.pts[1][1])} · pé ${r(t.pts[2][0])} · joelho ${ang3(t.pts[0], t.pts[1], t.pts[2])}°`);
}

sec('ELEVAÇÃO DE JOELHOS SUSPENSO: a coxa passa da horizontal?');
for (const i of [0, 1]) {
  const j = F('hanging-knee-raise', i);
  linha(`f${i}`, `anca ${r(j.hip[0])},${r(j.hip[1])} · joelho ${r(j.legs[1].pts[1][0])},${r(j.legs[1].pts[1][1])} · coxa acima da horizontal? ${j.legs[1].pts[1][1] < j.hip[1] ? 'sim' : 'não'}`);
}
