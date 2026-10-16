// Ecrã de fecho: de semana, ou de ciclo quando a semana fechada é a 4.ª.
// Abre-se a seguir a guardar o treino que fecha a semana, ou a partir da Home
// quando esse momento passou sem ele o ver (treino guardado noutro aparelho, ou
// numa versão da app que ainda não tinha isto).
import { getState, update, iso } from '../store.js';
import { contasDaSemana, semanaCompleta, semanasCompletas, destaqueDaSemana, fraseDoFecho, balancoDoCiclo, fraseDoCiclo } from '../engine/fecho.js';
import { GOALS } from '../store.js';
import { esc, ring } from './components.js';

// O fecho está por ver quando a semana está completa e ele ainda não o abriu.
// Fica no estado, e por isso viaja na sincronização: visto no iPhone, não volta a
// aparecer no iPad.
export function fechoPorVer(state, date = new Date()) {
  const c = contasDaSemana(state, date);
  return semanaCompleta(c) && !state.fechosVistos?.[iso(c.wk.monday)] ? c : null;
}

// `antesFeitos`: quantos treinos a semana tinha antes deste, para o anel partir
// de onde estava. Vindo da Home já não se sabe, e parte de um antes do fim.
export function montarFecho(root, nav, date, { antesFeitos = null, events = [] } = {}) {
  const st = getState();
  const c = contasDaSemana(st, date);
  const ciclo = c.wk.week === 4 ? balancoDoCiclo(st, date) : null;
  update(s => { s.fechosVistos = { ...(s.fechosVistos || {}), [iso(c.wk.monday)]: true }; });

  root.innerHTML = ciclo ? htmlCiclo(st, c, ciclo, events) : htmlSemana(st, c, antesFeitos, events);
  // dois frames: o primeiro pinta o anel onde estava, o segundo arranca a transição
  const arco = root.querySelector('.fecho-anel .ring-fill');
  requestAnimationFrame(() => requestAnimationFrame(() => arco?.setAttribute('stroke-dashoffset', '0')));
  const ok = root.querySelector('[data-fecho-ok]');
  ok.addEventListener('click', () => nav.go('home'));
  ok.focus({ preventScroll: true });
}

function anel(antes, total, num, label) {
  return `<div class="fecho-anel">${ring(antes / total, { size: 176, stroke: 14, tone: 'mint', label })}
    <div class="fecho-num" aria-hidden="true">${num}</div></div>`;
}

const listaEventos = (events, tirar) => {
  const deste = events.filter(e => !tirar.some(t => t.startsWith(e)));
  return deste.length ? `<ul class="events">${deste.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : '';
};

function htmlSemana(st, c, antesFeitos, events) {
  const seq = semanasCompletas(st, c.wk.monday);
  const destaque = destaqueDaSemana(st, c.wk);
  const antes = antesFeitos ?? c.planeados - 1;
  return `
    <header class="srun-top"><span class="srun-count">Semana ${c.wk.week} de 4 · ciclo ${c.wk.cycle}</span></header>
    <div class="srun fecho" role="status">
      ${anel(antes, c.planeados, `${c.feitos}<small>/${c.planeados}</small>`, `Semana completa: ${c.feitos} de ${c.planeados} treinos`)}
      <h2 class="srun-title">Semana fechada</h2>
      <p class="fecho-frase">${esc(fraseDoFecho(seq, st.profile.goal))}</p>
      <div class="stats">
        <div class="stat"><span class="stat-n">${c.minsDone}</span><span class="stat-l">${c.minsDone >= c.minsPlan ? 'min · tempo fechado' : `de ${c.minsPlan} min`}</span></div>
        <div class="stat"><span class="stat-n">${seq.atual}</span><span class="stat-l">${seq.atual === 1 ? 'semana completa' : 'semanas seguidas'}</span></div>
      </div>
      ${destaque ? `<div class="card fecho-destaque"><div class="card-kicker">Destaque da semana</div><p>${esc(destaque)}</p></div>` : ''}
      ${listaEventos(events, destaque ? [destaque] : [])}
      <button class="btn btn-primary btn-big" data-fecho-ok>Continuar</button>
    </div>`;
}

function htmlCiclo(st, c, b, events) {
  const mudou = [
    ...b.niveis.map(n => `Subiste de nível: ${n}`),
    ...b.cargas.slice(0, 3).map(x => `Mais carga — ${x}`),
    ...(b.ritmo ? [b.ritmo] : []),
  ];
  const horas = Math.round(b.minutos / 6) / 10;
  const p = st.profile;
  const objetivoNovo = p.pendingGoal ? ` E muda o objetivo: ${GOALS[p.pendingGoal]?.label || p.pendingGoal}.` : '';
  return `
    <header class="srun-top"><span class="srun-count">Ciclo ${b.ciclo} · ${b.semanas} semanas</span></header>
    <div class="srun fecho" role="status">
      ${anel(Math.max(0, b.completas - 1), b.semanas, `${b.completas}<small>/${b.semanas}</small>`, `Ciclo fechado: ${b.completas} de ${b.semanas} semanas completas`)}
      <div class="fecho-anel-l">semanas completas</div>
      <h2 class="srun-title">Ciclo ${b.ciclo} fechado</h2>
      <p class="fecho-frase">${esc(fraseDoCiclo(b, p.goal))}</p>
      <div class="stats">
        <div class="stat"><span class="stat-n">${b.feitos}<small>/${b.planeados}</small></span><span class="stat-l">treinos</span></div>
        <div class="stat"><span class="stat-n">${String(horas).replace('.', ',')}</span><span class="stat-l">horas</span></div>
        <div class="stat"><span class="stat-n">${b.niveis.length}</span><span class="stat-l">${b.niveis.length === 1 ? 'nível subido' : 'níveis subidos'}</span></div>
      </div>
      ${mudou.length ? `<div class="card fecho-destaque"><div class="card-kicker">O que mudou neste ciclo</div>
        <ul class="fecho-lista">${mudou.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <div class="card fecho-destaque"><div class="card-kicker">A seguir</div>
        <p>Segunda começa o ciclo ${b.seguinte.ciclo}, na semana 1: ${esc(b.seguinte.label.toLowerCase())}.${esc(objetivoNovo)}</p>
        <p class="muted small">${esc(b.seguinte.desc)}</p></div>
      ${listaEventos(events, mudou)}
      <button class="btn btn-primary btn-big" data-fecho-ok>Continuar</button>
    </div>`;
}
