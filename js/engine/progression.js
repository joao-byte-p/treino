// Progressão: lê o registo de uma sessão e decide subidas de nível ou de carga.
// Regra: duas sessões consecutivas com todas as séries feitas, topo das reps atingido e esforço ≤ "Duro" → progride.
// No teto dos halteres a carga para de subir e passa a subir as repetições: pedir 16 kg
// a quem tem halteres de 12 é dar um conselho que não se pode seguir.
import { chainLevels } from '../data/exercises.js';

export const BONUS_MAX = 6; // reps extra antes de a única saída ser comprar peso

export const RPE = [
  { value: 6, label: 'Fácil', hint: 'Sobravam 4+ reps' },
  { value: 8, label: 'Bom', hint: 'Sobravam 2 a 3 reps' },
  { value: 9, label: 'Duro', hint: 'Sobrava 1 rep' },
  { value: 10, label: 'Máximo', hint: 'Não fazia mais nenhuma' },
];

// results: { [exerciseId]: { done: bool, top: bool, rpe: number|null, kg: number|null } }
// Idempotente por dia: guardar o mesmo treino outra vez (botão "repetir ou rever")
// corrige as cargas mas NÃO conta como sessão nova, senão saltavam-se níveis.
export function applyProgression(state, session, results) {
  const events = [];
  const strengthItems = session.blocks.flatMap(b => b.kind === 'strength' ? b.items : []);
  if (!state.chainLastDate) state.chainLastDate = {};

  for (const item of strengthItems) {
    const ex = item.ex;
    const r = results[ex.id];
    if (!r) continue;
    if (r.kg != null && ex.load) state.loads[ex.id] = r.kg;

    const chain = ex.chain;
    if (state.chainLastDate[chain] === session.date) continue; // este dia já foi contado
    state.chainLastDate[chain] = session.date;

    const success = r.done && r.top !== false && (r.rpe == null || r.rpe <= 9);
    const hardFail = !r.done || r.rpe === 10;

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
        const teto = state.profile?.dumbbellMaxKg || 12;
        const atual = state.loads[ex.id] || 0;
        if (!state.repBonus) state.repBonus = {};
        if (atual + 2 <= teto) {
          state.loads[ex.id] = atual + 2;
          state.chainStreak[chain] = 0;
          events.push({ type: 'load', chain, ex: ex.name, kg: atual + 2 });
        } else {
          // no teto: sobem as repetições, até deixar de fazer sentido chamar-lhe força
          const bonus = state.repBonus[ex.id] || 0;
          if (bonus < BONUS_MAX) {
            state.repBonus[ex.id] = bonus + 2;
            state.chainStreak[chain] = 0;
            events.push({ type: 'reps', chain, ex: ex.name, bonus: bonus + 2, teto });
          } else {
            // a partir daqui a app não tem mais nada a oferecer sem material novo.
            // Diz-se uma vez e volta a dizer-se dois meses depois: repetir de duas em
            // duas semanas transforma um conselho útil em ruído que se aprende a ignorar.
            state.chainStreak[chain] = 0;
            if (!state.tetoAvisado) state.tetoAvisado = {};
            const antes = state.tetoAvisado[ex.id];
            const agora = Date.parse(session.date);
            if (!antes || !Number.isFinite(agora) || agora - Date.parse(antes) > 60 * 864e5) {
              state.tetoAvisado[ex.id] = session.date;
              events.push({ type: 'comprar', chain, ex: ex.name, teto, bonus });
            }
          }
        }
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
