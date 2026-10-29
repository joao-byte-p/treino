// Sessão guiada: transforma os blocos em passos e conduz com temporizador. No fim, registo simples.
import { getState, saveLog, update, findLog, marcarFigura, figuraMarcada } from '../store.js';
import { sessionFor, buildWeek } from '../engine/planner.js';
import { applyProgression, RPE } from '../engine/progression.js';
import { BY_ID } from '../data/exercises.js';
import { countdown, beep, unlockAudio, keepAwake, fmt, fmtLong } from '../timer.js';
import { timerRing, setRing } from './components.js';
import { esc, illustration, ytUrl, toast, prescription, ligarMmss, lerMmss, camposMmss } from './components.js';
import { contasDaSemana, oQueFechou } from '../engine/fecho.js';
import { montarFecho } from './fecho.js';
import { hasPose, mountFigure } from './figure.js';
import { applyAlt } from './views.js';

// ---- passos ----
export function buildSteps(session) {
  const steps = [];
  const push = s => steps.push(s);
  for (const b of session.blocks) {
    if (b.kind === 'hiit' || b.kind === 'circuit') {
      for (let r = 1; r <= b.rounds; r++) {
        b.items.forEach((it, i) => {
          push({ type: 'work', mode: 'time', ex: it.ex, seconds: it.work, label: `Ronda ${r}/${b.rounds}`, block: b.title, load: it.load, next: b.items[i + 1]?.ex || (r < b.rounds ? b.items[0].ex : null) });
          const isLast = i === b.items.length - 1;
          if (!isLast) push({ type: 'rest', seconds: it.rest, label: `Ronda ${r}/${b.rounds}`, next: b.items[i + 1].ex });
          else if (r < b.rounds) push({ type: 'rest', seconds: b.betweenRounds, label: `Fim da ronda ${r}`, next: b.items[0].ex, long: true });
        });
      }
    } else if (b.kind === 'cardio') {
      for (const it of b.items) push({ type: 'work', mode: 'cardio', ex: it.ex, seconds: it.time, label: b.title, note: it.note });
    } else {
      b.items.forEach((it, idx) => {
        const sides = it.perSide ? ['Lado esquerdo', 'Lado direito'] : [null];
        for (let s = 1; s <= (it.sets || 1); s++) {
          for (const side of sides) {
            const label = (it.sets || 1) > 1 ? `Série ${s}/${it.sets}` : b.title;
            if (it.time) push({ type: 'work', mode: 'time', ex: it.ex, seconds: it.time, label, side, block: b.title, load: it.load, item: it });
            else push({ type: 'work', mode: 'reps', ex: it.ex, reps: it.reps, label, side, block: b.title, load: it.load, item: it });
          }
          const lastSet = s === (it.sets || 1);
          const nextEx = lastSet ? b.items[idx + 1]?.ex : it.ex;
          if (it.rest && it.kind === 'strength' && !(lastSet && idx === b.items.length - 1)) push({ type: 'rest', seconds: it.rest, label: lastSet ? 'Próximo exercício' : `Pausa · série ${s}/${it.sets}`, next: nextEx });
        }
      });
    }
  }
  // Primeiro exercício de cada bloco (aquecimento, principal, HIIT, arrefecimento):
  // é aí que o tipo de trabalho muda e ele precisa de uns segundos para ler o que
  // vem. As pausas entre séries não contam como mudança.
  let blocoAnterior = null;
  for (const st of steps) {
    if (st.type !== 'work') continue;
    const bloco = st.block ?? st.label;
    if (bloco !== blocoAnterior) st.inicioBloco = true;
    blocoAnterior = bloco;
  }
  return steps;
}

// Cada evento de progressão dito por palavras. Os dois do teto explicam a saída,
// porque "mais carga" deixou de ser uma opção honesta acima dos halteres que ele tem.
function frase(e) {
  if (e.type === 'level') return `Subiste de nível: ${e.to}`;
  if (e.type === 'load') return `Mais carga: ${e.ex} a ${e.kg} kg`;
  if (e.type === 'reps') return e.teto ? `${e.ex} no teto dos ${e.teto} kg: passa a +${e.bonus} reps` : `${e.ex} no topo da cadeia: passa a +${e.bonus} reps`;
  if (e.type === 'tempo') return `${e.ex} no topo da cadeia: passa a +${e.bonus} segundos`;
  if (e.type === 'limite') return `${e.ex} é o fim desta cadeia. Não tenho nada mais difícil para te dar aqui.`;
  if (e.type === 'comprar') return `${e.ex} chegou ao fim do que ${e.teto} kg dão. É aqui que compensa comprar mais peso.`;
  return 'Progresso registado';
}

