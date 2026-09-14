// Verifica a troca de dias: a semana mantém os dias de treino, a troca é simétrica
// e desfaz-se, e nada disto mexe noutras semanas.
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };
const { defaultState, iso, mondayOf } = await import('../js/store.js');
const { buildWeek } = await import('../js/engine/planner.js');

const problemas = [];
const s = defaultState(); s.onboarded = true;
const seg = mondayOf(new Date(2026, 8, 14));
const dia = n => { const d = new Date(seg); d.setDate(seg.getDate() + n); return iso(d); };

const antes = buildWeek(s, seg);
const ativosAntes = antes.sessions.filter(x => x.type !== 'rest').length;
const qua = antes.sessions[2], sab = antes.sessions[5];

s.movidos = { [dia(2)]: dia(5) };
const dep = buildWeek(s, seg);
const ativosDep = dep.sessions.filter(x => x.type !== 'rest').length;

if (ativosDep !== ativosAntes) problemas.push(`a troca mudou os dias de treino: ${ativosAntes} → ${ativosDep}`);
if (dep.sessions[5].type !== qua.type) problemas.push(`sábado não recebeu o treino de quarta (${dep.sessions[5].type} != ${qua.type})`);
if (dep.sessions[2].type !== sab.type) problemas.push(`quarta não recebeu o que estava no sábado (${dep.sessions[2].type} != ${sab.type})`);
if (!dep.sessions[2].movido || !dep.sessions[5].movido) problemas.push('os dois dias deviam ficar marcados como trocados');
if (dep.sessions[5].date !== dia(5)) problemas.push('a data do dia mudou com a troca');
for (const x of dep.sessions) if (![0, 2, 5].includes(x.dayIndex) && x.movido) problemas.push(`dia ${x.dayIndex} marcado como trocado sem o ser`);

// a semana seguinte não pode ser afetada
const prox = new Date(seg); prox.setDate(seg.getDate() + 7);
const semProx = buildWeek(s, prox);
const base = buildWeek(defaultState(), prox);
for (let i = 0; i < 7; i++) if (semProx.sessions[i].type !== base.sessions[i].type) problemas.push(`a troca vazou para a semana seguinte no dia ${i}`);

// desfazer devolve tudo ao sítio
s.movidos = {};
const volta = buildWeek(s, seg);
for (let i = 0; i < 7; i++) if (volta.sessions[i].type !== antes.sessions[i].type) problemas.push(`desfazer não repôs o dia ${i}`);

// trocar um dia de treino com outro dia de treino continua a dar os mesmos dias ativos
s.movidos = { [dia(0)]: dia(1) };
const dois = buildWeek(s, seg);
if (dois.sessions.filter(x => x.type !== 'rest').length !== ativosAntes) problemas.push('trocar dois dias de treino mudou a contagem');

console.log(`troca de dias: 6 cenários · dias de treino ${ativosAntes}`);
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
