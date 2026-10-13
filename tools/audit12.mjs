// Registo de cardio feito sem telemóvel. O tempo que conta é o que ele escreve,
// não o que a app viu passar enquanto ele registava — e os registos antigos,
// gravados com um ou dois minutos, têm de ser corrigidos sem estragar mais nada.
// Correr: node tools/audit12.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const store = await import('../js/store.js');
const problemas = [];
const falha = m => problemas.push(m);

const base = logs => JSON.stringify({ ...store.defaultState(), onboarded: true, logs });
const logDe = d => store.getState().logs.find(l => l.date === d);

// 1. corrida antiga, registada depois: 2 min na app, 25 escritos
store.importJSON(base([{ date: '2026-10-01', completed: true, minutes: 2, cardio: { ex: 'run-z2', minutes: 25, dist: 5, unit: 'km' } }]));
let l = logDe('2026-10-01');
if (l.minutes !== 25) falha(`registo antigo devia passar a 25 min, ficou ${l.minutes}`);
if (l.cardio.seconds !== 1500) falha(`registo antigo devia ganhar 1500 s, ficou ${l.cardio.seconds}`);

// 2. idempotente: correr outra vez não muda nada
store.importJSON(JSON.stringify(store.getState()));
l = logDe('2026-10-01');
if (l.minutes !== 25 || l.cardio.seconds !== 1500) falha('a correção não é idempotente');

// 3. não baixa o tempo de quem fez a sessão guiada inteira
store.importJSON(base([{ date: '2026-10-02', completed: true, minutes: 38, cardio: { ex: 'run-z2', minutes: 24, dist: 5, unit: 'km' } }]));
if (logDe('2026-10-02').minutes !== 38) falha('baixou o tempo de uma sessão guiada completa');

// 4. segundos exatos ganham aos minutos arredondados
store.importJSON(base([{ date: '2026-10-03', completed: true, minutes: 1, cardio: { ex: 'run-z2', seconds: 1477, minutes: 1477 / 60, dist: 5, unit: 'km' } }]));
l = logDe('2026-10-03');
if (l.cardio.seconds !== 1477) falha(`perdeu os segundos: ${l.cardio.seconds}`);
if (l.minutes !== 25) falha(`24:37 devia contar 25 min, contou ${l.minutes}`);

// 5. treinos sem cardio ficam como estão
store.importJSON(base([{ date: '2026-10-04', completed: true, minutes: 31, results: {} }]));
if (logDe('2026-10-04').minutes !== 31) falha('mexeu num treino sem cardio');

// 6. registo de cardio sem tempo nenhum não rebenta
store.importJSON(base([{ date: '2026-10-05', completed: true, minutes: 3, cardio: { ex: 'swim-easy', dist: 800, unit: 'm' } }]));
if (logDe('2026-10-05').minutes !== 3) falha('inventou tempo para um registo sem tempo');

console.log('registo de cardio: 6 cenários');
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
