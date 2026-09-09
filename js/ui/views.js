import { getState, setProfile, update, findLog, GOALS, exportJSON, importJSON, resetAll, iso } from '../store.js';
import { buildWeek, sessionFor, WEEK_FOCUS, nextCycleStart, cycleInfo, DAY_META } from '../engine/planner.js';
import { EXERCISES, BY_ID, chainLevels, isProgression, PATTERN_LABEL } from '../data/exercises.js';
import { esc, ring, exerciseRow, illustration, chip, patternLabel, equipmentLabel, ytUrl, dateLabel, toast, prescription } from './components.js';
import { hasPose, stepsStrip, frameCount, prefersStill } from './figure.js';
import { CONFIG } from '../config.js';

// ─────────────────────────── HOJE ───────────────────────────
export function renderHome(nav) {
  const state = getState();
  const today = new Date();
  const s = sessionFor(state, today);
  const log = findLog(s.date);
  const wk = buildWeek(state, today);
  const planned = wk.sessions.filter(x => x.type !== 'rest').length;
  const doneThisWeek = wk.sessions.filter(x => findLog(x.date)?.completed).length;
  const p = state.profile;

  const goalNotice = p.pendingGoal ? `
    <div class="notice">
      <strong>Objetivo agendado:</strong> ${esc(GOALS[p.pendingGoal].label)} a partir de ${esc(fmtDate(p.pendingGoalFrom))}, no início do próximo ciclo.
    </div>` : '';

  const kneeNotice = state.kneeFlag ? `<div class="notice notice-warn">Joelho em modo cuidado: sem corrida nem exercícios de impacto esta semana. Desliga nas Definições quando estiver bem.</div>` : '';

  let main;
  if (s.type === 'rest') {
    main = `
      <section class="card card-rest">
        <div class="card-kicker">Hoje</div>
        <h2 class="card-title">Descanso</h2>
        <p class="muted">Sem treino estruturado. Caminhada leve, água e sono. O músculo constrói-se hoje.</p>
      </section>`;
  } else if (log?.completed) {
    main = `
      <section class="card card-done">
        <div class="card-kicker">Hoje · feito</div>
        <h2 class="card-title">${esc(s.title)}</h2>
        <p class="muted">${esc(log.summary || 'Sessão registada.')}</p>
        ${log.events?.length ? `<ul class="events">${log.events.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
        <button class="btn btn-ghost" data-nav="session" data-date="${s.date}">Repetir ou rever</button>
      </section>`;
  } else {
    const mainBlock = s.blocks.find(b => ['strength', 'hiit', 'circuit', 'cardio', 'mobility'].includes(b.kind));
    const preview = mainBlock ? mainBlock.items.slice(0, 6).map(i => `<li>${esc(i.ex.name)}<span>${esc(prescription(i))}</span></li>`).join('') : '';
    main = `
      <section class="card card-today tone-${s.tone}">
        <div class="card-kicker">Hoje · ${esc(s.weekday)}</div>
        <h2 class="card-title">${esc(s.title)}</h2>
        <div class="card-sub">${esc(s.subtitle)}</div>
        <div class="stats">
          <div class="stat"><span class="stat-n">${s.estMinutes}</span><span class="stat-l">min</span></div>
          <div class="stat"><span class="stat-n">${mainBlock ? mainBlock.items.length : 0}</span><span class="stat-l">${mainBlock && mainBlock.items.length === 1 ? 'exercício' : 'exercícios'}</span></div>
          <div class="stat"><span class="stat-n">S${wk.week}</span><span class="stat-l">${esc(wk.focus.label)}</span></div>
        </div>
        <ul class="preview">${preview}</ul>
        ${s.notes.length ? `<p class="note">${esc(s.notes[0])}</p>` : ''}
        <button class="btn btn-primary btn-big" data-nav="session" data-date="${s.date}">Começar sessão</button>
        ${s.alternatives.map((a, i) => `<button class="btn btn-ghost" data-nav="session" data-date="${s.date}" data-alt="${i}">${esc(a.label)}</button>`).join('')}
      </section>`;
  }

  return `
  <header class="top">
    <div>
      <div class="eyebrow">${esc(dateLabel(today))}</div>
      <h1>Olá, ${esc(p.name)}</h1>
    </div>
    <div class="ringwrap">
      ${ring(planned ? doneThisWeek / planned : 0, { size: 60, stroke: 6, label: 'Semana' })}
      <div class="ringnum">${doneThisWeek}<small>/${planned}</small></div>
    </div>
  </header>
  ${goalNotice}${kneeNotice}
  <div class="wide2">
  ${main}
  <section class="card card-week">
    <div class="row-between">
      <div><div class="card-kicker">Ciclo ${wk.cycle} · Semana ${wk.week}</div><h3>${esc(wk.focus.label)}</h3></div>
      <div class="dots">${[1, 2, 3, 4].map(n => `<span class="dot ${n < wk.week ? 'past' : ''} ${n === wk.week ? 'now' : ''} ${n === 4 ? 'deload' : ''}"></span>`).join('')}</div>
    </div>
    <p class="muted">${esc(wk.focus.desc)}</p>
    <ol class="weekstrip">
      ${wk.sessions.map(x => {
        const l = findLog(x.date);
        const isToday = x.date === s.date;
        const cls = [x.type === 'rest' ? 'rest' : '', l?.completed ? 'done' : '', isToday ? 'today' : '', x.date < s.date && !l?.completed && x.type !== 'rest' ? 'missed' : ''].join(' ');
        return `<li class="${cls}" data-nav="day" data-date="${x.date}" role="button" tabindex="0" aria-label="${esc(x.weekday)}: ${esc(x.title)}"><span class="ws-d">${esc(x.weekdayShort)}</span><span class="ws-i" aria-hidden="true">${esc(DAY_META[x.type].icon)}</span></li>`;
      }).join('')}
    </ol>
  </section>
  </div>`;
}

// ─────────────────────────── PLANO ───────────────────────────
export function renderPlan(nav, offsetWeeks = 0) {
  const state = getState();
  const d = new Date(); d.setDate(d.getDate() + offsetWeeks * 7);
  const wk = buildWeek(state, d);
  const todayISO = iso(new Date());
  const rows = wk.sessions.map(s => {
    const l = findLog(s.date);
    const status = s.type === 'rest' ? '' : l?.completed ? 'done' : (s.date < todayISO ? 'missed' : (s.date === todayISO ? 'today' : ''));
    const mainBlock = s.blocks.find(b => ['strength', 'hiit', 'circuit', 'cardio', 'mobility'].includes(b.kind));
    const n = mainBlock && s.type !== 'rest' && s.type !== 'cardio' ? `${mainBlock.items.length} ${mainBlock.items.length === 1 ? 'exercício' : 'exercícios'} · ` : '';
    // o círculo diz apenas estado: um número aqui lia-se como aviso
    const mark = status === 'done' ? '<span class="dayrow-status done">✓</span>'
      : status === 'missed' ? '<span class="dayrow-status missed">—</span>'
      : status === 'today' ? '<span class="dayrow-status today"></span>' : '';
    return `
    <li class="dayrow ${status} tone-${s.tone}" data-nav="day" data-date="${s.date}" role="button" tabindex="0" aria-label="${esc(s.weekday)}: ${esc(s.title)}">
      <div class="dayrow-date"><span>${esc(s.weekdayShort)}</span><strong>${new Date(s.date).getDate()}</strong></div>
      <div class="dayrow-body">
        <div class="dayrow-title">${esc(s.title)}</div>
        <div class="dayrow-sub">${s.type === 'rest' ? esc(s.subtitle) : `${s.estMinutes} min · ${n}${esc(s.subtitle)}`}</div>
      </div>
      ${mark}
    </li>`;
  }).join('');

  const monday = wk.monday;
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return `
  <header class="top">
    <div><div class="eyebrow">Plano · ciclo ${wk.cycle}</div><h1 class="tight">Semana ${wk.week} <small class="muted">de 4</small></h1></div>
    <div class="weeknav">
      <button class="iconbtn" data-plan-offset="${offsetWeeks - 1}" aria-label="Semana anterior">‹</button>
      <span class="weeknav-label">${monday.getDate()}–${sunday.getDate()} ${esc(sunday.toLocaleDateString('pt-PT', { month: 'short' }))}</span>
      <button class="iconbtn" data-plan-offset="${offsetWeeks + 1}" aria-label="Semana seguinte">›</button>
    </div>
  </header>
  <section class="card focus">
    <div class="row-between"><h3>${esc(wk.focus.label)}</h3></div>
    <p class="muted">${esc(wk.focus.desc)}</p>
  </section>
  <ol class="days">${rows}</ol>
  <p class="foot muted">Objetivo atual: <strong>${esc(GOALS[state.profile.goal].label)}</strong> · ${state.profile.daysPerWeek} dias · ${state.profile.minutes} min</p>`;
}

export function renderDay(nav, dateISO, altIndex = null) {
  const state = getState();
  const s = sessionFor(state, new Date(dateISO));
  applyAlt(s, altIndex);
  const log = findLog(dateISO);
  const blocks = s.blocks.map(b => `
    <section class="block">
      <h3 class="block-title">${esc(b.title)}${b.rounds ? '' : ''}</h3>
      <ul class="exlist">${b.items.map(i => exerciseRow(i, { swappable: true, linked: true })).join('')}</ul>
    </section>`).join('');
  return `
  <header class="top">
    <button class="iconbtn" data-nav="back" aria-label="Voltar">‹</button>
    <div><div class="eyebrow">${esc(s.weekday)} · ${esc(fmtDate(dateISO))}</div><h1>${esc(s.title)}</h1></div>
  </header>
  <p class="lead">${esc(s.subtitle)} · ${s.estMinutes} min · Semana ${s.weekInfo.week}, ${esc(s.weekInfo.focus.label)}</p>
  ${s.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
  ${log?.completed ? `<div class="notice">Feito. ${esc(log.summary || '')}</div>` : ''}
  ${blocks}
  ${s.type !== 'rest' ? `<div class="actions">
    <button class="btn btn-primary btn-big" data-nav="session" data-date="${dateISO}" ${altIndex != null ? `data-alt="${altIndex}"` : ''}>Começar</button>
    ${s.alternatives.map((a, i) => `<button class="btn btn-ghost" data-nav="day" data-date="${dateISO}" data-alt="${i}">${esc(a.label)}</button>`).join('')}
  </div>` : ''}`;
}

export function applyAlt(session, altIndex) {
  if (altIndex == null || !session.alternatives?.[altIndex]) return session;
  const alt = session.alternatives[altIndex];
  if (alt.session?.blockOverride) {
    const i = session.blocks.findIndex(b => b.kind === 'cardio');
    if (i >= 0) session.blocks[i] = alt.session.blockOverride; else session.blocks.push(alt.session.blockOverride);
    session.title = alt.session.blockOverride.title;
  }
  return session;
}

// ─────────────────────────── BIBLIOTECA ───────────────────────────
export function renderLibrary(nav, query = '', filter = 'todos', onlyMine = false) {
  const state = getState();
  const q = query.trim().toLowerCase();
  const eq = state.profile.equipment || {};
  const order = ['push', 'pull', 'squat', 'knee', 'hinge', 'glute', 'core', 'hiit', 'cardio', 'mobility', 'warmup'];
  const matches = e => (!q || e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q) || e.muscles.join(' ').toLowerCase().includes(q))
    && (filter === 'todos' || e.pattern === filter)
    && (!onlyMine || e.equipment.every(k => eq[k] !== false));
  const groups = order.map(p => ({ p, items: EXERCISES.filter(e => e.pattern === p && matches(e)) })).filter(g => g.items.length);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const chips = ['todos', ...order].map(p => `<button class="fchip ${filter === p ? 'on' : ''}" data-lib-filter="${p}">${p === 'todos' ? 'Todos' : esc(PATTERN_LABEL[p])}</button>`).join('');
  return `
  <header class="top"><div><div class="eyebrow">Biblioteca</div><h1>${total} ${total === 1 ? 'exercício' : 'exercícios'}</h1></div></header>
  <input class="search" type="search" placeholder="Procurar exercício ou músculo" value="${esc(query)}" data-lib-search aria-label="Procurar">
  <div class="fchips" role="group" aria-label="Filtrar por tipo">${chips}</div>
  <label class="toggle small only-mine"><input type="checkbox" data-lib-mine ${onlyMine ? 'checked' : ''}><span>Só com o material que tenho</span></label>
  ${total ? groups.map(g => `
    <section class="block">
      <h3 class="block-title">${esc(PATTERN_LABEL[g.p])} <span class="muted">${g.items.length}</span></h3>
      <ul class="exlist">${g.items.map(ex => {
        const prog = isProgression(ex.chain);
        const lvl = state.chainLevels[ex.chain] || 1;
        const isCurrent = ex.level === Math.min(lvl, chainLevels(ex.chain).length);
        return `<li class="exrow" data-nav="exercise" data-ex="${ex.id}" role="button" tabindex="0" aria-label="Ver ${esc(ex.name)}">
          <div class="exrow-thumb lg" aria-hidden="true">${illustration(ex, 56)}</div>
          <div class="exrow-body"><div class="exrow-name">${esc(ex.name)}</div><div class="exrow-meta">${esc(ex.muscles.slice(0, 2).join(' · '))}</div></div>
          <div class="exrow-right">${prog ? `<span class="pill ${isCurrent ? 'pill-now' : ''}">N${ex.level}</span>` : ''}</div>
        </li>`;
      }).join('')}</ul>
    </section>`).join('') : '<p class="foot muted">Nada encontrado. Limpa a procura ou muda o filtro.</p>'}`;
}

// Legenda da figura. Nas isometrias não há movimento para parar, por isso em vez do
// botão explica-se que a posição é fixa. O rótulo do botão vem sempre do estado, para
// não ficar a dizer "Parar" quando o movimento já está parado.
function figCaption(ex, state) {
  if (frameCount(ex.id) < 2) {
    return `<span class="hero-still">Posição fixa${ex.time ? `, mantida ${ex.time} segundos` : ''}. A figura não se move porque o exercício também não.</span>`;
  }
  if (prefersStill()) {
    return '<span class="hero-still">Figura parada: o sistema tem o movimento reduzido ligado.</span>';
  }
  const parada = state.profile.animate === false;
  return `<button class="link hero-toggle" data-anim-toggle aria-pressed="${parada}">${parada ? 'Retomar o movimento' : 'Parar o movimento'}</button>`;
}

export function renderExercise(nav, id) {
  const state = getState();
  const ex = BY_ID[id];
  if (!ex) return `<p>Exercício não encontrado.</p>`;
  const levels = chainLevels(ex.chain);
  const cur = Math.min(state.chainLevels[ex.chain] || 1, levels.length);
  const load = state.loads[ex.id];
  const rx = ex.reps ? `${ex.sets || 1} × ${ex.reps[0]}–${ex.reps[1]}${ex.perSide ? ' por lado' : ''}` : ex.time ? `${ex.sets || 1} × ${ex.time}s${ex.perSide ? ' por lado' : ''}` : '';
  return `
  <header class="top">
    <button class="iconbtn" data-nav="back" aria-label="Voltar">‹</button>
    <div><div class="eyebrow">${esc(patternLabel(ex.pattern))}</div><h1>${esc(ex.name)}</h1></div>
  </header>
  <p class="lead">${esc(ex.nameEn)} · ${esc(ex.muscles.join(' · '))}</p>
  ${ex.knee === 'care' ? `<div class="notice notice-warn"><strong>Atenção ao joelho.</strong> ${esc(ex.mistakes.find(m => /joelho/i.test(m)) || 'Joelho alinhado com o pé em todas as repetições. Se doer, para.')}</div>` : ''}
  ${hasPose(ex.id) ? `<figure class="hero"><div class="hero-fig" data-fig="${ex.id}"></div>
      <figcaption class="hero-cap">${figCaption(ex, state)}</figcaption></figure>`
    : `<figure class="hero"><div class="hero-ph">${illustration(ex, 150)}<span>Ilustração a caminho. Por agora, o vídeo e os passos abaixo.</span></div></figure>`}
  <div class="chips">${rx ? chip(rx) : ''}${ex.rest ? chip(`${ex.rest}s pausa`) : ''}${ex.tempo ? chip(ex.tempo) : ''}${load ? chip(`${load} kg`, 'chip-load') : ''}${ex.optionalLoad ? chip('Peso opcional') : ''}</div>
  ${hasPose(ex.id) ? `<section class="block"><h3 class="block-title">Passo a passo</h3>${stepsStrip(ex.id, { size: 150 })}</section>` : ''}
  <section class="block"><h3 class="block-title">Como fazer</h3><ol class="steps">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol></section>
  ${ex.mistakes.length ? `<section class="block"><h3 class="block-title">Erros comuns</h3><ul class="mistakes">${ex.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></section>` : ''}
  <section class="block"><h3 class="block-title">Equipamento</h3><div class="chips">${ex.equipment.map(e => chip(equipmentLabel(e))).join('')}</div></section>
  ${isProgression(ex.chain) ? `<section class="block"><h3 class="block-title">Cadeia de progressão</h3>
    <ol class="chain">${levels.map(l => `<li class="${l.level === cur ? 'now' : l.level < cur ? 'past' : ''} ${l.id === ex.id ? 'this' : ''}" data-nav="exercise" data-ex="${l.id}"><span class="chain-n">${l.level}</span><span>${esc(l.name)}</span></li>`).join('')}</ol>
    <div class="row-between" style="margin-top:10px">
      <button class="btn btn-ghost btn-sm" data-level="${ex.chain}" data-dir="-1" ${cur <= 1 ? 'disabled' : ''}>Descer nível</button>
      <button class="btn btn-ghost btn-sm" data-level="${ex.chain}" data-dir="1" ${cur >= levels.length ? 'disabled' : ''}>Subir nível</button>
    </div></section>` : ''}
  <a class="btn btn-yt" href="${ytUrl(ex)}" target="_blank" rel="noopener">▶ Ver vídeo no YouTube</a>
  <p class="foot muted">${ex.ytTitle ? esc(ex.ytTitle) : 'Se a ilustração não bastar, o vídeo mostra o movimento com uma pessoa.'}</p>`;
}

// ─────────────────────────── PROGRESSO ───────────────────────────
export function renderProgress(nav) {
  const state = getState();
  const logs = state.logs.filter(l => l.completed);
  const totalMin = logs.reduce((a, l) => a + (l.minutes || 0), 0);
  const { cycle } = cycleInfo(state.profile);
  // sessões por semana (últimas 8)
  // só semanas a partir da primeira com registo: colunas a zero antes disso
  // ocupavam espaço sem dizer nada
  const primeiro = logs.length ? logs[0].date : null;
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    const wk = buildWeek(state, d);
    const start = iso(wk.monday); const end = new Date(wk.monday); end.setDate(end.getDate() + 6);
    if (primeiro && iso(end) < primeiro) continue;
    const n = logs.filter(l => l.date >= start && l.date <= iso(end)).length;
    weeks.push({ n, planned: wk.sessions.filter(s => s.type !== 'rest').length, label: `${String(wk.monday.getDate()).padStart(2, '0')}/${String(wk.monday.getMonth() + 1).padStart(2, '0')}` });
  }
  const streak = computeStreak(state);
  const levels = Object.entries(state.chainLevels).map(([chain, lvl]) => {
    const ls = chainLevels(chain); const cur = ls.find(l => l.level === Math.min(lvl, ls.length));
    return { chain, lvl, max: ls.length, name: cur?.name || chain };
  });
  // variação da carga: o primeiro peso registado nos treinos versus o atual
  const primeiraCarga = {};
  for (const l of logs) {
    for (const [id, r] of Object.entries(l.results || {})) {
      if (r && r.kg != null && primeiraCarga[id] == null) primeiraCarga[id] = { kg: r.kg, date: l.date };
    }
  }
  const loads = Object.entries(state.loads).map(([id, kg]) => {
    const p = primeiraCarga[id];
    const delta = p && p.kg !== kg ? kg - p.kg : 0;
    return { ex: BY_ID[id], kg, delta, since: p?.date };
  }).filter(x => x.ex);
  const runs = logs.filter(l => (l.cardio?.dist ?? l.cardio?.km)).slice(-6);

  return `
  <header class="top"><div><div class="eyebrow">Progresso</div><h1>Ciclo ${cycle}</h1></div></header>
  <section class="grid2">
    <div class="card stat-card"><span class="stat-n">${logs.length}</span><span class="stat-l">sessões feitas</span></div>
    <div class="card stat-card"><span class="stat-n">${Math.round(totalMin / 60 * 10) / 10}</span><span class="stat-l">horas de treino</span></div>
    <div class="card stat-card"><span class="stat-n">${streak}</span><span class="stat-l">semanas seguidas com 4 ou mais treinos</span></div>
    <div class="card stat-card"><span class="stat-n">${levels.length}</span><span class="stat-l">${levels.length === 1 ? 'exercício em que subiste de nível' : 'exercícios em que subiste de nível'}</span></div>
  </section>
  <section class="card">
    <h3>Sessões por semana</h3>
    <div class="bars">${weeks.map(w => `<div class="bar"><div class="bar-fill" style="height:${w.planned ? Math.round(w.n / w.planned * 100) : 0}%"></div><span class="bar-n">${w.n}</span><span class="bar-l">${w.label}</span></div>`).join('')}</div>
  </section>
  ${levels.length ? `<section class="card"><h3>Onde estás em cada progressão</h3><ul class="kv">${levels.map(l => `<li><span>${esc(l.name)}</span><strong>nível ${l.lvl}<small> de ${l.max}</small></strong></li>`).join('')}</ul></section>` : ''}
  ${loads.length ? `<section class="card"><h3>Cargas</h3><ul class="kv">${loads.map(l => `<li><span>${esc(l.ex.name)}</span><strong>${l.kg} kg${l.delta ? `<small class="delta ${l.delta > 0 ? 'up' : 'down'}"> ${l.delta > 0 ? '+' : ''}${l.delta} desde ${esc(fmtDate(l.since))}</small>` : ''}</strong></li>`).join('')}</ul></section>` : ''}
  ${runs.length ? `<section class="card"><h3>Últimos treinos de cardio</h3><ul class="kv">${runs.map(l => `<li><span>${esc(fmtDate(l.date))}</span><strong>${esc(distLabel(l.cardio))} · ${l.cardio.minutes} min${pace(l.cardio) ? ` · ${pace(l.cardio)}` : ''}</strong></li>`).join('')}</ul></section>` : ''}
  ${!logs.length ? `<p class="foot muted">Ainda sem registos. Depois da primeira sessão isto ganha vida.</p>` : ''}`;
}

function distLabel(c) {
  const d = c.dist != null ? c.dist : c.km;
  if (!d) return '';
  return (c.unit || 'km') === 'm' ? `${d} m` : `${d} km`;
}

// O ritmo so faz sentido em km. Registos em metros (natacao) mostram so distancia.
function pace(c) {
  const d = c.dist != null ? c.dist : c.km;
  if (!d || !c.minutes || (c.unit || 'km') !== 'km') return '';
  const p = c.minutes / d; const m = Math.floor(p); const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function computeStreak(state) {
  let streak = 0;
  for (let i = 1; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    const wk = buildWeek(state, d);
    const start = iso(wk.monday); const end = new Date(wk.monday); end.setDate(end.getDate() + 6);
    const n = state.logs.filter(l => l.completed && l.date >= start && l.date <= iso(end)).length;
    if (n >= 4) streak++; else break;
  }
  return streak;
}

// ─────────────────────────── DEFINIÇÕES ───────────────────────────
export function renderSettings(nav, onboarding = false) {
  const state = getState();
  const p = state.profile;
  const eq = p.equipment;
  const eqList = [['dumbbells', 'Halteres'], ['board', 'Push-up board'], ['rope', 'Corda'], ['bars', 'Barras street workout'], ['pool', 'Piscina'], ['court', 'Ringue de basket'], ['chair', 'Cadeira / banco / degrau']];
  const goalOpts = Object.entries(GOALS).map(([k, g]) => `
    <label class="opt ${p.goal === k ? 'on' : ''}"><input type="radio" name="goal" value="${k}" ${p.goal === k ? 'checked' : ''}><span><strong>${esc(g.label)}</strong><small>${esc(g.desc)}</small></span></label>`).join('');
  return `
  <header class="top"><div><div class="eyebrow">${onboarding ? 'Bem-vindo' : 'Definições'}</div><h1>${onboarding ? 'O teu perfil' : 'Perfil'}</h1></div></header>
  ${onboarding ? `<p class="lead">Confirma o que já sei de ti. Podes mudar tudo depois.</p>` : ''}
  <form class="form" data-settings>
    <section class="card">
      <h3>Objetivo</h3>
      <div class="opts">${goalOpts}</div>
      ${!onboarding ? `<p class="muted small">Mudar de objetivo entra em vigor no início do próximo ciclo (${esc(fmtDate(nextCycleStart(p)))}). Trocar a meio destrói a progressão.</p>` : ''}
      ${p.pendingGoal ? `<p class="small">Agendado: <strong>${esc(GOALS[p.pendingGoal].label)}</strong> a ${esc(fmtDate(p.pendingGoalFrom))}. <button type="button" class="link" data-cancel-goal>Cancelar</button></p>` : ''}
    </section>
    <section class="card">
      <h3>Semana</h3>
      <label class="field"><span>Dias por semana</span><div class="seg">${[5, 6, 7].map(n => `<button type="button" class="${p.daysPerWeek === n ? 'on' : ''}" data-seg="daysPerWeek" data-val="${n}">${n}</button>`).join('')}</div></label>
      <label class="field"><span>Minutos por sessão</span><div class="seg">${[25, 30, 40, 45].map(n => `<button type="button" class="${p.minutes === n ? 'on' : ''}" data-seg="minutes" data-val="${n}">${n}</button>`).join('')}</div></label>
      <label class="field"><span>Corridas por semana</span><div class="seg">${[1, 2, 3].map(n => `<button type="button" class="${p.runsPerWeek === n ? 'on' : ''}" data-seg="runsPerWeek" data-val="${n}">${n}</button>`).join('')}</div></label>
    </section>
    <section class="card">
      <h3>Equipamento</h3>
      <div class="toggles">${eqList.map(([k, l]) => `<label class="toggle"><input type="checkbox" data-eq="${k}" ${eq[k] !== false ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
      <label class="field"><span>Peso máximo por halter (kg)</span><input type="number" inputmode="numeric" min="2" max="60" step="1" value="${p.dumbbellMaxKg}" data-num="dumbbellMaxKg"></label>
    </section>
    <section class="card">
      <h3>Corpo</h3>
      <label class="toggle"><input type="checkbox" data-bool="kneeSensitive" ${p.kneeSensitive ? 'checked' : ''}><span>Joelhos sensíveis (evita impacto e saltos)</span></label>
      <label class="toggle"><input type="checkbox" data-knee-flag ${state.kneeFlag ? 'checked' : ''}><span>Joelho a queixar-se esta semana (troca corrida por piscina, pernas por isometrias)</span></label>
      <label class="field"><span>Nome</span><input type="text" value="${esc(p.name)}" data-text="name" autocomplete="off"></label>
    </section>
    <section class="card">
      <h3>Figuras</h3>
      <label class="toggle"><input type="checkbox" data-bool-inv="animate" ${p.animate !== false ? 'checked' : ''}><span>Animar o movimento<small>Desliga se preferires as figuras paradas</small></span></label>
    </section>
    ${onboarding ? `<button type="button" class="btn btn-primary btn-big" data-finish-onboarding>Gerar o meu plano</button>` : `
    <section class="card">
      <h3>Dados</h3>
      <p class="muted small">Tudo fica neste aparelho. Exporta regularmente até a sincronização chegar na fase 3.</p>
      <div class="actions-row">
        <button type="button" class="btn btn-ghost" data-export>Exportar cópia</button>
        <label class="btn btn-ghost">Importar<input type="file" accept="application/json" data-import hidden></label>
      </div>
      <button type="button" class="link danger" data-reset>Apagar tudo e recomeçar</button>
    </section>
    <section class="card">
      <h3>Ciclo</h3>
      <p class="muted small">Início do ciclo atual: ${esc(fmtDate(p.cycleStart))}. Reiniciar começa uma semana 1 na próxima segunda.</p>
      <button type="button" class="btn btn-ghost" data-restart-cycle>Reiniciar ciclo na próxima segunda</button>
    </section>
    <p class="foot muted">${esc(CONFIG.appName)} v${esc(CONFIG.version)} · PWA · sincronização Supabase na fase 3</p>`}
  </form>`;
}

export function bindSettings(root, nav, onboarding) {
  root.querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => {
    setProfile({ [b.dataset.seg]: Number(b.dataset.val) });
    nav.rerender();
  }));
  root.querySelectorAll('input[name="goal"]').forEach(r => r.addEventListener('change', () => {
    const goal = r.value;
    const p = getState().profile;
    if (onboarding || getState().logs.length === 0) { setProfile({ goal, pendingGoal: null, pendingGoalFrom: null }); toast(`Objetivo: ${GOALS[goal].label}`); }
    else if (goal !== p.goal) { setProfile({ pendingGoal: goal, pendingGoalFrom: nextCycleStart(p) }); toast('Mudança agendada para o próximo ciclo'); }
    nav.rerender();
  }));
  root.querySelector('[data-cancel-goal]')?.addEventListener('click', () => { setProfile({ pendingGoal: null, pendingGoalFrom: null }); nav.rerender(); });
  root.querySelectorAll('[data-eq]').forEach(c => c.addEventListener('change', () => {
    update(s => { s.profile.equipment[c.dataset.eq] = c.checked; });
  }));
  root.querySelectorAll('[data-bool]').forEach(c => c.addEventListener('change', () => setProfile({ [c.dataset.bool]: c.checked })));
  root.querySelectorAll('[data-bool-inv]').forEach(c => c.addEventListener('change', () => setProfile({ [c.dataset.boolInv]: c.checked })));
  root.querySelector('[data-knee-flag]')?.addEventListener('change', e => update(s => { s.kneeFlag = e.target.checked; }));
  root.querySelectorAll('[data-num]').forEach(i => i.addEventListener('change', () => setProfile({ [i.dataset.num]: Number(i.value) || 0 })));
  root.querySelectorAll('[data-text]').forEach(i => i.addEventListener('change', () => setProfile({ [i.dataset.text]: i.value.trim() || 'João' })));
  root.querySelector('[data-finish-onboarding]')?.addEventListener('click', () => { update(s => { s.onboarded = true; }); nav.go('home'); });
  root.querySelector('[data-export]')?.addEventListener('click', async () => {
    const text = exportJSON();
    const name = `treino-${iso(new Date())}.json`;
    try {
      if (navigator.share && navigator.canShare?.({ files: [new File([text], name, { type: 'application/json' })] })) {
        await navigator.share({ files: [new File([text], name, { type: 'application/json' })], title: 'Cópia do Treino' });
        return;
      }
    } catch { /* cancelado */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  root.querySelector('[data-import]')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { importJSON(await f.text()); toast('Dados importados'); nav.go('home'); } catch { toast('Ficheiro inválido'); }
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    if (confirm('Apagar todos os registos e voltar ao início?')) { resetAll(); nav.go('home'); }
  });
  root.querySelector('[data-restart-cycle]')?.addEventListener('click', () => {
    const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() + (7 - day)); d.setHours(0, 0, 0, 0);
    setProfile({ cycleStart: iso(d) }); toast('Ciclo reiniciado'); nav.rerender();
  });
}

export function fmtDate(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}
