import { PATTERN_LABEL, EQUIPMENT_LABEL } from '../data/exercises.js';
import { hasPose, figureSVG } from './figure.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ringSeq = 0;
// Anel com degradê ao longo do arco, como os da Bevel. As cores vêm de variáveis CSS
// para o tema claro as poder trocar sem tocar aqui. Cada anel leva o seu gradiente,
// senão dois anéis no mesmo ecrã partilhavam o id e o segundo ficava sem cor.
export function ring(pct, { size = 64, stroke = 6, tone = 'mint', label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  const gid = `rg${++ringSeq}`;
  return `
  <svg class="ring ring-${tone}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color: var(--g-${tone}-a)"/><stop offset="1" style="stop-color: var(--g-${tone}-b)"/>
    </linearGradient></defs>
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="url(#${gid})"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

// Anel assente num poço, com o número dentro e o rótulo por baixo.
export function dial(pct, { num, unit = '', label, sub = '', tone = 'mint' }) {
  return `<div>
    <div class="dial"><div class="dial-well"></div>${ring(pct, { size: 94, stroke: 9, tone, label })}
      <div class="dial-num">${esc(num)}${unit ? `<small>${esc(unit)}</small>` : ''}</div></div>
    <div class="dial-l">${esc(label)}</div>${sub ? `<div class="dial-sub">${esc(sub)}</div>` : ''}
  </div>`;
}

// Mosaico de métrica: ícone e rótulo em cima, número grande e unidade em baixo.
const ICONS = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h11M8 12h11M8 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  // material (engine/material.js)
  halter: '<svg viewBox="0 0 24 24"><path d="M8 12h8"/><rect x="4.5" y="7.5" width="3.5" height="9" rx="1"/><rect x="16" y="7.5" width="3.5" height="9" rx="1"/><path d="M2.5 10v4M21.5 10v4"/></svg>',
  board: '<svg viewBox="0 0 24 24"><rect x="2.5" y="13" width="19" height="4" rx="2"/><path d="M7 13v-2.5a1.5 1.5 0 0 1 3 0V13M14 13v-2.5a1.5 1.5 0 0 1 3 0V13"/></svg>',
  corda: '<svg viewBox="0 0 24 24"><path d="M5 4v5M19 4v5"/><path d="M5 9c0 8 3 11 7 11s7-3 7-11"/></svg>',
  cadeira: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="7" rx="1.5"/><path d="M5 13h14M7 13v8M17 13v8M8 10v3M16 10v3"/></svg>',
  toalha: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M5 8h14M9 15h6"/></svg>',
  saco: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

export const icone = nome => ICONS[nome] || '';

// "Leva contigo": a lista compacta, na Home e na página do dia.
export function levaContigo(itens) {
  if (!itens.length) return '';
  return `<div class="leva"><div class="leva-h">Leva contigo</div>
    <ul class="leva-l">${itens.map(i => `<li>${icone(i.icon)}<span>${esc(i.nome)}${i.detalhe ? ` <small>${esc(i.detalhe)}</small>` : ''}</span></li>`).join('')}</ul></div>`;
}
export function tile({ icon = 'clock', label, num, unit = '' }) {
  return `<div class="tile"><div class="tile-h">${ICONS[icon] || ''}<span>${esc(label)}</span></div>
    <div class="tile-n">${esc(num)}${unit ? `<small>${esc(unit)}</small>` : ''}</div></div>`;
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
  // no teto dos halteres a pastilha do peso muda de cor: o número parou de subir de propósito
  const load = showLoad && item.load ? (item.load.kg ? `<span class="pill pill-load${item.load.teto ? ' pill-teto' : ''}"${item.load.teto ? ' title="No teto dos teus halteres"' : ''}>${item.load.kg} kg</span>` : '') : '';
  const alt = swappable && item.homeAlt
    ? `<button class="swap" data-swap="${ex.id}" data-alt="${item.homeAlt.id}" aria-label="Trocar por ${esc(item.homeAlt.name)}">⇄ casa</button>`
    : (swappable && item.swappedFrom
      ? `<button class="swap swap-back" data-unswap="${item.swappedFrom.id}" aria-label="Voltar a ${esc(item.swappedFrom.name)}">⇄ barra</button>`
      : '');
  const chev = linked ? '<span class="exrow-chev" aria-hidden="true">›</span>' : '';
  return `
  <li class="exrow" data-ex="${ex.id}"${linked ? ` data-nav="exercise" role="button" tabindex="0" aria-label="Ver ${esc(ex.name)}"` : ''}>
    <div class="exrow-thumb" aria-hidden="true">${illustration(ex, 44)}</div>
    <div class="exrow-body">
      <div class="exrow-name">${esc(ex.name)}</div>
      <div class="exrow-meta">${esc(prescription(item))}${item.repBonus || item.timeBonus ? ` <span class="meta-bonus">+${item.repBonus || item.timeBonus}${item.timeBonus ? 's' : ''}</span>` : ''}${item.rest && item.kind === 'strength' ? ` · ${item.rest}s pausa` : ''}</div>
    </div>
    <div class="exrow-right">${load}${alt}${chev}</div>
  </li>`;
}

// Figura articulada quando o exercício já tem pose; senão, glifo genérico.
export function illustration(ex, size = 120) {
  // Miniatura: recorte quadrado centrado no corpo, para todas terem o mesmo peso
  // dentro da caixa. Com o viewBox da cena, metade delas saía fora — o dips em
  // paralelas desenhava-se a 132px numa caixa de 56.
  // Acima disso mostra-se a cena inteira (chão, parede, barra), limitada em altura.
  if (!hasPose(ex.id)) return glyph(ex, size);
  return size < 90
    ? figureSVG(ex.id, { size, square: true, showProps: false })
    : figureSVG(ex.id, { size, maxH: size, showProps: true });
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

// Anel de contagem: comunica tempo a esvaziar-se, que se lê de relance melhor
// do que um número a decrescer.
const RING_R = 54;
export const RING_C = 2 * Math.PI * RING_R;
export function timerRing(tone = 'mint') {
  const gid = `tg${++ringSeq}`;
  return `<svg class="tring tring-${tone}" viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style="stop-color: var(--g-${tone}-a)"/><stop offset="1" style="stop-color: var(--g-${tone}-b)"/>
    </linearGradient></defs>
    <circle class="tring-track" cx="60" cy="60" r="${RING_R}"/>
    <circle class="tring-fill" cx="60" cy="60" r="${RING_R}" stroke="url(#${gid})"
      stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>
  </svg>`;
}
export function setRing(root, frac) {
  const el = root.querySelector('.tring-fill');
  if (el) el.setAttribute('stroke-dashoffset', (RING_C * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1));
}

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

// Campos de minutos e segundos. Vêm preenchidos com o tempo previsto, e no iPhone
// escrever num campo preenchido acrescenta ao que lá está: "00" + "24" dava "0024",
// e um 25:24 ficava 25:2400. Ao tocar, seleciona tudo, e o que se escreve substitui.
// Os segundos guardam só os dois últimos algarismos, que é o que ele quis escrever.
export function ligarMmss(root) {
  root.querySelectorAll('[data-c-min], [data-c-seg]').forEach(inp => {
    const max = inp.matches('[data-c-seg]') ? 2 : 3;
    const tudo = () => { try { inp.select(); } catch { /* alguns teclados não deixam */ } };
    // no iPhone o toque que dá o foco desfaz a seleção feita no mesmo instante
    inp.addEventListener('focus', () => { tudo(); setTimeout(tudo, 0); });
    inp.addEventListener('mouseup', e => e.preventDefault()); // o clique não desfaz a seleção
    inp.addEventListener('input', () => {
      const so = inp.value.replace(/\D/g, '');
      if (so.length > max) inp.value = so.slice(-max);
    });
  });
}

export function lerMmss(root) {
  const mi = Math.max(0, Math.floor(Number(root.querySelector('[data-c-min]')?.value) || 0));
  const se = Math.max(0, Math.floor(Number(root.querySelector('[data-c-seg]')?.value) || 0));
  return mi * 60 + se;
}

export function camposMmss(segundos) {
  return `<div class="mmss">
    <label><input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="600" value="${Math.floor(segundos / 60)}" data-c-min aria-label="Minutos"><small>min</small></label>
    <label><input type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="59" value="${String(Math.round(segundos % 60)).padStart(2, '0')}" data-c-seg aria-label="Segundos"><small>s</small></label>
  </div>`;
}
