// Motor de regras: transforma perfil + estado em plano semanal e sessões de 30 minutos.
import { EXERCISES, BY_ID, chainLevels } from '../data/exercises.js';
import { iso, mondayOf } from '../store.js';

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Semana do ciclo (1-4) e número do ciclo, a partir da data de início.
export function cycleInfo(profile, date = new Date()) {
  const start = mondayOf(new Date(profile.cycleStart));
  const monday = mondayOf(date);
  const weeks = Math.max(0, Math.round((monday - start) / (7 * 86400000)));
  return { week: (weeks % 4) + 1, cycle: Math.floor(weeks / 4) + 1, weeksSinceStart: weeks, monday };
}

export const WEEK_FOCUS = {
  1: { label: 'Adaptação', desc: 'Consolidar técnica. Reps na base do intervalo, carga confortável.' },
  2: { label: 'Volume', desc: 'Mesma carga, reps a meio do intervalo. Uma corrida tempo.' },
  3: { label: 'Intensidade', desc: 'Reps no topo do intervalo, mais uma série nos principais. Semana mais dura.' },
  4: { label: 'Deload', desc: 'Menos 40% de volume, carga a 80%. O corpo consolida. Bom dia para a piscina.' },
};

// Modelos semanais por objetivo. Cada entrada é um tipo de dia; 'rest' preenche o que sobra.
const TEMPLATES = {
  saude: {
    5: ['forcaA', 'cardio', 'forcaB', 'cardio', 'hiit', 'rest', 'rest'],
    6: ['forcaA', 'cardio', 'forcaB', 'cardio', 'hiit', 'mobilidade', 'rest'],
    7: ['forcaA', 'cardio', 'forcaB', 'cardio', 'hiit', 'mobilidade', 'ativo'],
  },
  musculo: {
    5: ['push', 'pull', 'pernas', 'cardio', 'full', 'rest', 'rest'],
    6: ['push', 'pull', 'pernas', 'cardio', 'full', 'cardio', 'rest'],
    7: ['push', 'pull', 'pernas', 'cardio', 'full', 'cardio', 'mobilidade'],
  },
  gordura: {
    5: ['circuitoA', 'cardio', 'circuitoB', 'cardio', 'hiit', 'rest', 'rest'],
    6: ['circuitoA', 'cardio', 'circuitoB', 'cardio', 'hiit', 'forcaA', 'rest'],
    7: ['circuitoA', 'cardio', 'circuitoB', 'cardio', 'hiit', 'forcaA', 'ativo'],
  },
};

export const DAY_META = {
  forcaA: { title: 'Força A', sub: 'Empurrar · Pernas · Glúteos', tone: 'strength', icon: 'A' },
  forcaB: { title: 'Força B', sub: 'Puxar · Anca · Joelho', tone: 'strength', icon: 'B' },
  push: { title: 'Push', sub: 'Peito · Ombros · Tríceps', tone: 'strength', icon: 'P' },
  pull: { title: 'Pull', sub: 'Costas · Bíceps', tone: 'strength', icon: 'L' },
  pernas: { title: 'Pernas', sub: 'Quadríceps · Glúteos · Isquios', tone: 'strength', icon: 'Q' },
  full: { title: 'Corpo inteiro', sub: 'Compostos pesados', tone: 'strength', icon: 'F' },
  circuitoA: { title: 'Circuito A', sub: 'Densidade · Corpo inteiro', tone: 'circuit', icon: 'C' },
  circuitoB: { title: 'Circuito B', sub: 'Densidade · Corpo inteiro', tone: 'circuit', icon: 'C' },
  hiit: { title: 'HIIT', sub: 'Intervalos sem impacto', tone: 'hiit', icon: 'H' },
  cardio: { title: 'Corrida', sub: 'Zona 2', tone: 'cardio', icon: 'R' },
  mobilidade: { title: 'Mobilidade + Core', sub: 'Lento e intencional', tone: 'mobility', icon: 'M' },
  ativo: { title: 'Ativo leve', sub: 'Caminhada · Basket · Piscina', tone: 'mobility', icon: '~' },
  rest: { title: 'Descanso', sub: 'Sono, água, caminhar', tone: 'rest', icon: '·' },
};

