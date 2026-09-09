// Estado da app: perfil, níveis das cadeias, cargas, registos. Persistência em localStorage.
// Estrutura pensada para sincronizar com Supabase na fase 3 (cada registo tem id e updatedAt).

const KEY = 'treino.v1';

export const GOALS = {
  saude: { label: 'Saúde geral', short: 'Saúde', desc: 'Força, cardio em zona 2, mobilidade e um HIIT. O plano mais equilibrado.' },
  musculo: { label: 'Criar músculo', short: 'Músculo', desc: 'Mais dias de força e mais séries. Menos HIIT, duas corridas.' },
  gordura: { label: 'Queimar gordura', short: 'Gordura', desc: 'Circuitos densos e mais zona 2. Força mantida. A alimentação manda.' },
};

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - day);
  return d;
}

export function iso(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function defaultState() {
  return {
    schema: 1,
    onboarded: false,
    profile: {
      name: 'João',
      goal: 'saude',
      pendingGoal: null,
      daysPerWeek: 5,
      minutes: 30,
      runsPerWeek: 2,
      dumbbellMaxKg: 12,
      kneeSensitive: true,
      equipment: { dumbbells: true, board: true, rope: true, bars: true, pool: true, court: true, chair: true, wall: true, run: true, body: true },
      barsOptional: true,
      cycleStart: iso(mondayOf()),
    },
    chainLevels: {},          // chain -> nível atual (default 1)
    chainStreak: {},          // chain -> sessões consecutivas com sucesso
    chainLastDate: {},        // chain -> último dia contado (evita contar o mesmo treino duas vezes)
    loads: {},                // exerciseId -> último peso usado (kg)
    repBonus: {},             // exerciseId -> reps extra, quando a carga chegou ao teto dos halteres
    timeBonus: {},            // exerciseId -> segundos extra numa isometria no topo da cadeia
    tetoAvisado: {},          // exerciseId -> data do último aviso de comprar mais peso
    logs: [],                 // sessões registadas
    swaps: {},                // "YYYY-MM-DD" -> { exerciseId: replacementId }
    kneeFlag: false,          // joelho a queixar-se esta semana
    updatedAt: Date.now(),
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, profile: { ...defaultState().profile, ...(parsed.profile || {}) } };
  } catch {
    return defaultState();
  }
}

function persist() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem espaço ou modo privado */ }
  listeners.forEach(fn => fn(state));
}

export function getState() { return state; }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function update(mutator) {
  mutator(state);
  persist();
}

export function setProfile(patch) {
  update(s => { s.profile = { ...s.profile, ...patch }; });
}

export function resetAll() {
  state = defaultState();
  persist();
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.schema !== 1 || !parsed.profile) throw new Error('Ficheiro inválido');
  state = { ...defaultState(), ...parsed };
  persist();
}

// ---- registos ----
export function findLog(dateISO) {
  return state.logs.find(l => l.date === dateISO);
}

export function saveLog(log) {
  update(s => {
    const i = s.logs.findIndex(l => l.date === log.date);
    const entry = { ...log, id: log.id || `${log.date}-${Math.random().toString(36).slice(2, 8)}`, updatedAt: Date.now() };
    if (i >= 0) s.logs[i] = entry; else s.logs.push(entry);
    s.logs.sort((a, b) => a.date.localeCompare(b.date));
  });
}

export function setLoad(exerciseId, kg) {
  update(s => { s.loads[exerciseId] = kg; });
}
