// Auditoria do motor: percorre todo o espaço de parâmetros e procura sessões inválidas.
// Correr: node tools/audit.mjs
import { EXERCISES, BY_ID, chainLevels, isProgression } from '../js/data/exercises.js';
import { buildWeek, sessionFor, estimateMinutes, cycleInfo, nextCycleStart, DAY_META } from '../js/engine/planner.js';
import { applyProgression, RPE } from '../js/engine/progression.js';
import { defaultState, iso, mondayOf, GOALS } from '../js/store.js';

const problems = [];
const warn = (tag, msg) => problems.push(`${tag.padEnd(22)} ${msg}`);

function stateFor(over = {}) {
  const s = defaultState();
  Object.assign(s.profile, over.profile || {});
  Object.assign(s, { ...over, profile: s.profile });
  return s;
}

// ── 1. Todas as combinações objetivo × dias × semana do ciclo ──────────────
const goals = Object.keys(GOALS);
const dayCounts = [5, 6, 7];
const minuteOpts = [25, 30, 40, 45];
let sessionsChecked = 0;

for (const goal of goals) {
  for (const daysPerWeek of dayCounts) {
    for (const minutes of minuteOpts) {
      for (const weekOffset of [0, 1, 2, 3]) {
        for (const kneeFlag of [false, true]) {
          const s = stateFor({ profile: { goal, daysPerWeek, minutes }, kneeFlag });
          const d = new Date(mondayOf());
          d.setDate(d.getDate() + weekOffset * 7);
          const wk = buildWeek(s, d);
          const tag = `${goal}/${daysPerWeek}d/${minutes}m/S${wk.week}${kneeFlag ? '/joelho' : ''}`;

          if (wk.sessions.length !== 7) warn('semana', `${tag}: ${wk.sessions.length} dias`);
          const active = wk.sessions.filter(x => x.type !== 'rest');
          if (active.length !== daysPerWeek) warn('dias ativos', `${tag}: ${active.length} != ${daysPerWeek}`);

          for (const sess of wk.sessions) {
            sessionsChecked++;
            if (sess.type === 'rest') continue;
            const main = sess.blocks.find(b => ['strength', 'hiit', 'circuit', 'cardio', 'mobility'].includes(b.kind));
            if (!main) { warn('sem bloco', `${tag} ${sess.type}`); continue; }
            if (!main.items.length) warn('bloco vazio', `${tag} ${sess.type} (${main.kind})`);
            if (main.kind === 'strength' && main.items.length < 3) warn('poucos exercicios', `${tag} ${sess.type}: ${main.items.length}`);
            // duração dentro do orçamento (+/- tolerância)
            const est = estimateMinutes(sess);
            const target = minutes * (wk.week === 4 ? 0.65 : 1); // semana 4 é deload
            if (est > target * 1.4 + 6) warn('tempo excede', `${tag} ${sess.type}: ${est} min para alvo ${Math.round(target)}`);
            if (est < target * 0.6) warn('tempo curto', `${tag} ${sess.type}: ${est} min para alvo ${Math.round(target)}`);
            // exercícios existem e respeitam o joelho
            for (const b of sess.blocks) {
              for (const it of b.items) {
                if (!it.ex || !BY_ID[it.ex.id]) { warn('exercicio invalido', `${tag} ${sess.type}`); continue; }
                if (s.profile.kneeSensitive && it.ex.knee === 'avoid') warn('joelho avoid', `${tag} ${it.ex.id}`);
                if (kneeFlag && it.ex.knee === 'care' && ['squat', 'knee', 'hiit', 'cardio'].includes(it.ex.pattern)) {
                  warn('joelho em cuidado', `${tag} ${sess.type} ${it.ex.id}`);
                }
                if (it.kind === 'strength') {
                  if (!it.sets || it.sets < 1) warn('series invalidas', `${tag} ${it.ex.id}: ${it.sets}`);
                  if (!it.reps && !it.time) warn('sem prescricao', `${tag} ${it.ex.id}`);
                  if (it.reps && (it.reps[0] > it.reps[1])) warn('reps invertidas', `${tag} ${it.ex.id}: ${it.reps}`);
                }
              }
              // duplicados dentro do mesmo bloco
              const ids = b.items.map(i => i.ex.id);
              const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
              if (dup.length) warn('duplicado no bloco', `${tag} ${sess.type} ${b.title}: ${dup.join(',')}`);
            }
          }
        }
      }
    }
  }
}