// ---------- utilitários de seleção ----------
function allowed(ex, profile, kneeFlag) {
  const eq = profile.equipment || {};
  if (!ex.equipment.every(e => eq[e] !== false)) return false;
  if (profile.kneeSensitive && ex.knee === 'avoid') return false;
  if (kneeFlag && ex.knee === 'care' && ['squat', 'knee', 'hiit', 'cardio'].includes(ex.pattern)) return false;
  return true;
}

// Exercício da cadeia ao nível atual, com recuo para o nível permitido mais alto.
export function pickFromChain(chain, state) {
  const levels = chainLevels(chain);
  if (!levels.length) return null;
  const target = Math.min(state.chainLevels[chain] || 1, levels.length);
  for (let l = target; l >= 1; l--) {
    const ex = levels.find(e => e.level === l);
    if (ex && allowed(ex, state.profile, state.kneeFlag)) return ex;
  }
  return null;
}

function pickId(id, state) {
  const ex = BY_ID[id];
  return ex && allowed(ex, state.profile, state.kneeFlag) ? ex : null;
}

function setsForWeek(week, base = 3) {
  return { 1: base, 2: base, 3: base + 1, 4: Math.max(2, base - 1) }[week];
}

function repsForWeek(ex, week) {
  if (!ex.reps) return null;
  const [lo, hi] = ex.reps;
  const mid = Math.round((lo + hi) / 2);
  return { 1: [lo, mid], 2: [mid, hi], 3: [hi, hi], 4: [lo, lo] }[week];
}

function timeForWeek(ex, week) {
  if (!ex.time) return null;
  const t = ex.time;
  return Math.round({ 1: t, 2: t * 1.15, 3: t * 1.3, 4: t * 0.7 }[week] / 5) * 5;
}

function loadHint(ex, state, week) {
  if (!ex.load) return null;
  const last = state.loads[ex.id];
  if (!last) return { kg: null, note: 'Escolhe um peso que permita o topo das reps com boa forma' };
  if (week === 4) return { kg: Math.max(2, Math.round(last * 0.8)), note: 'Deload: 80% do habitual' };
  return { kg: last, note: 'Último peso usado' };
}

function strengthItem(ex, state, week, baseSets) {
  const sets = setsForWeek(week, baseSets ?? ex.sets ?? 3);
  return {
    kind: 'strength', ex, sets,
    reps: repsForWeek(ex, week), time: timeForWeek(ex, week),
    rest: week === 4 ? Math.round(ex.rest * 0.8) : ex.rest,
    load: loadHint(ex, state, week),
    perSide: !!ex.perSide,
    homeAlt: ex.homeAlt ? BY_ID[ex.homeAlt] : null,
  };
}

function estimateStrengthSeconds(item) {
  const work = item.time ? item.time * (item.perSide ? 2 : 1) : (item.reps ? item.reps[1] * 3.2 * (item.perSide ? 2 : 1) : 40);
  return item.sets * (work + item.rest);
}

// Corta séries a partir do fim até caber no tempo disponível.
function fitToBudget(items, budgetSec) {
  let total = items.reduce((s, i) => s + estimateStrengthSeconds(i), 0);
  let idx = items.length - 1;
  let guard = 40;
  while (total > budgetSec && guard-- > 0) {
    const it = items[idx];
    if (it.sets > 2) { it.sets -= 1; total = items.reduce((s, i) => s + estimateStrengthSeconds(i), 0); }
    idx = idx - 1 < 0 ? items.length - 1 : idx - 1;
    if (items.every(i => i.sets <= 2)) break;
  }
  return items;
}

// ---------- blocos ----------
function warmupBlock(ids, state) {
  const items = ids.map(id => pickId(id, state)).filter(Boolean).map(ex => ({
    kind: 'warmup', ex, sets: 1, reps: ex.reps || null, time: ex.time || null, rest: 0, perSide: !!ex.perSide,
  }));
  return { kind: 'warmup', title: 'Aquecimento', items };
}

function cooldownBlock(ids, state) {
  const items = ids.map(id => pickId(id, state)).filter(Boolean).map(ex => ({
    kind: 'mobility', ex, sets: 1, reps: ex.reps || null, time: ex.time || null, rest: 0, perSide: !!ex.perSide,
  }));
  return { kind: 'cooldown', title: 'Arrefecimento', items };
}

