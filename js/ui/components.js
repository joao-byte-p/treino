import { PATTERN_LABEL, EQUIPMENT_LABEL } from '../data/exercises.js';
import { hasPose, figureSVG } from './figure.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ring(pct, { size = 64, stroke = 6, tone = 'mint', label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return `
  <svg class="ring ring-${tone}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export function prescription(item) {
  if (item.kind === 'interval') return `${item.work}s / ${item.rest}s`;
  if (item.kind === 'cardio') return `${Math.round(item.time / 60)} min`;
  const side = item.perSide ? ' / lado' : '';
  const sets = item.sets && item.sets > 1 ? `${item.sets} × ` : '';
  if (item.time) return `${sets}${item.time}s${side}`;
  if (item.reps) return `${sets}${item.reps[0] === item.reps[1] ? item.reps[0] : `${item.reps[0]}–${item.reps[1]}`}${side}`;
  return '';
}

export function exerciseRow(item, { showLoad = true, swappable = false, linked = false } = {}) {
  const ex = item.ex;
  const load = showLoad && item.load ? (item.load.kg ? `<span class="pill pill-load">${item.load.kg} kg</span>` : '') : '';
  const alt = swappable && item.homeAlt ? `<button class="swap" data-swap="${ex.id}" data-alt="${item.homeAlt.id}" aria-label="Trocar por ${esc(item.homeAlt.name)}">⇄ casa</button>` : '';
  const chev = linked ? '<span class="exrow-chev" aria-hidden="true">›</span>' : '';
  return `
  <li class="exrow" data-ex="${ex.id}"${linked ? ` data-nav="exercise"` : ''}>
    <div class="exrow-thumb" aria-hidden="true">${illustration(ex, 44)}</div>
    <div class="exrow-body">
      <div class="exrow-name">${esc(ex.name)}</div>
      <div class="exrow-meta">${esc(prescription(item))}${item.rest && item.kind === 'strength' ? ` · ${item.rest}s pausa` : ''}</div>
    </div>
    <div class="exrow-right">${load}${alt}${chev}</div>
  </li>`;
}

// Figura articulada quando o exercício já tem pose; senão, glifo genérico.
export function illustration(ex, size = 120) {
  if (hasPose(ex.id)) return figureSVG(ex.id, { size, showProps: size >= 90 });
  return glyph(ex, size);
}

function glyph(ex, size = 120) {
  const path = {
    push: 'M6 30 L26 18 L44 22 M26 18 L28 8', pull: 'M8 10 L24 22 L44 18 M24 22 L22 34', squat: 'M14 8 L24 8 L28 22 L18 30 L28 40', knee: 'M20 6 L24 22 L18 40',
    hinge: 'M8 12 L26 16 L40 34 M26 16 L36 8', glute: 'M6 30 L20 20 L40 24 L44 34', core: 'M6 26 L44 26 M24 26 L24 14', hiit: 'M8 40 L20 10 L30 30 L42 6',
    mobility: 'M10 40 Q24 4 40 40', cardio: 'M6 34 L18 20 L26 30 L44 10', warmup: 'M10 26 Q24 10 38 26 Q24 42 10 26',
  }[ex.pattern] || 'M8 24 L44 24';
  return `<svg class="illu illu-${ex.pattern}" viewBox="0 0 50 48" width="${size}" height="${size * 0.96}" aria-hidden="true">
    <circle cx="25" cy="24" r="22" class="illu-bg"/>
    <path d="${path}" class="illu-line"/>
  </svg>`;
}

export function chip(text, cls = '') { return `<span class="chip ${cls}">${esc(text)}</span>`; }

export function patternLabel(p) { return PATTERN_LABEL[p] || p; }
export function equipmentLabel(e) { return EQUIPMENT_LABEL[e] || e; }

export function ytUrl(ex) {
  return ex.ytId ? `https://www.youtube.com/watch?v=${ex.ytId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.yt)}`;
}

export function dateLabel(d = new Date()) {
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function toast(msg, ms = 2600) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}
