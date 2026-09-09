// Simula um ano de treinos sempre bem sucedidos e vê onde a app fica sem nada a oferecer.
// Serve dois propósitos: provar que nunca prescreve mais peso do que o João tem, e
// dizer quando é que cada cadeia chega ao topo. Correr: node tools/audit6.mjs
import { buildWeek } from '../js/engine/planner.js';
import { applyProgression } from '../js/engine/progression.js';
import { defaultState, mondayOf } from '../js/store.js';
import { chainLevels, isProgression } from '../js/data/exercises.js';

const problems = [];
const s = defaultState();
s.onboarded = true;
const TETO = s.profile.dumbbellMaxKg;

const topo = {};      // cadeia -> semana em que chegou ao nível máximo
const tetoEm = {};    // exercício -> semana em que a carga parou de subir
const comprar = [];   // avisos de "compra mais peso"
let maxCargaVista = 0;

const d0 = mondayOf(new Date(2026, 0, 5));
for (let semana = 1; semana <= 52; semana++) {
  const d = new Date(d0);
  d.setDate(d.getDate() + (semana - 1) * 7);
  const wk = buildWeek(s, d);

  for (const sess of wk.sessions) {
    if (sess.type === 'rest') continue;
    const strength = sess.blocks.flatMap(b => (b.kind === 'strength' ? b.items : []));
    for (const it of strength) {
      const kg = it.load?.kg;
      if (kg != null) {
        maxCargaVista = Math.max(maxCargaVista, kg);
        if (kg > TETO) problems.push(`semana ${semana}: prescreve ${kg} kg em ${it.ex.id}, e o teto são ${TETO}`);
        if (kg >= TETO && !tetoEm[it.ex.id]) tetoEm[it.ex.id] = semana;
      }
      // reps não podem crescer sem fim: seria transformar força em resistência sem avisar
      if (it.reps && it.reps[1] > (it.ex.reps?.[1] || 0) + 6) {
        problems.push(`semana ${semana}: ${it.ex.id} com ${it.reps[1]} reps (base ${it.ex.reps[1]}, bónus > 6)`);
      }
    }
    const results = {};
    for (const it of strength) results[it.ex.id] = { done: true, top: true, rpe: 8, kg: it.load?.kg ?? null };
    const ev = applyProgression(s, sess, results);
    for (const e of ev) {
      if (e.type === 'comprar') comprar.push(`semana ${semana}: ${e.ex}`);
    }
  }

  for (const [chain, lvl] of Object.entries(s.chainLevels)) {
    if (!isProgression(chain)) continue;
    if (lvl >= chainLevels(chain).length && !topo[chain]) topo[chain] = semana;
  }
}

console.log(`52 semanas simuladas · teto ${TETO} kg · carga máxima prescrita ${maxCargaVista} kg`);

const cadeias = Object.keys(s.chainLevels).filter(isProgression).sort((a, b) => (topo[a] || 99) - (topo[b] || 99));
console.log('\n── Quando cada cadeia chega ao último nível ──');
for (const c of cadeias) {
  const n = chainLevels(c).length;
  console.log(`  ${c.padEnd(10)} ${n} níveis · ${topo[c] ? 'topo na semana ' + topo[c] : 'ainda no nível ' + s.chainLevels[c]}`);
}

const semTopo = cadeias.filter(c => !topo[c]).length;
console.log(`\ncadeias no topo ao fim de um ano: ${cadeias.length - semTopo} de ${cadeias.length}`);

const tetos = Object.entries(tetoEm).sort((a, b) => a[1] - b[1]);
if (tetos.length) {
  console.log(`\n── Exercícios que chegam aos ${TETO} kg ──`);
  for (const [id, w] of tetos) console.log(`  semana ${String(w).padStart(2)}  ${id}`);
}
if (comprar.length) console.log(`\navisos de "compra mais peso": ${comprar.length}\n  ` + comprar.slice(0, 8).join('\n  '));

console.log('');
if (problems.length) { console.log(`${problems.length} problemas:\n  ` + problems.slice(0, 15).join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas: nunca prescreveu mais peso do que existe em casa');