function strengthBlock(title, chains, state, week, budgetSec, opts = {}) {
  const items = [];
  for (const c of chains) {
    const ex = typeof c === 'string' ? pickFromChain(c, state) : pickId(c.id, state);
    if (ex && !items.some(i => i.ex.id === ex.id)) items.push(strengthItem(ex, state, week, opts.sets));
  }
  fitToBudget(items, budgetSec);
  return { kind: 'strength', title, items };
}

function hiitBlock(state, week, budgetSec) {
  const pool = EXERCISES.filter(e => e.pattern === 'hiit' && allowed(e, state.profile, state.kneeFlag));
  // rotação determinística por semana para variar a ordem sem repetir tudo
  const rotated = [...pool.slice(week % pool.length), ...pool.slice(0, week % pool.length)];
  const between = 90;
  const wantRounds = week === 4 ? 3 : 4;
  // prefere manter as rondas e cortar exercícios (6 → 5 → 4) antes de cortar rondas
  let items = [];
  let rounds = wantRounds;
  for (const n of [6, 5, 4]) {
    items = rotated.slice(0, n).map(ex => ({ kind: 'interval', ex, work: 40, rest: 20 }));
    if (wantRounds * n * 60 + (wantRounds - 1) * between <= budgetSec) break;
  }
  while (rounds > 2 && rounds * items.length * 60 + (rounds - 1) * between > budgetSec) rounds -= 1;
  return { kind: 'hiit', title: `${rounds} rondas · 40s trabalho / 20s pausa`, items, rounds, betweenRounds: between };
}

function circuitBlock(title, ids, state, week, budgetSec) {
  const items = ids.map(id => pickId(id, state) || pickFromChain(id, state)).filter(Boolean)
    .map(ex => ({ kind: 'interval', ex, work: 40, rest: 15, load: loadHint(ex, state, week) }));
  const between = 60;
  let rounds = week === 4 ? 2 : (week === 3 ? 4 : 3);
  const per = items.length * 55;
  while (rounds > 2 && rounds * per + (rounds - 1) * between > budgetSec) rounds -= 1;
  return { kind: 'circuit', title: `${title} · ${rounds} rondas · 40s / 15s`, items, rounds, betweenRounds: between };
}

function cardioBlock(ex, minutes, note) {
  return { kind: 'cardio', title: ex.name, items: [{ kind: 'cardio', ex, time: minutes * 60, note }] };
}

function mobilityBlock(ids, state) {
  const items = ids.map(id => pickId(id, state)).filter(Boolean).map(ex => ({
    kind: 'mobility', ex, sets: 1, reps: ex.reps || null, time: ex.time || null, rest: 0, perSide: !!ex.perSide,
  }));
  return { kind: 'mobility', title: 'Mobilidade', items };
}

