// Corrigir registos e o temporizador em pausa. Correr: node tools/audit14.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const problemas = [];
const falha = m => problemas.push(m);

// ── 1. o "00" pré-preenchido não se cola ao que ele escreve ────────────────
{
  const { ligarMmss, lerMmss } = await import('../js/ui/components.js');
  const campo = (seg, value) => {
    const ouvintes = {};
    return { value, matches: q => (q === '[data-c-seg]') === seg, select() {}, addEventListener: (t, f) => { ouvintes[t] = f; }, escrever(v) { this.value = v; ouvintes.input?.(); } };
  };
  const min = campo(false, '25'), seg = campo(true, '00');
  const root = { querySelectorAll: () => [min, seg], querySelector: q => (q === '[data-c-min]' ? min : seg) };
  ligarMmss(root);
  seg.escrever('0024');                       // o que o iPhone fazia: "00" + "24"
  if (seg.value !== '24') falha(`segundos "0024" deviam ficar "24", ficaram "${seg.value}"`);
  if (lerMmss(root) !== 25 * 60 + 24) falha(`25:24 deu ${lerMmss(root)} segundos`);
  min.escrever('3025');
  if (min.value !== '025') falha(`minutos com algarismos a mais deviam ficar com os últimos 3, ficaram "${min.value}"`);
}

// ── 2. corrigir um cardio já registado ─────────────────────────────────────
{
  const store = await import('../js/store.js');
  const base = store.defaultState(); base.onboarded = true;
  // o registo estragado: 25:2400 virou 65:00 e a semana contou 65 min
  base.logs = [
    { date: '2026-10-20', completed: true, minutes: 65, updatedAt: 1, results: {}, summary: '65:00 · 5 km', cardio: { ex: 'run-z2', seconds: 3900, minutes: 65, dist: 5, unit: 'km' } },
    // sessão guiada: a app mediu 38 min (aquecimento incluído), a corrida foi 24:10
    { date: '2026-10-21', completed: true, minutes: 38, updatedAt: 1, results: {}, summary: '24:10 · 5 km', cardio: { ex: 'run-z2', seconds: 1450, minutes: 1450 / 60, dist: 5, unit: 'km' } },
  ];
  store.importJSON(JSON.stringify(base));
  store.corrigirCardio('2026-10-20', { seconds: 25 * 60 + 24, dist: 5 });
  const l = store.findLog('2026-10-20');
  if (l.cardio.seconds !== 1524) falha(`tempo corrigido: ${l.cardio.seconds}`);
  if (l.minutes !== 25) falha(`a semana devia passar a contar 25 min, conta ${l.minutes}`);
  if (l.summary !== '25:24 · 5 km') falha(`resumo depois de corrigir: ${l.summary}`);
  if (!(l.updatedAt > 1)) falha('a correção não ficou mais recente, e a sincronização perdia-a');
  store.corrigirCardio('2026-10-21', { seconds: 1440, dist: 5.1 });
  const m = store.findLog('2026-10-21');
  if (m.minutes !== 38) falha(`corrigir a corrida não pode apagar o tempo que a app mediu: ${m.minutes}`);
  if (m.cardio.dist !== 5.1) falha('a distância corrigida não ficou');
  if (store.corrigirCardio('2026-10-20', { seconds: 0 })) falha('aceitou um tempo vazio');
}

// ── 3. somar tempo com o temporizador em pausa mostra-se logo ──────────────
{
  const { countdown } = await import('../js/timer.js');
  let mostrado = null, anel = null;
  const t = countdown(30, { onTick: s => { mostrado = s; }, onFrame: f => { anel = f; } });
  t.pause();
  t.add(10);
  if (mostrado !== 40) falha(`em pausa, +10s devia mostrar 40, mostra ${mostrado}`);
  if (anel !== 1) falha(`com mais tempo do que o inicial o anel devia estar cheio, está ${anel}`);
  t.add(-10); t.add(-10);
  if (mostrado !== 20) falha(`em pausa, −10s −10s devia mostrar 20, mostra ${mostrado}`);
  t.add(-100);
  if (mostrado !== 0) falha(`o tempo em pausa não pode ficar negativo: ${mostrado}`);
  t.stop();
}

