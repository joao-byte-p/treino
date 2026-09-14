import { getState, setProfile, update, findLog, GOALS, exportJSON, importJSON, resetAll, iso, marcarFigura, figuraMarcada, moverTreino, addPausa, removePausa } from '../store.js';
import { buildWeek, sessionFor, WEEK_FOCUS, nextCycleStart, cycleInfo, DAY_META, emPausa } from '../engine/planner.js';
import { EXERCISES, BY_ID, chainLevels, isProgression, PATTERN_LABEL } from '../data/exercises.js';
import { esc, ring, dial, tile, exerciseRow, illustration, chip, patternLabel, equipmentLabel, ytUrl, dateLabel, toast, prescription } from './components.js';
import { hasPose, stepsStrip, frameCount, prefersStill } from './figure.js';
import { CONFIG } from '../config.js';
import { buildICS, downloadICS } from '../calendar.js';
import * as sync from '../sync.js';

// ─────────────────────────── HOJE ───────────────────────────
// Ele pediu para ser empurrado para a piscina ("assim vou forçando, sei que é
// melhor"). Só fala nisso num dia de cardio, e só ao fim de muitas semanas — insistir
// todas as semanas transforma-se em ruído que se aprende a ignorar.
function nadaHaMuito(state, sessaoHoje) {
  if (sessaoHoje.type !== 'cardio' || sessaoHoje.blocks?.some(b => b.items?.some(i => i.ex?.chain === 'swim'))) return 0;
  const nados = state.logs.filter(l => l.completed && l.cardio?.ex === 'swim-easy').map(l => l.date).sort();
  const desde = nados.length ? nados[nados.length - 1] : (state.logs.find(l => l.completed)?.date || null);
  if (!desde) return 0;
  const semanas = Math.floor((new Date(iso(new Date())) - new Date(desde)) / (7 * 864e5));
  return semanas >= 4 ? semanas : 0;
}

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

  // Se ele já treinou antes e há dias que não aparece, a app diz-lhe quantos.
  // Sem drama e sem contar dias a quem está a começar: um zero não é uma falha.
  const ultimo = state.logs.filter(l => l.completed).map(l => l.date).sort().pop();
  // Dias parados não contam durante uma pausa marcada: ele avisou, não faltou.
  const emPausaHoje = emPausa(state, iso(today));
  const diasParado = emPausaHoje || !ultimo ? 0 : Math.floor((new Date(iso(today)) - new Date(ultimo)) / 864e5);
  const ativos = wk.sessions.filter(x => x.type !== 'rest');
  const minsPlan = ativos.reduce((a, x) => a + (x.estMinutes || 0), 0);
  const minsDone = wk.sessions.reduce((a, x) => { const l = findLog(x.date); return a + (l?.completed ? (l.minutes || 0) : 0); }, 0);
  const cicloPct = Math.min(1, ((wk.week - 1) + (planned ? doneThisWeek / planned : 0)) / 4);
  // A frase de orientação: uma só, a que importa hoje. Um dia parado há muito ganha
  // ao foco da semana; senão, contexto de hoje mais o foco.
  const orientacao = emPausaHoje ? `${emPausaHoje.motivo || 'Pausa'} até ${fmtDate(emPausaHoje.ate)}. O ciclo fica à espera: quando voltares retomas na semana ${wk.week}.`
    : nadaHaMuito(state, s) ? `Hoje é cardio e há ${nadaHaMuito(state, s)} semanas que não vais à piscina. Zero impacto, e disseste que era melhor para ti: o botão de trocar está aí em baixo.`
    : diasParado >= 3
    ? `Último treino há ${diasParado} dias. ${diasParado >= 7 ? 'A semana recomeça quando quiseres: o ciclo não te espera nem te castiga.' : 'Hoje é um bom dia para voltar.'}`
    : s.type === 'rest' ? `Hoje é descanso. ${wk.focus.desc}`
    : log?.completed ? `A sessão de hoje está feita. ${wk.focus.desc}`
    : `Hoje: ${s.title}, ${s.estMinutes} min. ${wk.focus.desc}`;

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
        <div class="tiles">
          ${tile({ icon: 'clock', label: 'Duração', num: `${s.estMinutes}`, unit: 'min' })}
          ${tile({ icon: 'list', label: mainBlock && mainBlock.items.length === 1 ? 'Exercício' : 'Exercícios', num: `${mainBlock ? mainBlock.items.length : 0}` })}
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
  </header>
  ${goalNotice}${kneeNotice}
  <section class="card card-dials">
    <div class="dials">
      ${dial(planned ? doneThisWeek / planned : 0, { num: `${doneThisWeek}`, unit: `/${planned}`, label: 'Semana', sub: doneThisWeek >= planned && planned ? 'completa' : `${planned - doneThisWeek} por fazer`, tone: 'mint' })}
      ${dial(minsPlan ? minsDone / minsPlan : 0, { num: `${minsDone}`, unit: 'min', label: 'Tempo', sub: `de ${minsPlan} planeados`, tone: 'amber' })}
      ${dial(cicloPct, { num: `S${wk.week}`, unit: '/4', label: 'Ciclo', sub: wk.focus.label, tone: 'sky' })}
    </div>
    <div class="coaching"><div class="card-kicker">Orientação</div><p>${esc(orientacao)}</p></div>
  </section>
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
        <div class="dayrow-sub">${s.movido ? '<span class="tag-movido">trocado</span> ' : ''}${s.type === 'rest' ? esc(s.subtitle) : `${s.estMinutes} min · ${n}${esc(s.subtitle)}`}</div>
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
    <button class="btn btn-primary btn-big" data-nav="session" data-date="${dateISO}" ${altIndex != null ? `data-alt="${altIndex}"` : ''}>${rotuloAcao(dateISO, log)}</button>
    ${s.alternatives.map((a, i) => `<button class="btn btn-ghost" data-nav="day" data-date="${dateISO}" data-alt="${i}">${esc(a.label)}</button>`).join('')}
  </div>` : ''}
  ${log?.completed ? '' : moverCard(state, dateISO, s)}`;
}