// ---------- sessões ----------
function buildSession(type, state, week, dateISO, cardioIndex) {
  const p = state.profile;
  const total = p.minutes * 60;
  const meta = DAY_META[type];
  const s = { date: dateISO, type, title: meta.title, subtitle: meta.sub, tone: meta.tone, week, blocks: [], notes: [], alternatives: [] };
  const altB = (chainA, chainB) => (week % 2 === 1 ? chainA : chainB);

  switch (type) {
    case 'forcaA': {
      s.blocks.push(warmupBlock(['arm-circles', 'hip-circles', 'slow-pushup'], state));
      s.blocks.push(strengthBlock('Principal', ['pushup', 'squat', 'thrust', 'press'], state, week, total - 6 * 60));
      s.blocks.push(strengthBlock('Core', [altB('antiext', 'plank')], state, week, 3 * 60, { sets: 2 }));
      s.blocks.push(cooldownBlock(['hip-flexor-stretch', 'downdog-cobra'], state));
      break;
    }
    case 'forcaB': {
      s.blocks.push(warmupBlock(['arm-circles', 'towel-pull-apart', 'hip-circles'], state));
      s.blocks.push(strengthBlock('Principal', ['row', 'hinge', 'lunge', altB('kneeiso', 'stepdown')], state, week, total - 6 * 60));
      s.blocks.push(strengthBlock('Core', [altB('sideplank', 'birddog')], state, week, 3 * 60, { sets: 2 }));
      s.blocks.push(cooldownBlock(['figure-four', 'hamstring-stretch'], state));
      s.notes.push('Se as barras estiverem ocupadas, cada exercício de barra tem versão em casa. Toca no exercício para trocar.');
      break;
    }
    case 'push': {
      s.blocks.push(warmupBlock(['arm-circles', 'slow-pushup'], state));
      s.blocks.push(strengthBlock('Principal', ['pushup', 'press', 'dips', 'pike', 'lateral'], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['thoracic-rotation'], state));
      break;
    }
    case 'pull': {
      s.blocks.push(warmupBlock(['arm-circles', 'towel-pull-apart'], state));
      s.blocks.push(strengthBlock('Principal', ['row', 'curl', 'reardelt', 'backext', 'hangcore'], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['cat-cow'], state));
      break;
    }
    case 'pernas': {
      s.blocks.push(warmupBlock(['hip-circles', 'bw-squat-warm'], state));
      s.blocks.push(strengthBlock('Principal', ['squat', 'hinge', 'lunge', 'thrust', altB('calf', 'stepdown')], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['hip-flexor-stretch', 'figure-four'], state));
      s.notes.push('Prioridade: joelho alinhado em todas as repetições. Se doer, troca por wall sit.');
      break;
    }
    case 'full': {
      s.blocks.push(warmupBlock(['march-in-place', 'arm-circles', 'hip-circles'], state));
      s.blocks.push(strengthBlock('Principal', ['swing', 'pushup', 'row', 'squat', 'antiext'], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['worlds-greatest'], state));
      break;
    }
    case 'circuitoA': {
      s.blocks.push(warmupBlock(['march-in-place', 'hip-circles'], state));
      s.blocks.push(circuitBlock('Circuito', ['goblet-squat', 'pushup-board', 'db-swing', 'db-row-1arm', 'mountain-climber-slow', 'plank'], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['hip-flexor-stretch', 'diaphragm-breathing'], state));
      s.notes.push('Perder gordura decide-se na cozinha. O treino mantém o músculo e acelera o resto.');
      break;
    }
    case 'circuitoB': {
      s.blocks.push(warmupBlock(['march-in-place', 'arm-circles'], state));
      s.blocks.push(circuitBlock('Circuito', ['reverse-lunge', 'db-press-standing', 'db-rdl', 'renegade-row', 'shadow-boxing', 'dead-bug'], state, week, total - 5 * 60));
      s.blocks.push(cooldownBlock(['figure-four', 'hamstring-stretch'], state));
      break;
    }
    case 'hiit': {
      s.blocks.push(warmupBlock(['march-in-place', 'hip-circles'], state));
      s.blocks.push(hiitBlock(state, week, total - 4 * 60));
      s.blocks.push(cooldownBlock(['diaphragm-breathing'], state));
      s.notes.push('Sem saltos. Escolhe pesos que aguentes com forma perfeita os 40 segundos inteiros.');
      break;
    }
    case 'cardio': {
      const minutes = p.minutes;
      const wantsTempo = cardioIndex === 1 && (week === 2 || week === 3);
      const runsAllowed = p.runsPerWeek ?? 2;
      const deloadSwim = week === 4 && cardioIndex >= 1;
      let ex = BY_ID['run-z2'];
      let note = 'Zona 2: consegues falar. Mais lento do que te apetece.';
      if (cardioIndex >= runsAllowed || state.kneeFlag || deloadSwim) {
        ex = BY_ID['swim-easy'];
        note = state.kneeFlag ? 'Joelho a queixar-se: hoje a piscina substitui a corrida.' : 'Semana de deload ou corridas já feitas: piscina, zero impacto.';
        s.alternatives.push({ label: 'Trocar por corrida zona 2', session: { blockOverride: cardioBlock(BY_ID['run-z2'], minutes, 'Se o joelho permitir.') } });
      } else if (wantsTempo) {
        ex = BY_ID['run-tempo'];
        note = '5 min fáceis · 15 min firmes · 5 min fáceis. Só uma por semana.';
      }
      s.title = ex.pattern === 'cardio' && ex.chain === 'swim' ? 'Natação' : (ex.id === 'run-tempo' ? 'Corrida tempo' : 'Corrida zona 2');
      s.subtitle = ex.id === 'swim-easy' ? 'Contínua · zero impacto' : (ex.id === 'run-tempo' ? 'Piso regular · ritmo firme' : 'Piso regular · conversável');
      s.blocks.push(warmupBlock(['hip-circles', 'ankle-mobility'], state));
      s.blocks.push(cardioBlock(ex, minutes - 5, note));
      s.blocks.push(cooldownBlock(['hamstring-stretch', 'hip-flexor-stretch'], state));
      if (ex.id !== 'swim-easy') {
        s.alternatives.push({ label: 'Trocar por natação', session: { blockOverride: cardioBlock(BY_ID['swim-easy'], minutes - 5, 'Zero impacto. Boa escolha.') } });
      }
      break;
    }
    case 'mobilidade': {
      s.blocks.push(mobilityBlock(['cat-cow', 'worlds-greatest', 'ninety-ninety', 'hip-flexor-stretch', 'thoracic-rotation', 'deep-squat-hold', 'ankle-mobility'], state));
      s.blocks.push(strengthBlock('Core', ['antiext', 'sideplank', 'birddog'], state, week, 8 * 60, { sets: 2 }));
      s.blocks.push(cooldownBlock(['diaphragm-breathing'], state));
      break;
    }
    case 'ativo': {
      const walk = BY_ID['walk-brisk'];
      s.blocks.push(cardioBlock(walk, p.minutes, 'Ritmo que aqueça sem ofegar. Ou escolhe outra opção em baixo.'));
      s.alternatives.push({ label: 'Basket livre', session: { blockOverride: cardioBlock(BY_ID['basket-shoot'], p.minutes, 'Sem saltos nem travagens bruscas.') } });
      s.alternatives.push({ label: 'Natação leve', session: { blockOverride: cardioBlock(BY_ID['swim-easy'], p.minutes, 'Zero impacto.') } });
      break;
    }
    case 'rest':
    default: {
      s.blocks = [];
      s.notes.push('Sem treino estruturado. Caminhada leve, água e sono.');
    }
  }

  s.estMinutes = estimateMinutes(s);
  return s;
}