// ── 2. Equipamento em falta: a app tem de continuar a montar sessões ───────
const eqKeys = ['dumbbells', 'board', 'rope', 'bars', 'pool', 'court', 'chair'];
for (const off of [...eqKeys.map(k => [k]), ['bars', 'chair'], ['dumbbells', 'bars'], eqKeys]) {
  const s = defaultState();
  for (const k of off) s.profile.equipment[k] = false;
  const wk = buildWeek(s, new Date());
  const tag = `sem ${off.join('+')}`;
  for (const sess of wk.sessions) {
    if (sess.type === 'rest') continue;
    const main = sess.blocks.find(b => ['strength', 'hiit', 'circuit', 'cardio', 'mobility'].includes(b.kind));
    if (!main || !main.items.length) { warn('equipamento', `${tag}: ${sess.type} sem exercícios`); continue; }
    for (const b of sess.blocks) for (const it of b.items) {
      const need = it.ex.equipment.filter(e => s.profile.equipment[e] === false);
      if (need.length) warn('equipamento', `${tag}: ${sess.type} usa ${it.ex.id} (precisa de ${need.join(',')})`);
    }
  }
}

// ── 3. Progressão: sobe de nível e de carga como prometido ─────────────────
{
  const s = defaultState();
  const sess = sessionFor(s, mondayOf());
  const strength = sess.blocks.flatMap(b => (b.kind === 'strength' ? b.items : []));
  if (!strength.length) warn('progressao', 'sessão de força sem exercícios');
  const results = {};
  for (const it of strength) results[it.ex.id] = { done: true, top: true, rpe: 8, kg: 10 };
  const ev1 = applyProgression(s, sess, results);
  if (ev1.length) warn('progressao', `subiu logo na 1.ª sessão: ${JSON.stringify(ev1)}`);
  const ev2 = applyProgression(s, sess, results);
  if (!ev2.length) warn('progressao', 'não subiu na 2.ª sessão consecutiva');
  // duas cadeias iguais na mesma sessão não devem contar duas vezes
  const chains = strength.map(i => i.ex.chain);
  const dupChain = chains.filter((c, i) => chains.indexOf(c) !== i);
  if (dupChain.length) warn('progressao', `mesma cadeia repetida na sessão: ${dupChain.join(',')} (conta a dobrar)`);
  // falha deve zerar
  const s2 = defaultState();
  applyProgression(s2, sess, results);
  const bad = {};
  for (const it of strength) bad[it.ex.id] = { done: false, top: false, rpe: 10, kg: 10 };
  applyProgression(s2, sess, bad);
  for (const c of Object.keys(s2.chainStreak)) if (s2.chainStreak[c] !== 0) warn('progressao', `falha não zerou a cadeia ${c}`);
}

// ── 4. Níveis no topo da cadeia: não deve estourar nem parar de treinar ────
{
  const s = defaultState();
  for (const ex of EXERCISES) s.chainLevels[ex.chain] = 99;
  const wk = buildWeek(s, new Date());
  for (const sess of wk.sessions) {
    if (sess.type === 'rest') continue;
    const main = sess.blocks.find(b => b.kind === 'strength');
    if (main && !main.items.length) warn('nivel maximo', `${sess.type} ficou sem exercícios`);
  }
  const sess = sessionFor(s, mondayOf());
  const strength = sess.blocks.flatMap(b => (b.kind === 'strength' ? b.items : []));
  const results = {};
  for (const it of strength) results[it.ex.id] = { done: true, top: true, rpe: 8, kg: 10 };
  applyProgression(s, sess, results);
  const ev = applyProgression(s, sess, results);
  const loads = ev.filter(e => e.type === 'load');
  if (!loads.length && strength.some(i => i.ex.load)) warn('nivel maximo', 'no topo da cadeia não passou a somar carga');
}

