// Auditoria da sessão guiada e do armazenamento.
import { buildWeek, sessionFor } from '../js/engine/planner.js';
import { buildSteps } from '../js/ui/session.js';
import { defaultState, mondayOf, iso, GOALS } from '../js/store.js';

const problems = [];
const warn = (t, m) => problems.push(`${t.padEnd(20)} ${m}`);

let steps = 0, sessions = 0;
for (const goal of Object.keys(GOALS)) {
  for (const daysPerWeek of [5, 6, 7]) {
    for (const weekOffset of [0, 1, 2, 3]) {
      const s = defaultState();
      s.profile.goal = goal; s.profile.daysPerWeek = daysPerWeek;
      const d = new Date(mondayOf()); d.setDate(d.getDate() + weekOffset * 7);
      const wk = buildWeek(s, d);
      for (const sess of wk.sessions) {
        if (sess.type === 'rest') continue;
        sessions++;
        let st;
        try { st = buildSteps(sess); } catch (e) { warn('buildSteps', `${goal}/${daysPerWeek}d/S${wk.week} ${sess.type}: ${e.message}`); continue; }
        steps += st.length;
        if (!st.length) { warn('sem passos', `${goal}/${daysPerWeek}d/S${wk.week} ${sess.type}`); continue; }
        for (const [i, x] of st.entries()) {
          const where = `${goal}/${daysPerWeek}d/S${wk.week} ${sess.type} passo ${i + 1}`;
          if (x.type === 'work' && !x.ex) warn('passo sem exercicio', where);
          if (x.type === 'rest' && (!x.seconds || x.seconds <= 0)) warn('pausa invalida', `${where}: ${x.seconds}s`);
          if (x.mode === 'time' && (!x.seconds || x.seconds <= 0)) warn('tempo invalido', `${where}: ${x.seconds}s`);
          if (x.mode === 'reps' && !x.reps) warn('reps em falta', where);
          if (x.mode === 'cardio' && (!x.seconds || x.seconds < 60)) warn('cardio curto', `${where}: ${x.seconds}s`);
        }
        // o último passo não deve ser uma pausa
        if (st[st.length - 1].type === 'rest') warn('acaba em pausa', `${goal}/${daysPerWeek}d/S${wk.week} ${sess.type}`);
        // soma dos passos ~ estimativa mostrada
        const total = st.reduce((a, x) => a + (x.seconds || (x.reps ? x.reps[1] * 3 : 0)), 0) / 60;
        if (Math.abs(total - sess.estMinutes) > sess.estMinutes * 0.5 + 4) {
          warn('estimativa errada', `${goal}/${daysPerWeek}d/S${wk.week} ${sess.type}: passos ${Math.round(total)} min vs mostrado ${sess.estMinutes} min`);
        }
      }
    }
  }
}

// armazenamento: ida e volta
{
  const s = defaultState();
  s.logs.push({ date: iso(new Date()), type: 'forcaA', completed: true, minutes: 30, results: { 'goblet-squat': { done: true, top: true, rpe: 8, kg: 12 } } });
  s.loads['goblet-squat'] = 12; s.chainLevels.squat = 2;
  const text = JSON.stringify(s, null, 2);
  const back = JSON.parse(text);
  if (back.schema !== 1) warn('store', 'schema perdido');
  if (back.loads['goblet-squat'] !== 12) warn('store', 'cargas perdidas');
  if (back.logs.length !== 1) warn('store', 'registos perdidos');
}

// fuso horário: a segunda-feira tem de ser a mesma em todo o dia
{
  for (const h of [0, 1, 12, 23]) {
    const d = new Date(); d.setHours(h, 30, 0, 0);
    const m = iso(mondayOf(d));
    const s = defaultState();
    const sess = sessionFor(s, d);
    const expected = (d.getDay() + 6) % 7;
    const wk = buildWeek(s, d);
    if (wk.sessions[expected].date !== sess.date) warn('fuso', `às ${h}h o dia de hoje não bate: ${sess.date} vs ${wk.sessions[expected].date}`);
    if (m !== iso(mondayOf(new Date(m)))) warn('fuso', `segunda instável às ${h}h`);
  }
}

console.log(`sessões: ${sessions}, passos: ${steps}`);
if (!problems.length) console.log('sem problemas');
else {
  const seen = new Map();
  for (const p of problems) seen.set(p, (seen.get(p) || 0) + 1);
  console.log(`${problems.length} ocorrências, ${seen.size} distintas:\n`);
  for (const [p, n] of [...seen.entries()].sort()) console.log(`${n > 1 ? `(${n}x) ` : ''}${p}`);
}