export function estimateMinutes(session) {
  let sec = 0;
  for (const b of session.blocks) {
    if (b.kind === 'hiit' || b.kind === 'circuit') {
      sec += b.rounds * b.items.reduce((a, i) => a + i.work + i.rest, 0) + (b.rounds - 1) * b.betweenRounds;
    } else if (b.kind === 'cardio') {
      sec += b.items.reduce((a, i) => a + i.time, 0);
    } else {
      for (const i of b.items) {
        if (i.kind === 'strength') sec += estimateStrengthSeconds(i);
        else sec += (i.time || (i.reps ? i.reps[1] * 3 : 30)) * (i.perSide ? 2 : 1) + 10;
      }
    }
  }
  return Math.round(sec / 60);
}

// ---------- semana ----------
export function buildWeek(state, date = new Date()) {
  const p = state.profile;
  const { week, cycle, monday } = cycleInfo(p, date);
  const days = Math.min(7, Math.max(5, p.daysPerWeek || 5));
  const template = TEMPLATES[p.goal]?.[days] || TEMPLATES.saude[5];
  let cardioIndex = 0;
  const sessions = template.map((type, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const dateISO = iso(d);
    const sess = buildSession(type, state, week, dateISO, type === 'cardio' ? cardioIndex : 0);
    if (type === 'cardio') cardioIndex += 1;
    sess.weekday = WEEKDAYS[i];
    sess.weekdayShort = WEEKDAYS_SHORT[i];
    sess.dayIndex = i;
    return sess;
  });
  return { week, cycle, monday, focus: WEEK_FOCUS[week], sessions };
}

export function sessionFor(state, date = new Date()) {
  const wk = buildWeek(state, date);
  const idx = (new Date(date).getDay() + 6) % 7;
  return { ...wk.sessions[idx], weekInfo: { week: wk.week, cycle: wk.cycle, focus: wk.focus } };
}

// Aplica mudança de objetivo agendada quando começa um novo ciclo.
export function applyPendingGoal(state, date = new Date()) {
  const p = state.profile;
  if (!p.pendingGoal || !p.pendingGoalFrom) return false;
  if (iso(mondayOf(date)) >= p.pendingGoalFrom) {
    p.goal = p.pendingGoal;
    p.pendingGoal = null;
    p.pendingGoalFrom = null;
    p.cycleStart = iso(mondayOf(date));
    return true;
  }
  return false;
}

export function nextCycleStart(profile, date = new Date()) {
  const { week, monday } = cycleInfo(profile, date);
  const d = new Date(monday);
  d.setDate(d.getDate() + (4 - week + 1) * 7);
  return iso(d);
}