// O botão de um dia passado não pode dizer "Começar": o que se faz a um dia que já
// passou é registá-lo ou corrigi-lo, e o texto tem de dizer isso.
function rotuloAcao(dateISO, log) {
  const hoje = iso(new Date());
  if (log?.completed) return 'Rever ou corrigir o registo';
  if (dateISO < hoje) return 'Registar este treino';
  if (dateISO > hoje) return 'Fazer hoje, à frente do plano';
  return 'Começar';
}

// Trocar o treino de dia. É uma troca com outro dia da mesma semana, e não um
// cancelamento: a semana fica com os mesmos dias de treino que o perfil pede.
function moverCard(state, dateISO, s) {
  const wk = buildWeek(state, new Date(dateISO));
  const outros = wk.sessions.filter(x => x.date !== dateISO && !findLog(x.date)?.completed);
  if (!outros.length) return '';
  return `<details class="det mover">
    <summary>${s.type === 'rest' ? 'Trazer um treino para este dia' : 'Não posso treinar neste dia'}</summary>
    <p class="muted small">Troca com outro dia desta semana. ${s.type === 'rest' ? 'Este dia passa a ter esse treino, e esse dia passa a descanso.' : 'O treino passa para o dia que escolheres, e esse dia vem para aqui.'}</p>
    <ul class="movelist">${outros.map(x => `<li>
      <button type="button" data-mover="${dateISO}" data-para="${x.date}">
        <span class="movelist-d">${esc(x.weekdayShort)} ${new Date(x.date).getDate()}</span>
        <span class="movelist-t">${esc(x.title)}</span>
        <span class="movelist-a" aria-hidden="true">⇄</span>
      </button></li>`).join('')}</ul>
  </details>`;
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

// Marcar a figura como errada, para eu a corrigir depois. Discreto de propósito:
// é um relato, não uma ação principal do ecrã.
function figFlag(ex) {
  if (!hasPose(ex.id)) return '';
  const on = figuraMarcada(ex.id);
  return `<button class="link fig-flag${on ? ' on' : ''}" data-flag="${ex.id}" aria-pressed="${on}">${on ? '✓ Marcada como errada' : 'Esta figura está mal'}</button>`;
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
      <figcaption class="hero-cap">${figCaption(ex, state)}${figFlag(ex)}</figcaption></figure>`
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
  const { cycle } = cycleInfo(state.profile, new Date(), state);
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
  ${corridaCard(logs)}
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

// A pergunta que ele fez na segunda mensagem e que a app nunca respondeu:
// "5 km em 23-25 min, é um bom ritmo?". Aqui vai a tendência dele e uma referência.
// Os escalões são a distribuição habitual de corredores recreativos aos 5 km; servem
// para situar, não para avaliar — e a subida do percurso dele não entra em nenhuma.
function segPorKm(c) {
  const d = c.dist != null ? c.dist : c.km;
  if (!d || !c.minutes || (c.unit || 'km') !== 'km') return null;
  return (c.minutes * 60) / d;
}
const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

function escalao(sec) {
  if (sec <= 240) return ['Competitivo', 'Ritmo de quem treina para competir.'];
  if (sec <= 285) return ['Rápido', 'Acima da maioria dos corredores recreativos.'];
  if (sec <= 330) return ['Bom', 'Ritmo sólido de corredor habitual.'];
  if (sec <= 390) return ['Regular', 'Confortável e sustentável.'];
  return ['A construir', 'A base aeróbica constrói-se assim mesmo.'];
}

function corridaCard(logs) {
  const cs = logs.filter(l => l.cardio && segPorKm(l.cardio)).map(l => ({ date: l.date, s: segPorKm(l.cardio), km: l.cardio.dist ?? l.cardio.km }));
  if (!cs.length) return '';
  const ultimo = cs[cs.length - 1];
  const [nome, frase] = escalao(ultimo.s);
  // tendência: média das três últimas contra as três anteriores, se houver seis
  let tend = '';
  if (cs.length >= 6) {
    const med = a => a.reduce((x, y) => x + y.s, 0) / a.length;
    const nova = med(cs.slice(-3)), velha = med(cs.slice(-6, -3));
    const d = Math.round(velha - nova);
    tend = Math.abs(d) < 5
      ? '<span class="muted">Estável nas últimas seis corridas.</span>'
      : `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '−' : '+'}${mmss(Math.abs(d))}/km</span> <span class="muted">nas três últimas contra as três anteriores.</span>`;
  } else {
    tend = `<span class="muted">Com ${6 - cs.length} ${6 - cs.length === 1 ? 'corrida' : 'corridas'} a mais mostro-te a tendência.</span>`;
  }
  return `<section class="card">
    <h3>Ritmo de corrida</h3>
    <div class="stats"><div class="stat"><span class="stat-n">${mmss(ultimo.s)}</span><span class="stat-l">min/km na última</span></div>
      <div class="stat"><span class="stat-n">${nome}</span><span class="stat-l">para ${ultimo.km} km em piso plano</span></div></div>
    <p class="small">${frase} ${tend}</p>
    <p class="foot muted" style="text-align:left;margin-top:6px">Metade do teu percurso é a subir, e nenhuma referência conta com isso — em plano o mesmo esforço daria um ritmo mais rápido.</p>
  </section>`;
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
// Quantos dias desde a última cópia para fora do aparelho. Só avisa quem já tem
// histórico para perder: dizer "faz uma cópia" a quem ainda não treinou é ruído.
function copiaAviso(state) {
  const n = state.logs.filter(l => l.completed).length;
  if (!n) return '';
  const ultima = state.profile.lastBackup || state.profile.lastSync;
  const dias = ultima ? Math.floor((Date.now() - ultima) / 864e5) : null;
  if (dias != null && dias < 21) return `<p class="muted small">Última cópia há ${dias === 0 ? 'menos de um dia' : `${dias} dias`}.</p>`;
  return `<div class="notice notice-warn">${ultima ? `A última cópia foi há ${dias} dias.` : `${n} ${n === 1 ? 'treino' : 'treinos'} registados e nunca copiados para fora deste aparelho.`}</div>`;
}

function fmtDataHora(ms) {
  return new Date(ms).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Pausas: férias, doença, viagem. Não são faltas e o ciclo congela enquanto duram,
// para ele não voltar de férias e encontrar a semana toda marcada como falhada.
function pausasCard(state) {
  const hoje = iso(new Date());
  const ps = (state.pausas || []).filter(p => p.ate >= hoje);
  return `<section class="card">
    <h3>Pausas</h3>
    <p class="muted small">Férias, viagem ou doença. Nesses dias não há treino marcado, não contam como falta, e o ciclo espera por ti.</p>
    ${ps.length ? `<ul class="pausas">${ps.map(p => `<li class="row-between">
      <span><strong>${esc(fmtDate(p.de))} a ${esc(fmtDate(p.ate))}</strong>${p.motivo ? `<br><small class="muted">${esc(p.motivo)}</small>` : ''}</span>
      <button type="button" class="link" data-rm-pausa="${p.de}|${p.ate}">Remover</button>
    </li>`).join('')}</ul>` : ''}
    <div class="grid2">
      <label class="field"><span>De</span><input type="date" data-pausa-de value="${hoje}"></label>
      <label class="field"><span>Até</span><input type="date" data-pausa-ate value="${hoje}"></label>
    </div>
    <label class="field"><span>Motivo (opcional)</span><input type="text" placeholder="Férias" data-pausa-motivo></label>
    <button type="button" class="btn btn-ghost" data-add-pausa>Marcar pausa</button>
  </section>`;
}

// Lista das figuras que ele marcou como erradas, para eu as corrigir. A nota
// escreve-se aqui e não durante o treino, onde escrever é atrito a mais.
function marcadasCard(state) {
  const m = state.figuraMarcada || {};
  const ids = Object.keys(m).filter(id => BY_ID[id]);
  if (!ids.length) return '';
  return `<section class="card">
    <h3>Figuras a corrigir <span class="muted">${ids.length}</span></h3>
    <p class="muted small">Marcaste estas durante o treino. A nota é opcional e ajuda a perceber o que está mal.</p>
    <ul class="marcadas">${ids.map(id => `<li>
      <div class="row-between"><strong>${esc(BY_ID[id].name)}</strong><button type="button" class="link" data-unflag="${id}">Remover</button></div>
      <input type="text" placeholder="O que está mal? (opcional)" value="${esc(m[id].nota || '')}" data-nota="${id}">
    </li>`).join('')}</ul>
  </section>`;
}

// Hora do treino guardada como "HH:MM" para o campo <input type="time">.
export function icsOpts(p) {
  const [h, m] = String(p.trainTime || '18:00').split(':').map(Number);
  return { semanas: 8, hora: Number.isFinite(h) ? h : 18, minuto: Number.isFinite(m) ? m : 0, aviso: p.remindMin ?? 30 };
}

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
      <label class="field"><span>Minutos por sessão</span><div class="seg">${[30, 40, 45].map(n => `<button type="button" class="${p.minutes === n ? 'on' : ''}" data-seg="minutes" data-val="${n}">${n}</button>`).join('')}</div></label>
      <p class="muted small">Trinta minutos é o mínimo. Na semana de deload a sessão mantém o tempo e baixa a carga — uma semana leve não é uma semana curta.</p>
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
    ${marcadasCard(state)}
    <section class="card">
      <h3>Aspeto</h3>
      <label class="field"><span>Tema</span><div class="seg">${[['dark', 'Escuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) => `<button type="button" class="${(p.theme || 'dark') === v ? 'on' : ''}" data-seg="theme" data-val="${v}">${l}</button>`).join('')}</div></label>
      <p class="muted small">Automático segue o telefone: claro de dia, escuro de noite.</p>
    </section>
    <section class="card">
      <h3>Figuras</h3>
      <label class="toggle"><input type="checkbox" data-bool-inv="animate" ${p.animate !== false ? 'checked' : ''}><span>Animar o movimento<small>Desliga se preferires as figuras paradas</small></span></label>
    </section>
    ${onboarding ? `<button type="button" class="btn btn-primary btn-big" data-finish-onboarding>Gerar o meu plano</button>` : `
    <section class="card">
      <h3>Cópia de segurança</h3>
      ${copiaAviso(state)}
      <p class="muted small">O histórico vive no armazenamento do Safari deste aparelho. Se o limpares ou perderes o telefone, vai com ele.</p>
      <div class="actions-row">
        <button type="button" class="btn btn-ghost" data-export>Exportar cópia</button>
        <label class="btn btn-ghost">Importar<input type="file" accept="application/json" data-import hidden></label>
      </div>
      <button type="button" class="link danger" data-reset>Apagar tudo e recomeçar</button>
    </section>
    <section class="card">
      <h3>Sincronizar</h3>
      ${sync.ligado() ? `
        <p class="muted small">Ligado como <strong>${esc(sync.email())}</strong>. ${p.lastSync ? `Última sincronização: ${esc(fmtDataHora(p.lastSync))}.` : 'Ainda não sincronizou.'}</p>
        <p class="muted small">Guarda-se no servidor europeu do Supabase, com uma linha só tua protegida por Row Level Security. Ganha sempre o aparelho onde mexeste por último.</p>
        <button type="button" class="btn btn-ghost" data-sync-now>Sincronizar agora</button>
        <button type="button" class="link" data-sync-out>Terminar sessão</button>
      ` : `
        <p class="muted small">Uma cópia no servidor europeu do Supabase, para o histórico sobreviver a este telefone. Entras com um código enviado por email, sem password para guardar.</p>
        <label class="field"><span>O teu email</span><input type="email" inputmode="email" autocomplete="email" placeholder="email@exemplo.pt" value="${esc(p.syncEmail || '')}" data-sync-email></label>
        <div class="actions-row">
          <button type="button" class="btn btn-ghost" data-sync-code>Enviar código</button>
        </div>
        <label class="field"><span>Código do email</span><input type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" data-sync-otp></label>
        <button type="button" class="btn btn-primary" data-sync-in>Entrar</button>
        <details class="det"><summary>Primeira vez: preparar o projeto Supabase</summary>
          <p class="muted small">Quatro passos, uma vez só. Feitos a 14 de setembro de 2026; ficam aqui para o dia em que o projeto for outro.</p>
          <ol class="steps steps-sm">
            <li><strong>Tabela.</strong> SQL Editor → colar e correr o SQL abaixo. Cria a tabela e as regras que impedem qualquer outra pessoa de ler a tua linha.</li>
            <li><strong>SMTP próprio.</strong> Sem ele o Supabase não deixa editar os emails, e o email traz um link em vez do código. Brevo (UE, grátis): Project Settings → Authentication → SMTP. Host <code>smtp-relay.brevo.com</code>, porta 587. O <em>Username</em> é o «Login» que o Brevo mostra em SMTP &amp; API (do tipo <code>xxxx001@smtp-brevo.com</code>), não o teu email. E em Brevo → Segurança → IPs autorizados, «Desativar para chaves SMTP», senão recusa o Supabase com <code>525</code>.</li>
            <li><strong>Código no email.</strong> Authentication → Emails → «Confirm signup» e «Magic Link» → Source → acrescentar <code>{{ .Token }}</code>.</li>
            <li><strong>Site URL.</strong> Authentication → URL Configuration → o endereço da app, para o link do email não apontar para <code>localhost</code>.</li>
          </ol>
          <pre class="sql">${esc(sync.SQL_TABELA)}</pre>
        </details>
      `}
    </section>
    <section class="card">
      <h3>Lembretes</h3>
      <p class="muted small">O iOS só entrega notificações de uma app web através de um servidor de push, que isto não tem. O calendário do telefone avisa com a app fechada, e por isso é ele que faz o lembrete.</p>
      <label class="field"><span>Hora habitual do treino</span><input type="time" value="${esc(p.trainTime || '18:00')}" data-text="trainTime" step="900"></label>
      <label class="field"><span>Avisar quantos minutos antes</span><div class="seg">${[15, 30, 60].map(n => `<button type="button" class="${(p.remindMin ?? 30) === n ? 'on' : ''}" data-seg="remindMin" data-val="${n}">${n}</button>`).join('')}</div></label>
      <button type="button" class="btn btn-ghost" data-ics>Adicionar 8 semanas ao calendário</button>
      <p class="foot muted">${(() => { try { return buildICS(state, icsOpts(p)).eventos; } catch { return 0; } })()} treinos, com aviso ${p.remindMin ?? 30} minutos antes. Repete quando mudares o plano.</p>
    </section>
    ${pausasCard(state)}
    <section class="card">
      <h3>Ciclo</h3>
      <p class="muted small">Início do ciclo atual: ${esc(fmtDate(p.cycleStart))}. Reiniciar começa uma semana 1 na próxima segunda.</p>
      <button type="button" class="btn btn-ghost" data-restart-cycle>Reiniciar ciclo na próxima segunda</button>
    </section>
    <p class="foot muted">${esc(CONFIG.appName)} v${esc(CONFIG.version)} · PWA · Supabase na UE</p>`}
  </form>`;
}

