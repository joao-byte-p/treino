// Treino avulso: um dia que ELE pediu, não um dia que o plano exige. As regras que
// isso implica são fáceis de partir sem dar por ela, e é isso que aqui se verifica.
// Correr: node tools/audit11.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { defaultState, iso, mondayOf } = await import('../js/store.js');
const { buildWeek, buildExtra, resolveTipoExtra, TIPOS_EXTRA, cycleInfo, MIN_MINUTOS } = await import('../js/engine/planner.js');

const problemas = [];
const falha = m => problemas.push(m);
const seg = mondayOf(new Date(2026, 8, 14));
const d = n => { const x = new Date(seg); x.setDate(seg.getDate() + n); return iso(x); };

const base = () => { const s = defaultState(); s.onboarded = true; s.profile.cycleStart = iso(seg); return s; };

// ── 1. o extra ocupa um dia de descanso e não mexe nos planeados ────────────
const s = base();
const semExtra = buildWeek(s, seg);
const descanso = semExtra.sessions.find(x => x.type === 'rest');
if (!descanso) falha('a semana de 5 dias devia ter dias de descanso');
s.extras = { [descanso.date]: { tipo: 'mobilidade', minutos: 30 } };
const comExtra = buildWeek(s, seg);
const dia = comExtra.sessions.find(x => x.date === descanso.date);
if (!dia.extra) falha('o dia com extra não ficou marcado como extra');
if (dia.type === 'rest') falha('o extra não substituiu o descanso');
const planeadosAntes = semExtra.sessions.filter(x => x.type !== 'rest' && !x.extra).length;
const planeadosDepois = comExtra.sessions.filter(x => x.type !== 'rest' && !x.extra).length;
if (planeadosAntes !== planeadosDepois) falha(`o extra mexeu nos dias planeados: ${planeadosAntes} -> ${planeadosDepois}`);
for (const x of comExtra.sessions) {
  const antes = semExtra.sessions.find(y => y.date === x.date);
  if (x.date !== descanso.date && x.type !== antes.type) falha(`o extra mudou o dia ${x.date}: ${antes.type} -> ${x.type}`);
}

// ── 2. um extra num dia planeado é ignorado ────────────────────────────────
const s2 = base();
const treino = buildWeek(s2, seg).sessions.find(x => x.type !== 'rest');
s2.extras = { [treino.date]: { tipo: 'core', minutos: 45 } };
const dia2 = buildWeek(s2, seg).sessions.find(x => x.date === treino.date);
if (dia2.extra || dia2.type !== treino.type) falha('um extra num dia planeado substituiu o treino do plano');

// ── 3. durante uma pausa marcada não entra ─────────────────────────────────
const s3 = base();
s3.pausas = [{ de: d(0), ate: d(6), motivo: 'Férias' }];
s3.extras = { [d(5)]: { tipo: 'mobilidade', minutos: 30 } };
const dia3 = buildWeek(s3, seg).sessions.find(x => x.date === d(5));
if (dia3.extra) falha('entrou um extra durante uma pausa marcada');

// ── 4. o ciclo não anda por causa de um extra ──────────────────────────────
const antesCiclo = cycleInfo(base().profile, seg, base()).week;
const depoisCiclo = cycleInfo(s.profile, seg, s).week;
if (antesCiclo !== depoisCiclo) falha('o extra mexeu na semana do ciclo');

// ── 5. todos os tipos montam, respeitam o mínimo e o tempo pedido ──────────
for (const t of TIPOS_EXTRA) {
  for (const min of [30, 45, 60]) {
    const sess = buildExtra(base(), descanso.date, t.id, min);
    if (!sess) { falha(`${t.id}: não montou`); continue; }
    if (!sess.extra) falha(`${t.id}: não vem marcado como extra`);
    if (!sess.blocks.length) falha(`${t.id} (${min} min): saiu sem blocos`);
    if (sess.estMinutes < MIN_MINUTOS) falha(`${t.id} (${min} min): ${sess.estMinutes} min, abaixo do mínimo`);
    if (sess.estMinutes > min * 1.5 + 5) falha(`${t.id}: pedidos ${min} min, saíram ${sess.estMinutes}`);
    if (!/extra/.test(sess.subtitle)) falha(`${t.id}: o subtítulo não diz que é extra`);
  }
}

// ── 6. um extra de cardio não põe mais uma corrida em cima das da semana ───
const cardio = buildExtra(base(), descanso.date, 'cardio', 30);
const ids = cardio.blocks.flatMap(b => b.items.map(i => i.ex.id));
if (ids.some(i => i.startsWith('run-'))) falha(`cardio extra devia ser sem impacto, veio ${ids.filter(i => i.startsWith('run-'))}`);

// ── 7. "parte de cima" escolhe o lado mais atrasado ────────────────────────
const sPush = base(); sPush.logs = [{ date: d(-2), completed: true, type: 'push' }, { date: d(-3), completed: true, type: 'push' }];
if (resolveTipoExtra('cima', sPush, d(5)) !== 'pull') falha('com dois push recentes, "parte de cima" devia dar pull');
const sPull = base(); sPull.logs = [{ date: d(-2), completed: true, type: 'pull' }, { date: d(-3), completed: true, type: 'pull' }];
if (resolveTipoExtra('cima', sPull, d(5)) !== 'push') falha('com dois pull recentes, "parte de cima" devia dar push');
if (resolveTipoExtra('mobilidade', base(), d(5)) !== 'mobilidade') falha('resolveTipoExtra alterou um tipo que não é "cima"');

// ── 8. nenhum tipo extra carrega o joelho quando ele está marcado ──────────
const sJoelho = base(); sJoelho.kneeFlag = true;
for (const t of TIPOS_EXTRA) {
  const sess = buildExtra(sJoelho, descanso.date, t.id, 30);
  const maus = sess.blocks.flatMap(b => b.items).filter(i => i.ex.knee === 'avoid');
  if (maus.length) falha(`${t.id}: com o joelho marcado prescreveu ${maus.map(i => i.ex.id)}`);
}

console.log(`treino avulso: ${TIPOS_EXTRA.length} tipos × 3 durações, 8 regras`);
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
