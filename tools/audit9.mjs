// Pausas: férias e ausências não podem contar como faltas nem fazer o ciclo andar.
// Correr: node tools/audit9.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { defaultState, iso, mondayOf } = await import('../js/store.js');
const { buildWeek, cycleInfo, emPausa } = await import('../js/engine/planner.js');

const problemas = [];
const s = defaultState(); s.onboarded = true;
const seg = mondayOf(new Date(2026, 8, 14));
s.profile.cycleStart = iso(seg);
const d = n => { const x = new Date(seg); x.setDate(seg.getDate() + n); return iso(x); };
const semana = n => { const x = new Date(seg); x.setDate(seg.getDate() + n * 7); return x; };

// ── 1. sem pausas, o ciclo anda uma semana por semana ──────────────────────
for (let w = 0; w < 8; w++) {
  const c = cycleInfo(s.profile, semana(w), s);
  if (c.week !== (w % 4) + 1) problemas.push(`sem pausa: semana ${w} devia ser ciclo-semana ${(w % 4) + 1}, deu ${c.week}`);
}

// ── 2. duas semanas de pausa congelam o ciclo ──────────────────────────────
s.pausas = [{ de: d(7), ate: d(20), motivo: 'Férias' }];
const semPausa = defaultState(); semPausa.profile.cycleStart = iso(seg);
for (const w of [3, 4, 5]) {
  const com = cycleInfo(s.profile, semana(w), s).week;
  const sem = cycleInfo(semPausa.profile, semana(w), semPausa).week;
  if (com !== ((w - 2) % 4) + 1) problemas.push(`com 2 semanas de pausa: na semana ${w} o ciclo devia estar em ${((w - 2) % 4) + 1}, deu ${com} (sem pausa dava ${sem})`);
}

// ── 3. os dias da pausa não têm treino marcado ─────────────────────────────
for (const w of [1, 2]) {
  const wk = buildWeek(s, semana(w));
  const comTreino = wk.sessions.filter(x => x.type !== 'rest');
  if (comTreino.length) problemas.push(`semana ${w} está em pausa mas tem ${comTreino.length} treinos marcados`);
  if (!wk.sessions.every(x => x.pausa)) problemas.push(`semana ${w}: nem todos os dias ficaram marcados como pausa`);
  if (!wk.sessions.every(x => x.title === 'Férias')) problemas.push(`semana ${w}: o motivo da pausa não aparece no título`);
}

// ── 4. antes e depois da pausa a semana é normal ───────────────────────────
for (const w of [0, 3]) {
  const wk = buildWeek(s, semana(w));
  const n = wk.sessions.filter(x => x.type !== 'rest').length;
  if (n !== s.profile.daysPerWeek) problemas.push(`semana ${w} (fora da pausa) tem ${n} treinos em vez de ${s.profile.daysPerWeek}`);
  if (wk.sessions.some(x => x.pausa)) problemas.push(`semana ${w} tem dias marcados como pausa sem estar em pausa`);
}

// ── 5. emPausa responde bem nas fronteiras ─────────────────────────────────
for (const [dia, esperado] of [[d(6), false], [d(7), true], [d(20), true], [d(21), false]]) {
  if (!!emPausa(s, dia) !== esperado) problemas.push(`emPausa(${dia}) devia ser ${esperado}`);
}

// ── 6. uma pausa no futuro não mexe no ciclo de hoje ───────────────────────
const s2 = defaultState(); s2.profile.cycleStart = iso(seg);
s2.pausas = [{ de: d(70), ate: d(84), motivo: 'Férias' }];
for (let w = 0; w < 6; w++) {
  if (cycleInfo(s2.profile, semana(w), s2).week !== (w % 4) + 1) problemas.push(`pausa futura alterou a semana ${w}`);
}

// ── 7. pausa de poucos dias não congela uma semana inteira ─────────────────
const s3 = defaultState(); s3.profile.cycleStart = iso(seg);
s3.pausas = [{ de: d(7), ate: d(9), motivo: 'Viagem' }];
if (cycleInfo(s3.profile, semana(3), s3).week !== 4) problemas.push('3 dias de pausa não deviam congelar uma semana inteira');

console.log('pausas: 7 cenários');
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