export function bindSettings(root, nav, onboarding) {
  root.querySelectorAll('[data-seg]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.val;
    setProfile({ [b.dataset.seg]: Number.isNaN(Number(v)) ? v : Number(v) });
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
  // o recuo para 'João' só vale para o nome; a hora do treino tem o seu próprio recuo
  root.querySelectorAll('[data-text]').forEach(i => i.addEventListener('change', () => {
    const campo = i.dataset.text;
    const v = i.value.trim();
    const recuo = campo === 'name' ? 'João' : campo === 'trainTime' ? '18:00' : '';
    setProfile({ [campo]: v || recuo });
    if (campo === 'trainTime') nav.rerender();
  }));
  root.querySelector('[data-add-pausa]')?.addEventListener('click', () => {
    const de = root.querySelector('[data-pausa-de]')?.value;
    const ate = root.querySelector('[data-pausa-ate]')?.value;
    const motivo = root.querySelector('[data-pausa-motivo]')?.value || '';
    if (!addPausa(de, ate, motivo)) return toast('Verifica as datas: o fim não pode ser antes do início');
    toast('Pausa marcada. O ciclo espera por ti.');
    nav.rerender();
  });
  root.querySelectorAll('[data-rm-pausa]').forEach(b => b.addEventListener('click', () => {
    const [de, ate] = b.dataset.rmPausa.split('|');
    removePausa(de, ate); toast('Pausa removida'); nav.rerender();
  }));
  root.querySelectorAll('[data-unflag]').forEach(b => b.addEventListener('click', () => {
    marcarFigura(b.dataset.unflag); nav.rerender();
  }));
  root.querySelectorAll('[data-nota]').forEach(i => i.addEventListener('change', () => {
    marcarFigura(i.dataset.nota, i.value.trim()); toast('Nota guardada');
  }));
  root.querySelector('[data-ics]')?.addEventListener('click', () => {
    const st = getState();
    const n = downloadICS(st, icsOpts(st.profile));
    toast(n ? `${n} treinos prontos para o calendário` : 'Nada para agendar nas próximas 8 semanas');
  });
  root.querySelector('[data-finish-onboarding]')?.addEventListener('click', () => { update(s => { s.onboarded = true; }); nav.go('home'); });
  root.querySelector('[data-export]')?.addEventListener('click', async () => {
    const text = exportJSON();
    const name = `treino-${iso(new Date())}.json`;
    try {
      if (navigator.share && navigator.canShare?.({ files: [new File([text], name, { type: 'application/json' })] })) {
        await navigator.share({ files: [new File([text], name, { type: 'application/json' })], title: 'Cópia do Treino' });
        setProfile({ lastBackup: Date.now() });
        return;
      }
    } catch { /* cancelado */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setProfile({ lastBackup: Date.now() });
  });
  const campoEmail = () => root.querySelector('[data-sync-email]')?.value.trim() || getState().profile.syncEmail || '';
  root.querySelector('[data-sync-code]')?.addEventListener('click', async b => {
    const mail = campoEmail();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast('Escreve um email válido');
    setProfile({ syncEmail: mail });
    try { await sync.pedirCodigo(mail); toast('Código enviado. Vê o email.'); }
    catch (e) { toast(e.message); }
  });
  root.querySelector('[data-sync-in]')?.addEventListener('click', async () => {
    const codigo = root.querySelector('[data-sync-otp]')?.value.trim();
    if (!codigo) return toast('Falta o código do email');
    try {
      await sync.confirmarCodigo(campoEmail(), codigo);
      const r = await sync.sincronizar(getState(), dados => importJSON(JSON.stringify(dados)));
      setProfile({ lastSync: Date.now() });
      toast(r.texto);
      nav.rerender();
    } catch (e) { toast(e.message); }
  });
  root.querySelector('[data-sync-now]')?.addEventListener('click', async () => {
    try {
      const r = await sync.sincronizar(getState(), dados => importJSON(JSON.stringify(dados)));
      setProfile({ lastSync: Date.now() });
      toast(r.texto);
      nav.rerender();
    } catch (e) { toast(e.message); }
  });
  root.querySelector('[data-sync-out]')?.addEventListener('click', () => {
    sync.sair(); toast('Sessão terminada neste aparelho'); nav.rerender();
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
