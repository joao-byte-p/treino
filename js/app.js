import { getState, update, subscribe } from './store.js';
import { applyPendingGoal } from './engine/planner.js';
import { renderHome, renderPlan, renderDay, renderLibrary, renderExercise, renderProgress, renderSettings, bindSettings } from './ui/views.js';
import { mountSession } from './ui/session.js';
import { toast } from './ui/components.js';
import { mountFigure } from './ui/figure.js';
import { chainLevels } from './data/exercises.js';

const view = document.getElementById('view');
const tabs = document.getElementById('tabs');
const app = document.getElementById('app');

let route = { name: 'home' };
const history = [];
let cleanup = null;
let figOffs = [];
let planOffset = 0;
let libQuery = '';
let libFilter = 'todos';
let libMine = false;

const TAB_OF = { home: 'home', plan: 'plan', day: 'plan', library: 'library', exercise: 'library', progress: 'progress', settings: 'settings' };

const nav = {
  go(name, params = {}) {
    if (route.name !== name || JSON.stringify(route.params) !== JSON.stringify(params)) history.push(route);
    if (history.length > 20) history.shift();
    route = { name, params };
    render();
  },
  back() { route = history.pop() || { name: 'home' }; render(); },
  rerender() { render(false); },
};

function render(scrollTop = true) {
  if (cleanup) { cleanup(); cleanup = null; }
  figOffs.forEach(fn => fn());
  figOffs = [];
  const state = getState();
  if (!state.onboarded && route.name !== 'onboarding') { route = { name: 'onboarding' }; }
  const inSession = route.name === 'session';
  app.classList.toggle('in-session', inSession);
  tabs.hidden = inSession || route.name === 'onboarding';

  let html = '';
  switch (route.name) {
    case 'onboarding': html = renderSettings(nav, true); break;
    case 'home': html = renderHome(nav); break;
    case 'plan': html = renderPlan(nav, planOffset); break;
    case 'day': html = renderDay(nav, route.params.date, route.params.alt ?? null); break;
    case 'library': html = renderLibrary(nav, libQuery, libFilter, libMine); break;
    case 'exercise': html = renderExercise(nav, route.params.id); break;
    case 'progress': html = renderProgress(nav); break;
    case 'settings': html = renderSettings(nav, false); break;
    case 'session':
      view.innerHTML = '';
      cleanup = mountSession(view, nav, route.params.date, route.params.alt ?? null);
      return;
  }
  view.innerHTML = html;
  view.querySelectorAll('[data-fig]').forEach(hostEl => {
    figOffs.push(mountFigure(hostEl, hostEl.dataset.fig, { size: 300, maxH: 300, period: 3400, animate: state.profile.animate !== false }));
  });
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
  if (scrollTop) window.scrollTo(0, 0);

  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === TAB_OF[route.name]));
  if (route.name === 'onboarding' || route.name === 'settings') bindSettings(view, nav, route.name === 'onboarding');
  if (route.name === 'library') {
    const inp = view.querySelector('[data-lib-search]');
    inp?.addEventListener('input', () => { libQuery = inp.value; const pos = inp.selectionStart; render(false); const n = view.querySelector('[data-lib-search]'); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch { /* ok */ } });
    view.querySelectorAll('[data-lib-filter]').forEach(b => b.addEventListener('click', () => { libFilter = b.dataset.libFilter; render(false); }));
    view.querySelector('[data-lib-mine]')?.addEventListener('change', e => { libMine = e.target.checked; render(false); });
  }
  if (route.name === 'exercise') {
    view.querySelector('[data-anim-toggle]')?.addEventListener('click', e => {
      update(s => { s.profile.animate = s.profile.animate === false; });
      e.target.textContent = getState().profile.animate === false ? 'Voltar a animar' : 'Parar o movimento';
      render(false);
    });
  }
  if (route.name === 'exercise') {
    view.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
      const chain = b.dataset.level, dir = Number(b.dataset.dir);
      update(s => { const max = chainLevels(chain).length; s.chainLevels[chain] = Math.min(max, Math.max(1, (s.chainLevels[chain] || 1) + dir)); s.chainStreak[chain] = 0; });
      toast('Nível ajustado'); render(false);
    }));
  }
  view.querySelectorAll('[data-swap]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const date = route.params.date; if (!date) return;
    update(s => { s.swaps[date] = { ...(s.swaps[date] || {}), [b.dataset.swap]: b.dataset.alt }; });
    toast('Trocado pela versão em casa'); render(false);
  }));
  view.querySelectorAll('[data-unswap]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const date = route.params.date; if (!date) return;
    update(s => {
      if (!s.swaps[date]) return;
      delete s.swaps[date][b.dataset.unswap];
      if (!Object.keys(s.swaps[date]).length) delete s.swaps[date];
    });
    toast('Voltou ao exercício de barra'); render(false);
  }));
}

// teclado: o que é tocável mas não é <button> responde a Enter e espaço
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-nav][role="button"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

// navegação por delegação
document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav]');
  if (!el || el.closest('.srun')) return;
  const n = el.dataset.nav;
  if (n === 'back') return nav.back();
  if (n === 'session') return nav.go('session', { date: el.dataset.date, alt: el.dataset.alt != null ? Number(el.dataset.alt) : null });
  if (n === 'day') return nav.go('day', { date: el.dataset.date, alt: el.dataset.alt != null ? Number(el.dataset.alt) : null });
  if (n === 'exercise') return nav.go('exercise', { id: el.dataset.ex });
  nav.go(n);
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-plan-offset]');
  if (b) { planOffset = Number(b.dataset.planOffset); render(); }
});
tabs.addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'plan') planOffset = 0;
  history.length = 0;
  nav.go(b.dataset.tab);
});

// objetivo agendado
update(s => { if (applyPendingGoal(s)) setTimeout(() => toast('Novo ciclo: objetivo atualizado'), 500); });

// service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão disponível. Fecha e reabre a app.'); });
    });
  }).catch(() => { /* offline ou file:// */ });
}

subscribe(() => { /* reservado para sincronização (fase 3) */ });
render();
