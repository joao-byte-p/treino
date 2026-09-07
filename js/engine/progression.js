// Progressão: lê o registo de uma sessão e decide subidas de nível ou de carga.
// Regra: duas sessões consecutivas com todas as séries feitas, topo das reps atingido e esforço ≤ "Duro" → progride.
import { chainLevels } from '../data/exercises.js';

export const RPE = [
  { value: 6, label: 'Fácil', hint: 'Sobravam 4+ reps' },
  { value: 8, label: 'Bom', hint: 'Sobravam 2 a 3 reps' },
  { value: 9, label: 'Duro', hint: 'Sobrava 1 rep' },
  { value: 10, label: 'Máximo', hint: 'Não fazia mais nenhuma' },
];

// results: { [exerciseId]: { done: bool, top: bool, rpe: number|null, kg: number|null } }
export function applyProgression(state, session, results) {
  const events = [];
  const strengthItems = session.blocks.flatMap(b => b.kind === 'strength' ? b.items : []);

  for (const item of strengthItems) {
    const ex = item.ex;
    const r = results[ex.id];
    if (!r) continue;
    if (r.kg != null && ex.load) state.loads[ex.id] = r.kg;

    const success = r.done && r.top !== false && (r.rpe == null || r.rpe <= 9);
    const hardFail = !r.done || r.rpe === 10;
    const chain = ex.chain;

    if (success) {
      state.chainStreak[chain] = (state.chainStreak[chain] || 0) + 1;
    } else if (hardFail) {
      state.chainStreak[chain] = 0;
    }

    if ((state.chainStreak[chain] || 0) >= 2 && session.week !== 4) {
      const levels = chainLevels(chain);
      const current = state.chainLevels[chain] || 1;
      const next = levels.find(l => l.level === current + 1);
      if (next) {
        state.chainLevels[chain] = current + 1;
        state.chainStreak[chain] = 0;
        events.push({ type: 'level', chain, from: ex.name, to: next.name });
      } else if (ex.load) {
        const kg = (state.loads[ex.id] || 0) + 2;
        state.loads[ex.id] = kg;
        state.chainStreak[chain] = 0;
        events.push({ type: 'load', chain, ex: ex.name, kg });
      }
    }
  }
  return events;
}

export function levelSummary(state) {
  const chains = {};
  for (const [chain, lvl] of Object.entries(state.chainLevels)) {
    const levels = chainLevels(chain);
    chains[chain] = { level: lvl, max: levels.length, current: levels.find(l => l.level === lvl) };
  }
  return chains;
}