// `soRegistar`: o treino já foi feito sem o telemóvel (uma corrida, quase sempre)
// e só falta registá-lo. Vai direto ao ecrã de registo, sem passos guiados — e sem
// ficar marcado como interrompido, que era o que acontecia a quem saía a meio da
// sessão guiada só para chegar ao registo.
export function mountSession(root, nav, dateISO, altIndex, { soRegistar = false } = {}) {
  const state = getState();
  // sessionFor já aplica as trocas por versão em casa guardadas para o dia
  const session = applyAlt(sessionFor(state, new Date(dateISO)), altIndex);

  const steps = buildSteps(session);
  let i = 0;
  let timer = null;
  let figOff = null;
  const startedAt = Date.now();
  const results = {};
  let finished = false;

  if (!soRegistar) { unlockAudio(); keepAwake(true); }

  function stopTimer() { if (timer) { timer.stop(); timer = null; } }

  // o que este treino faz à semana: dá sentido a guardar
  function weekAfter() {
    const st = getState();
    const wk = buildWeek(st, new Date(dateISO));
    const previstos = wk.sessions.filter(x => x.type !== 'rest' && !x.extra).length;
    const feitos = wk.sessions.filter(x => !x.extra).filter(x => {
      const l = st.logs.find(y => y.date === x.date);
      return (l && l.completed) || x.date === dateISO;
    }).length;
    return `<div class="stat"><span class="stat-n">${feitos}<small>/${previstos}</small></span><span class="stat-l">na semana</span></div>`;
  }
  function stopFig() { if (figOff) { figOff(); figOff = null; } }
  function mountFigs() {
    stopFig();
    const host = root.querySelector('[data-fig]');
    if (host) figOff = mountFigure(host, host.dataset.fig, { size: 280, maxH: host.classList.contains('srun-illu-sm') ? 168 : 208, period: 3400, animate: getState().profile.animate !== false });
  }

  function renderStep() {
    stopTimer();
    aEspera = false;
    if (i >= steps.length) { finish(); return; }
    const st = steps[i];
    const pct = i / steps.length;
    const ex = st.ex || st.next;
    const header = `
      <header class="srun-top">
        <button class="iconbtn" data-exit aria-label="Sair">✕</button>
        <div class="srun-progress"><div style="width:${(pct * 100).toFixed(1)}%"></div></div>
        <span class="srun-count">${i + 1}/${steps.length}</span>
      </header>`;

    if (st.type === 'rest') {
      root.innerHTML = `${header}
        <div class="srun srun-rest">
          <div class="srun-kicker">${esc(st.label)}</div>
          <div class="srun-timer srun-timer-rest">
            ${timerRing('sky')}
            <div class="srun-timer-in">
              <div class="srun-big" data-clock>${fmt(st.seconds)}</div>
              <div class="srun-sub">pausa</div>
            </div>
          </div>
          ${st.next ? `<div class="srun-next"><span class="muted">A seguir</span><strong>${esc(st.next.name)}</strong><div class="srun-next-thumb">${illustration(st.next, 124)}</div></div>` : ''}
          <div class="srun-actions">
            <button class="btn btn-ghost" data-add="-10">−10s</button>
            <button class="btn btn-ghost" data-pause>Pausar</button>
            <button class="btn btn-ghost" data-add="10">+10s</button>
          </div>
          <button class="link srun-skip" data-next>Saltar pausa</button>
        </div>`;
      timer = countdown(st.seconds, {
        tone: 'rest',
        onTick: s => { const c = root.querySelector('[data-clock]'); if (c) c.textContent = fmt(s); },
        onFrame: f => setRing(root, f),
        onDone: () => advance(),
      });
    } else if (st.mode === 'cardio') {
      const kicker = st.label && st.label.toLowerCase() !== st.ex.name.toLowerCase() ? st.label : 'Bloco principal';
      root.innerHTML = `${header}
        <div class="srun srun-cardio">
          <div class="srun-kicker">${esc(kicker)}</div>
          <h2 class="srun-title">${esc(st.ex.name)}</h2>
          <div class="srun-timer srun-timer-lg">
            ${timerRing('sky')}
            <div class="srun-timer-in"><div class="srun-big" data-clock>${fmtLong(st.seconds)}</div></div>
          </div>
          <p class="srun-note">${esc(st.note || '')}</p>
          <ul class="cues">${st.ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          <div class="srun-actions">
            <button class="btn btn-ghost" data-pause>${st.inicioBloco ? 'Começar' : 'Pausar'}</button>
            <button class="btn btn-ghost" data-add="300">+5 min</button>
          </div>
          <button class="btn btn-primary btn-big" data-next>Terminei</button>
        </div>`;
      timer = countdown(st.seconds, {
        tone: 'work',
        onTick: s => { const c = root.querySelector('[data-clock]'); if (c) c.textContent = fmtLong(s); },
        onFrame: f => setRing(root, f),
        onDone: () => { beep('done'); },
      });
      if (st.inicioBloco) esperarInicio();
    } else {
      const isTime = st.mode === 'time';
      const rx = isTime ? `${st.seconds}s` : (st.reps ? (st.reps[0] === st.reps[1] ? `${st.reps[0]} reps` : `${st.reps[0]}–${st.reps[1]} reps`) : '');
      const load = st.load?.kg ? `<span class="pill pill-load">${st.load.kg} kg</span>` : (st.load ? `<span class="pill">${esc(st.load.note)}</span>` : '');
      root.innerHTML = `${header}
        <div class="srun srun-work">
          <div class="srun-kicker">${esc(st.label)}${st.side ? ` · ${esc(st.side)}` : ''}</div>
          <h2 class="srun-title">${esc(st.ex.name)}</h2>
          <div class="srun-illu${isTime ? ' srun-illu-sm' : ''}" data-info role="button" tabindex="0" aria-label="Ver detalhes do exercício">
            ${hasPose(st.ex.id) ? `<div data-fig="${st.ex.id}" class="${isTime ? 'srun-illu-sm' : ''}"></div>` : illustration(st.ex, isTime ? 130 : 150)}
            <span class="srun-info">i</span>
          </div>
          ${isTime ? `
          <div class="srun-timer srun-timer-sm">
            ${timerRing('mint')}
            <div class="srun-timer-in"><div class="srun-big" data-clock>${relogio(st.seconds)}</div></div>
          </div>
          ` : `<div class="srun-big srun-reps">${esc(rx)}</div>`}
          <div class="srun-chips">${load}${st.ex.tempo ? `<span class="pill">${esc(st.ex.tempo)}</span>` : ''}</div>
          <ul class="cues">${st.ex.cues.slice(0, 3).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          ${isTime && st.inicioBloco ? `<p class="srun-novo">Novo bloco: o relógio espera por ti.</p>` : ''}
          ${isTime ? `<div class="srun-actions"><button class="btn ${st.inicioBloco ? 'btn-primary' : 'btn-ghost'}" data-pause>${st.inicioBloco ? 'Começar' : 'Pausar'}</button><button class="btn btn-ghost" data-add="10">+10s</button></div>` : ''}
          ${isTime
            ? `<button class="link srun-skip" data-next>Saltar exercício</button>`
            : `<button class="btn btn-primary btn-big" data-next>Feito</button>`}
          ${st.item?.homeAlt ? `<button class="btn btn-ghost" data-swap-now="${st.ex.id}" data-alt="${st.item.homeAlt.id}">Trocar por ${esc(st.item.homeAlt.name)}</button>` : ''}
        </div>`;
      if (isTime) {
        if (!st.inicioBloco) beep('go');
        timer = countdown(st.seconds, {
          tone: 'work',
          onTick: s => { const c = root.querySelector('[data-clock]'); if (c) c.innerHTML = relogio(s); },
          onFrame: f => setRing(root, f),
          onDone: () => advance(),
        });
        if (st.inicioBloco) esperarInicio();
      }
      if (st.item?.kind === 'strength') results[st.ex.id] = results[st.ex.id] || { done: true, top: true, rpe: null, kg: st.load?.kg ?? null };
    }
    bind();
    mountFigs();
  }

  function bind() {
    root.querySelector('[data-exit]')?.addEventListener('click', () => {
      if (confirm('Sair da sessão? O que já fizeste pode ser registado no fim.')) { finish(true); }
    });
    root.querySelector('[data-next]')?.addEventListener('click', () => advance());
    root.querySelector('[data-pause]')?.addEventListener('click', e => {
      if (!timer) return;
      if (aEspera) {
        // o arranque de um bloco: o sinal de partida só soa quando ele carrega
        aEspera = false;
        beep('go');
        timer.resume();
        e.target.textContent = 'Pausar';
        e.target.classList.replace('btn-primary', 'btn-ghost');
        root.querySelector('.srun-novo')?.remove();
        return;
      }
      if (timer.paused) { timer.resume(); e.target.textContent = 'Pausar'; } else { timer.pause(); e.target.textContent = 'Continuar'; }
    });
    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      timer?.add(Number(b.dataset.add));
      const st = steps[i]; const c = root.querySelector('[data-clock]');
      if (c && st) { /* o tick seguinte atualiza */ }
    }));
    root.querySelector('[data-swap-now]')?.addEventListener('click', e => {
      const from = e.currentTarget.dataset.swapNow, to = e.currentTarget.dataset.alt;
      update(s => { s.swaps[dateISO] = { ...(s.swaps[dateISO] || {}), [from]: to }; });
      for (const st of steps) { if (st.ex?.id === from) st.ex = BY_ID[to]; if (st.next?.id === from) st.next = BY_ID[to]; }
      toast('Trocado pela versão em casa');
      renderStep();
    });
    const info = root.querySelector('[data-info]');
    if (info) {
      const open = () => showInfo(steps[i].ex);
      info.addEventListener('click', open);
      info.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  }

  // Relógio parado à espera de "Começar", no primeiro exercício de cada bloco.
  let aEspera = false;
  function esperarInicio() { aEspera = true; timer.pause(); }

  function showInfo(ex) {
    // se já estava parado (pausa dele ou à espera de começar), fechar não o arranca
    const jaParado = !!timer?.paused;
    timer?.pause();
    const dlg = document.createElement('div');
    dlg.className = 'sheet';
    dlg.innerHTML = `<div class="sheet-body">
      <div class="sheet-handle"></div>
      <h3>${esc(ex.name)}</h3>
      <p class="muted">${esc(ex.nameEn)} · ${esc(ex.muscles.join(' · '))}</p>
      <ol class="steps">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
      ${ex.mistakes.length ? `<h4>Erros comuns</h4><ul class="mistakes">${ex.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      <a class="btn btn-yt" href="${ytUrl(ex)}" target="_blank" rel="noopener">▶ Ver vídeo</a>
      <button class="btn btn-primary" data-close>Voltar à sessão</button>
      ${hasPose(ex.id) ? `<button class="link srun-flag" data-flag>${figuraMarcada(ex.id) ? 'Figura marcada como errada — desmarcar' : 'Esta figura está mal'}</button>` : ''}
    </div>`;
    root.appendChild(dlg);
    const close = () => { dlg.remove(); if (!jaParado) timer?.resume(); };
    dlg.querySelector('[data-close]').addEventListener('click', close);
    // Marcar no meio do treino tem de ser um toque e ficar ali: nada de escrever nem
    // de sair do exercício. A nota, se ele quiser, escreve-se depois no Perfil.
    dlg.querySelector('[data-flag]')?.addEventListener('click', e => {
      const on = marcarFigura(ex.id);
      e.target.textContent = on ? 'Figura marcada como errada — desmarcar' : 'Esta figura está mal';
      toast(on ? 'Figura marcada. Fica no Perfil.' : 'Marca removida');
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  }

  function advance() { stopTimer(); i += 1; renderStep(); }

  // ---- registo ----
  function finish(early = false) {
    if (finished) return;
    finished = true;
    stopTimer();
    stopFig();
    keepAwake(false);
    if (!soRegistar) beep('done');
    // Tempo que a app viu passar. Numa corrida feita sem telemóvel é só o tempo de
    // registar — por isso, mais abaixo, ganha o tempo que ele escreve se for maior.
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const strength = session.blocks.flatMap(b => b.kind === 'strength' ? b.items : []);
    const cardio = session.blocks.flatMap(b => b.kind === 'cardio' ? b.items : [])[0];
    const isInterval = session.blocks.some(b => b.kind === 'hiit' || b.kind === 'circuit');
    root.innerHTML = `
      <header class="srun-top"><span class="srun-count">Registo</span></header>
      <div class="srun srun-log">
        <div class="srun-kicker">${soRegistar ? 'Registar treino feito' : early ? 'Sessão interrompida' : 'Sessão terminada'}</div>
        <h2 class="srun-title">${esc(session.title)}</h2>
        <div class="stats">${cardio && soRegistar ? '' : `<div class="stat"><span class="stat-n">${minutes}</span><span class="stat-l">min</span></div>`}${weekAfter()}</div>
        ${strength.length ? `<ul class="loglist">${strength.map(it => {
          const r = results[it.ex.id] || { done: false, top: true, rpe: null, kg: it.load?.kg ?? null };
          return `<li class="logrow" data-log="${it.ex.id}">
            <div class="logrow-head">
              <label class="toggle"><input type="checkbox" data-done ${r.done ? 'checked' : ''}><span><strong>${esc(it.ex.name)}</strong><small>${esc(prescription(it))}</small></span></label>
            </div>
            <div class="logrow-body">
              ${it.reps ? `<label class="toggle small"><input type="checkbox" data-top ${r.top ? 'checked' : ''}><span>Atingi o topo das reps</span></label>` : ''}
              ${it.ex.load ? `<div class="kg"><button type="button" data-kg="-1">−</button><input type="number" inputmode="decimal" step="0.5" min="0" value="${r.kg ?? ''}" placeholder="kg" data-kg-input><button type="button" data-kg="1">+</button><span>kg</span></div>` : ''}
              <div class="rpe">${RPE.map(x => `<button type="button" class="${r.rpe === x.value ? 'on' : ''}" data-rpe="${x.value}" title="${esc(x.hint)}">${esc(x.label)}</button>`).join('')}</div>
            </div>
          </li>`;
        }).join('')}</ul>` : ''}
        ${isInterval ? `<div class="card"><h4>Como correu?</h4><div class="rpe" data-session-rpe>${RPE.map(x => `<button type="button" data-rpe="${x.value}">${esc(x.label)}</button>`).join('')}</div></div>` : ''}
        ${cardio ? `<div class="card cardio-log">
          <h4>${esc(cardio.ex.name)}</h4>
          <div class="grid2">
            <div class="field"><span>Tempo</span>
              ${camposMmss(cardio.time)}
            </div>
            <label class="field"><span>${cardio.ex.chain === 'swim' ? 'Metros' : 'Km'}</span><input type="number" inputmode="decimal" step="${cardio.ex.chain === 'swim' ? '50' : '0.1'}" placeholder="${cardio.ex.chain === 'swim' ? '800' : '5.0'}" data-c-dist></label>
          </div>
          <div class="rpe" data-cardio-rpe>${RPE.map(x => `<button type="button" data-rpe="${x.value}">${esc(x.label)}</button>`).join('')}</div>
          <label class="toggle small"><input type="checkbox" data-knee-pain><span>O joelho queixou-se</span></label>
        </div>` : ''}
        <label class="field"><span>Nota (opcional)</span><input type="text" data-note placeholder="Como te sentiste"></label>
        <button class="btn btn-primary btn-big" data-save>Guardar treino</button>
        <button class="link srun-discard" data-discard>Sair sem guardar</button>
      </div>`;

    // bindings do registo
    ligarMmss(root);
    root.querySelectorAll('.logrow').forEach(row => {
      const id = row.dataset.log; const r = results[id] = results[id] || { done: false, top: true, rpe: null, kg: null };
      row.querySelector('[data-done]')?.addEventListener('change', e => { r.done = e.target.checked; row.classList.toggle('off', !r.done); });
      row.classList.toggle('off', !r.done);
      row.querySelector('[data-top]')?.addEventListener('change', e => { r.top = e.target.checked; });
      const kgInput = row.querySelector('[data-kg-input]');
      kgInput?.addEventListener('change', () => { r.kg = kgInput.value === '' ? null : Number(kgInput.value); });
      row.querySelectorAll('[data-kg]').forEach(b => b.addEventListener('click', () => {
        const v = (Number(kgInput.value) || 0) + Number(b.dataset.kg); kgInput.value = Math.max(0, v); r.kg = Math.max(0, v);
      }));
      row.querySelectorAll('[data-rpe]').forEach(b => b.addEventListener('click', () => {
        r.rpe = Number(b.dataset.rpe); row.querySelectorAll('[data-rpe]').forEach(x => x.classList.toggle('on', x === b));
      }));
    });
    let sessionRpe = null, cardioRpe = null;
    root.querySelectorAll('[data-session-rpe] [data-rpe]').forEach(b => b.addEventListener('click', () => { sessionRpe = Number(b.dataset.rpe); b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));
    root.querySelectorAll('[data-cardio-rpe] [data-rpe]').forEach(b => b.addEventListener('click', () => { cardioRpe = Number(b.dataset.rpe); b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));

    root.querySelector('[data-discard]').addEventListener('click', () => nav.go('home'));
    root.querySelector('[data-save]').addEventListener('click', () => {
      const antes = contasDaSemana(getState(), new Date(dateISO));
      const events = applyProgressionAndSave();
      const depois = contasDaSemana(getState(), new Date(dateISO));
      const fechou = oQueFechou(antes, depois);
      if (fechou.semana) { montarFecho(root, nav, new Date(dateISO), { antesFeitos: antes.feitos, events }); return; }
      nav.go('home');
      // O anel do tempo sozinho vale uma linha, não um ecrã: é o menos importante
      // dos três e fecha-se também com treinos mais longos, sem mérito de constância.
      const linhaTempo = fechou.tempo ? `Tempo da semana fechado: ${depois.minsDone} de ${depois.minsPlan} min` : null;
      const avisos = [...events.slice(0, 1), ...(linhaTempo ? [linhaTempo] : [])];
      if (!avisos.length) toast('Sessão guardada');
      avisos.forEach((t, k) => setTimeout(() => toast(t), 300 + k * 3000));
    });

    function applyProgressionAndSave() {
      let events = [];
      const log = {
        date: session.date, type: session.type, title: session.title, completed: true, early, minutes,
        results: JSON.parse(JSON.stringify(results)), note: root.querySelector('[data-note]')?.value?.trim() || '',
        sessionRpe,
      };
      if (cardio) {
        const dist = Number(root.querySelector('[data-c-dist]')?.value) || null;
        const unit = cardio.ex.chain === 'swim' ? 'm' : 'km';
        // Minutos e segundos escritos à parte. "75 segundos" vira 1:15 em vez de dar
        // erro: o que ele quis dizer é óbvio e recusar só o obrigava a fazer a conta.
        const seconds = lerMmss(root) || cardio.time;
        log.cardio = { ex: cardio.ex.id, seconds, minutes: seconds / 60, dist, unit, rpe: cardioRpe, kneePain: !!root.querySelector('[data-knee-pain]')?.checked };
        // O tempo que conta na semana é o maior dos dois: o que a app viu e o que ele
        // escreveu. Sem telemóvel ganha o escrito; com a sessão guiada ligada do
        // princípio ao fim, ganha o da app, que inclui aquecimento e alongamentos.
        log.minutosApp = log.minutes;
        log.minutes = Math.max(log.minutes, Math.round(seconds / 60));
        if (log.cardio.kneePain) { update(s => { s.kneeFlag = true; }); events.push('Joelho a queixar-se: a próxima corrida passa a piscina'); }
      }
      update(s => {
        const ev = applyProgression(s, session, results);
        events = events.concat(ev.map(frase));
      });
      const doneN = strength.filter(it => results[it.ex.id]?.done).length;
      log.summary = strength.length ? `${doneN} de ${strength.length} exercícios · ${log.minutes} min`
        : log.cardio ? `${mmss(log.cardio.seconds)}${log.cardio.dist ? ` · ${log.cardio.dist} ${log.cardio.unit}` : ''}`
        : `${log.minutes} min`;
      log.events = events;
      saveLog(log);
      return events;
    }
  }

  if (soRegistar) finish(false);
  else renderStep();
  return () => { stopTimer(); stopFig(); keepAwake(false); };
}

const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

// "45s" abaixo do minuto; acima, "1:10" já diz a unidade e o "s" ficava a mais
const relogio = sec => (Math.round(sec) >= 60 ? fmt(sec) : `${fmt(sec)}<small>s</small>`);
