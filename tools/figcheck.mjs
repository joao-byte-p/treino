// Inventário das figuras: uma linha por exercício, com nº de frames e deslocamento entre poses.
// Correr: node tools/figcheck.mjs
import { EXERCISES } from '../js/data/exercises.js';
import { POSES } from '../js/data/poses.js';
import { debugJoints, frameAt } from '../js/ui/figure.js';

const FAR = [-5.2, 0];
const rows = [];
const semPose = [];
const umFrame = [];
const quietas = [];

function allPts(fr, farOff, wide) {
  const j = debugJoints(fr, farOff, wide);
  const p = [j.hip, j.neck, j.shoulder, j.headC];
  for (const a of j.arms) p.push(...a.pts);
  for (const l of j.legs) { p.push(...l.pts); if (l.toe) p.push(l.toe); }
  return p;
}

for (const ex of EXERCISES) {
  const pose = POSES[ex.id];
  if (!pose) { semPose.push(ex.id); continue; }
  const frames = pose.frames || [];
  const farOff = pose.far || FAR;
  const wide = !!pose.wide;
  let maxMove = 0;
  if (frames.length > 1) {
    // maior deslocamento de qualquer articulação ao longo de todo o ciclo
    const base = allPts(frames[0], farOff, wide);
    for (let s = 0; s <= 40; s++) {
      const f = frameAt(frames, s / 40);
      const p = allPts(f, farOff, wide);
      for (let i = 0; i < base.length; i++) {
        maxMove = Math.max(maxMove, Math.hypot(p[i][0] - base[i][0], p[i][1] - base[i][1]));
      }
    }
  }
  rows.push({ id: ex.id, name: ex.name, pattern: ex.pattern, frames: frames.length, move: Math.round(maxMove * 10) / 10, isTime: !!ex.time, labels: frames.map(f => f.label || '—') });
  if (frames.length < 2) umFrame.push(ex);
  else if (maxMove < 4) quietas.push({ id: ex.id, move: maxMove });
}

const hold = ex => !!ex.time && !['cardio', 'hiit'].includes(ex.pattern);

console.log(`exercícios: ${EXERCISES.length} · com pose: ${rows.length} · sem pose: ${semPose.length}`);
if (semPose.length) console.log('SEM POSE: ' + semPose.join(', '));

console.log('\n── Sem animação (1 frame) ──');
for (const ex of umFrame) {
  console.log(`  ${hold(ex) ? 'ok  ' : 'REVER'} ${ex.id.padEnd(24)} ${ex.time ? ex.time + 's' : (ex.reps ? ex.reps.join('-') + ' reps' : '?')}  ${ex.pattern}`);
}
console.log('\n── Animação com pouco movimento (<4 unidades) ──');
for (const q of quietas) console.log(`  ${q.id.padEnd(24)} ${Math.round(q.move * 10) / 10}`);

console.log('\n── Todos ──');
for (const r of rows.sort((a, b) => a.pattern.localeCompare(b.pattern) || a.id.localeCompare(b.id))) {
  console.log(`  ${r.pattern.padEnd(10)} ${r.id.padEnd(24)} ${r.frames}f mov ${String(r.move).padStart(5)}  ${r.labels.join(' → ')}`);
}

// ── Miniaturas cabem na caixa ────────────────────────────────────────────────
// O viewBox de cada pose enquadra a cena toda e varia de 1,8:1 deitado a 0,4:1
// suspenso. Numa caixa quadrada de 56px isso fazia metade das figuras sair fora,
// e o dips em paralelas desenhava-se a 132px. As miniaturas usam recorte quadrado
// centrado no corpo; isto confirma que continuam a caber e a encher a caixa.
import { figureSVG } from '../js/ui/figure.js';

const fora = [];
const pequenas = [];
for (const ex of EXERCISES) {
  if (!POSES[ex.id]) continue;
  for (const lado of [44, 56]) {
    const svg = figureSVG(ex.id, { size: lado, square: true, showProps: false });
    const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svg);
    if (!m) { fora.push(`${ex.id}: sem dimensões a ${lado}px`); continue; }
    const [w, h] = [Number(m[1]), Number(m[2])];
    if (w > lado || h > lado) fora.push(`${ex.id}: ${w}x${h} numa caixa de ${lado}`);
    if (Math.max(w, h) < lado) pequenas.push(`${ex.id}: ${w}x${h} não enche ${lado}`);
  }
}
console.log(`
── Miniaturas ──`);
console.log(`  ${fora.length ? fora.length + ' fora da caixa' : 'todas dentro da caixa'} · ${pequenas.length ? pequenas.length + ' a não encher' : 'todas a encher'}`);
for (const f of fora.slice(0, 10)) console.log('  FORA  ' + f);
for (const f of pequenas.slice(0, 10)) console.log('  FOLGA ' + f);
if (fora.length) process.exitCode = 1;