// ── 5. Mudança de objetivo agendada ───────────────────────────────────────
{
  const s = defaultState();
  const next = nextCycleStart(s.profile);
  if (!next || next <= iso(mondayOf())) warn('objetivo', `próximo ciclo inválido: ${next}`);
  const { week } = cycleInfo(s.profile);
  if (week !== 1) warn('ciclo', `ciclo novo devia começar na semana 1, deu ${week}`);
}

// ── 6. Cardio: corridas por semana e alternativas ─────────────────────────
for (const runsPerWeek of [1, 2, 3]) {
  const s = stateFor({ profile: { runsPerWeek, daysPerWeek: 7 } });
  const wk = buildWeek(s, mondayOf());
  const cardio = wk.sessions.filter(x => x.type === 'cardio');
  const runs = cardio.filter(x => x.blocks.some(b => b.items.some(i => i.ex?.chain === 'run')));
  if (runs.length > runsPerWeek) warn('cardio', `${runsPerWeek} corridas pedidas, ${runs.length} agendadas`);
  for (const c of cardio) if (!c.alternatives.length) warn('cardio', `sessão de cardio sem alternativa (runs=${runsPerWeek})`);
}
{
  const s = stateFor({ kneeFlag: true, profile: { daysPerWeek: 7 } });
  const wk = buildWeek(s, mondayOf());
  for (const c of wk.sessions.filter(x => x.type === 'cardio')) {
    const hasRun = c.blocks.some(b => b.items.some(i => i.ex?.chain === 'run'));
    if (hasRun) warn('cardio joelho', 'com joelho em cuidado ainda agenda corrida');
  }
}

// ── 7. Vídeos e dados da biblioteca ───────────────────────────────────────
for (const ex of EXERCISES) {
  if (!ex.yt && !ex.ytId) warn('video', `${ex.id} sem vídeo`);
  if (!ex.cues?.length) warn('biblioteca', `${ex.id} sem indicações`);
  if (!ex.muscles?.length) warn('biblioteca', `${ex.id} sem músculos`);
  if (ex.homeAlt && !BY_ID[ex.homeAlt]) warn('biblioteca', `${ex.id} homeAlt inválido`);
  if (ex.load && !ex.optionalLoad && !ex.equipment.includes('dumbbells')) warn('biblioteca', `${ex.id} tem carga obrigatória mas não usa halteres`);
  const lv = chainLevels(ex.chain).map(e => e.level);
  if (isProgression(ex.chain)) {
    if (new Set(lv).size !== lv.length) warn('cadeia', `${ex.chain} tem níveis repetidos: ${lv.join(',')}`);
    if (Math.min(...lv) !== 1) warn('cadeia', `${ex.chain} não começa no nível 1`);
    if (Math.max(...lv) !== lv.length) warn('cadeia', `${ex.chain} tem saltos nos níveis: ${lv.join(',')}`);
  } else if (new Set(lv).size !== 1) {
    warn('cadeia', `${ex.chain} nem é progressão nem agrupamento: ${lv.join(',')}`);
  }
}

console.log(`sessões verificadas: ${sessionsChecked}`);
if (!problems.length) console.log('sem problemas');
else {
  const seen = new Map();
  for (const p of problems) seen.set(p, (seen.get(p) || 0) + 1);
  console.log(`${problems.length} ocorrências, ${seen.size} distintas:\n`);
  for (const [p, n] of [...seen.entries()].sort()) console.log(`${n > 1 ? `(${n}x) ` : ''}${p}`);
}
