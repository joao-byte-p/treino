// Integridade do registo e limites de datas.
import { buildWeek, sessionFor, cycleInfo, applyPendingGoal, nextCycleStart } from '../js/engine/planner.js';
import { applyProgression } from '../js/engine/progression.js';
import { defaultState, mondayOf, iso } from '../js/store.js';

const problems = [];
const warn = (t, m) => problems.push(`${t.padEnd(24)} ${m}`);

// ── 1. Repetir uma sessão já registada não deve progredir duas vezes ────────
{
  const s = defaultState();
  const semana2 = new Date(mondayOf()); semana2.setDate(semana2.getDate() + 7);
  const sess = sessionFor(s, mondayOf());
  const sessB = sessionFor(s, semana2);
  const strength = sess.blocks.flatMap(b => (b.kind === 'strength' ? b.items : []));
  const res = {};
  for (const it of strength) res[it.ex.id] = { done: true, top: true, rpe: 8, kg: 10 };
  applyProgression(s, sess, res);             // 1.ª sessão
  const ev = applyProgression(s, sessB, res); // 2.ª, noutro dia: deve subir
  if (!ev.length) warn('progressao', 'não subiu à segunda sessão (dias diferentes)');
  const niveisDepois = JSON.stringify(s.chainLevels);
  // "repetir ou rever" no MESMO dia não pode voltar a contar
  applyProgression(s, sessB, res);
  applyProgression(s, sessB, res);
  if (JSON.stringify(s.chainLevels) !== niveisDepois) {
    warn('progressao dupla', `guardar o mesmo dia outra vez mudou os níveis: ${niveisDepois} -> ${JSON.stringify(s.chainLevels)}`);
  }
  // mas corrigir a carga no mesmo dia tem de funcionar
  const comCarga = strength.find(i => i.ex.load);
  if (comCarga) {
    applyProgression(s, sessB, { ...res, [comCarga.ex.id]: { done: true, top: true, rpe: 8, kg: 14 } });
    if (s.loads[comCarga.ex.id] !== 14) warn('correcao de carga', 'reguardar o mesmo dia não corrigiu o peso');
  }
}

// ── 2. Ciclos seguintes e viragem de ano ───────────────────────────────────
{
  const s = defaultState();
  s.profile.cycleStart = '2026-12-28'; // segunda antes da viragem de ano
  const semanas = [];
  for (let w = 0; w < 9; w++) {
    const d = new Date(2026, 11, 28); d.setDate(d.getDate() + w * 7);
    const info = cycleInfo(s.profile, d);
    semanas.push(`${iso(mondayOf(d))} S${info.week}C${info.cycle}`);
    const wk = buildWeek(s, d);
    if (wk.sessions.length !== 7) warn('viragem de ano', `${iso(d)}: ${wk.sessions.length} dias`);
    if (wk.week !== info.week) warn('viragem de ano', `semana inconsistente em ${iso(d)}`);
    const datas = wk.sessions.map(x => x.date);
    if (new Set(datas).size !== 7) warn('viragem de ano', `datas repetidas em ${iso(d)}: ${datas.join(',')}`);
  }
  const esperado = ['S1C1', 'S2C1', 'S3C1', 'S4C1', 'S1C2', 'S2C2', 'S3C2', 'S4C2', 'S1C3'];
  const obtido = semanas.map(x => x.split(' ')[1]);
  if (JSON.stringify(obtido) !== JSON.stringify(esperado)) warn('ciclos', `sequência errada: ${obtido.join(' ')}`);
}

// ── 3. Data anterior ao início do ciclo (utilizador navega para trás) ──────
{
  const s = defaultState();
  const d = new Date(mondayOf()); d.setDate(d.getDate() - 35);
  const info = cycleInfo(s.profile, d);
  if (info.week < 1 || info.week > 4) warn('semanas passadas', `semana ${info.week} fora de 1..4`);
  if (info.cycle < 1) warn('semanas passadas', `ciclo ${info.cycle} inválido`);
  const wk = buildWeek(s, d);
  if (wk.sessions.some(x => x.type !== 'rest' && !x.blocks.length)) warn('semanas passadas', 'sessão vazia no passado');
}

// ── 4. Registo de um dia cujo tipo mudou depois (troca de objetivo) ────────
{
  const s = defaultState();
  const dia = iso(mondayOf());
  s.logs.push({ date: dia, type: 'forcaA', title: 'Força A', completed: true, minutes: 30, summary: 'x' });
  s.profile.goal = 'musculo';           // agora segunda é "push"
  const sess = sessionFor(s, mondayOf());
  if (sess.type === 'forcaA') warn('troca de objetivo', 'o plano não mudou com o objetivo');
  const log = s.logs.find(l => l.date === dia);
  if (log.type === sess.type) warn('troca de objetivo', 'tipo do registo coincide por acaso, teste inválido');
  // a vista tem de continuar a funcionar e a mostrar o registo antigo
  if (!log.title) warn('troca de objetivo', 'registo antigo sem título para mostrar');
}

// ── 5. Objetivo agendado aplica-se exatamente no início do ciclo ───────────
{
  const s = defaultState();
  s.profile.pendingGoal = 'gordura';
  s.profile.pendingGoalFrom = nextCycleStart(s.profile);
  const antes = new Date(s.profile.pendingGoalFrom); antes.setDate(antes.getDate() - 1);
  if (applyPendingGoal(s, antes)) warn('objetivo agendado', 'aplicou-se antes da data');
  const depois = new Date(s.profile.pendingGoalFrom);
  if (!applyPendingGoal(s, depois)) warn('objetivo agendado', 'não se aplicou na data');
  if (s.profile.goal !== 'gordura') warn('objetivo agendado', `objetivo ficou ${s.profile.goal}`);
  if (s.profile.pendingGoal) warn('objetivo agendado', 'ficou pendente depois de aplicar');
  if (cycleInfo(s.profile, depois).week !== 1) warn('objetivo agendado', 'não recomeçou na semana 1');
}

// ── 6. Bandeira do joelho: efeito e reversão ───────────────────────────────
{
  const s = defaultState();
  s.profile.daysPerWeek = 7;
  s.kneeFlag = true;
  const comFlag = buildWeek(s, mondayOf()).sessions.filter(x => x.type !== 'rest').length;
  s.kneeFlag = false;
  const semFlag = buildWeek(s, mondayOf()).sessions.filter(x => x.type !== 'rest').length;
  if (comFlag !== semFlag) warn('joelho', `nº de dias muda com a bandeira: ${comFlag} vs ${semFlag}`);
}

console.log(problems.length ? `${problems.length} problemas:\n` + problems.join('\n') : 'sem problemas');