// ── 4. dias de força: 40 minutos, e braços todas as semanas ────────────────
{
  const store = await import('../js/store.js');
  const { buildWeek } = await import('../js/engine/planner.js');
  const st = store.defaultState(); st.onboarded = true;
  const seg = store.mondayOf(new Date(2026, 9, 26));
  st.profile.cycleStart = store.iso(seg);
  for (let w = 0; w < 4; w++) {
    const d = new Date(seg); d.setDate(seg.getDate() + w * 7);
    const wk = buildWeek(st, d);
    for (const x of wk.sessions) {
      const ids = x.blocks.flatMap(b => b.items.map(i => i.ex.chain));
      if (x.type === 'forcaB' && !ids.includes('curl')) falha(`semana ${wk.week}: Força B sem curl`);
      if (x.type === 'forcaA' && !ids.includes('triceps')) falha(`semana ${wk.week}: Força A sem tríceps`);
      if (x.type.startsWith('forca') && x.estMinutes < 38) falha(`semana ${wk.week}: ${x.type} com ${x.estMinutes} min, devia ter ~40`);
      if (['cardio', 'hiit'].includes(x.type) && x.estMinutes > 33) falha(`semana ${wk.week}: ${x.type} passou a ${x.estMinutes} min, devia ficar nos 30`);
    }
  }
  // um extra de "parte de cima" com 30 min fica nos 30, não herda os 40 da força
  const { buildExtra } = await import('../js/engine/planner.js');
  const ex = buildExtra(st, store.iso(new Date(seg.getTime() + 5 * 864e5)), 'cima', 30);
  if (ex.estMinutes > 33) falha(`extra de 30 min saiu com ${ex.estMinutes}`);
}

// ── 5. barras desligadas: o remo com halteres continua a ganhar carga ──────
{
  const store = await import('../js/store.js');
  const { applyProgression } = await import('../js/engine/progression.js');
  const { chainLevels } = await import('../js/data/exercises.js');
  const st = store.defaultState();
  st.profile.equipment.bars = false;
  const niveis = chainLevels('row');
  const semBarras = niveis.filter(l => !l.equipment.includes('bars'));
  const topo = semBarras[semBarras.length - 1];
  st.chainLevels.row = topo.level;
  st.loads[topo.id] = 8;
  const sessao = n => ({ date: `2026-11-0${n}`, week: 1, blocks: [{ kind: 'strength', items: [{ ex: topo }] }] });
  let eventos = [];
  for (let n = 1; n <= 9 && !eventos.length; n++) eventos = applyProgression(st, sessao(n), { [topo.id]: { done: true, top: true, rpe: 8, kg: st.loads[topo.id] } });
  if (st.chainLevels.row !== topo.level) falha(`com as barras desligadas o remo subiu para o nível ${st.chainLevels.row}, que é de barras`);
  if (eventos[0]?.type !== 'load') falha(`no topo do que o equipamento permite devia subir a carga, deu: ${JSON.stringify(eventos[0])}`);
  // com as barras ligadas, sobe para o nível de barras como antes
  const st2 = store.defaultState();
  st2.chainLevels.row = topo.level;
  eventos = [];
  for (let n = 1; n <= 9 && !eventos.length; n++) eventos = applyProgression(st2, sessao(n), { [topo.id]: { done: true, top: true, rpe: 8, kg: 8 } });
  if (eventos[0]?.type !== 'level') falha('com barras ligadas o remo devia subir de nível');
}

// ── 6. o relógio espera só no primeiro exercício de cada bloco ─────────────
{
  const store = await import('../js/store.js');
  const { buildWeek } = await import('../js/engine/planner.js');
  const { buildSteps } = await import('../js/ui/session.js');
  const st = store.defaultState(); st.onboarded = true;
  const seg = store.mondayOf(new Date(2026, 9, 26)); st.profile.cycleStart = store.iso(seg);
  const hiit = buildWeek(st, seg).sessions.find(x => x.type === 'hiit');
  const passos = buildSteps(hiit);
  const trabalho = passos.filter(p => p.type === 'work');
  const blocos = hiit.blocks.filter(b => b.items.length).length;
  const aEspera = trabalho.filter(p => p.inicioBloco);
  if (aEspera.length !== blocos) falha(`${blocos} blocos e ${aEspera.length} exercícios à espera de começar`);
  if (!trabalho[0].inicioBloco) falha('o primeiro exercício da sessão devia esperar');
  const hiitPassos = trabalho.filter(p => hiit.blocks.find(b => b.kind === 'hiit')?.title === p.block);
  if (hiitPassos.filter(p => p.inicioBloco).length !== 1) falha('dentro do HIIT, só o primeiro exercício da primeira ronda devia esperar');
}

console.log('correções, temporizador, dias de força, progressão e arranque de blocos: 6 cenários');
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
