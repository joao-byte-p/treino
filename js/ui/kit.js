// Guias do material. Duas vistas: a lista e a página de um aparelho.
import { KIT, KIT_BY_ID } from '../data/kit.js';
import { EXERCISES } from '../data/exercises.js';
import { esc, illustration } from './components.js';

// Onde ficam as mãos, visto de cima. Desenho as mãos e não a placa de propósito:
// eu não sei a disposição exacta dos furos do modelo dele, e inventá-la seria
// pior do que não desenhar nada. O que decide o músculo é a posição da mão em
// relação ao peito — isso sei, e é transferível para qualquer placa.
function topo({ largura, altura, rot }) {
  const pega = (x, r) => `<g transform="translate(${x} ${altura}) rotate(${r})">
      <rect class="kit-pega" x="-9" y="-2.6" width="18" height="5.2" rx="2.6"/>
      <rect class="kit-mao" x="-3.4" y="-4.4" width="6.8" height="8.8" rx="3"/>
    </g>`;
  return `<svg class="kit-topo" viewBox="0 0 100 74" width="100%" height="auto" aria-hidden="true">
    <ellipse class="kit-corpo" cx="50" cy="40" rx="11" ry="26"/>
    <circle class="kit-corpo" cx="50" cy="11" r="7"/>
    <line class="kit-braco" x1="${50 - largura}" y1="${altura}" x2="${41}" y2="26"/>
    <line class="kit-braco" x1="${50 + largura}" y1="${altura}" x2="${59}" y2="26"/>
    ${pega(50 - largura, -rot)}${pega(50 + largura, rot)}
  </svg>`;
}

export function renderKit(nav) {
  return `
  <header class="top"><button class="iconbtn" data-nav="back" aria-label="Voltar">‹</button>
    <div><div class="eyebrow">Material</div><h1>Como usar</h1></div></header>
  <p class="foot muted">Saber o exercício e saber usar o aparelho são duas coisas. Isto é a segunda — e vale para todos os exercícios que o usem, por isso não cabia na ficha de nenhum.</p>
  <ul class="kitlist">${KIT.map(k => {
    const n = EXERCISES.filter(e => e.equipment.includes(k.equip)).length;
    return `<li class="kitrow" data-nav="kit-item" data-kit="${k.id}" role="button" tabindex="0" aria-label="Guia: ${esc(k.name)}">
      <div class="kitrow-body">
        <div class="kitrow-name">${esc(k.name)}</div>
        <div class="kitrow-sub">${esc(k.resumo)}</div>
        <div class="kitrow-meta">${n} ${n === 1 ? 'exercício' : 'exercícios'}${k.modelo ? ` · ${esc(k.modelo)}` : ''}</div>
      </div>
      <span class="kitrow-go" aria-hidden="true">›</span>
    </li>`;
  }).join('')}</ul>`;
}

export function renderKitItem(nav, id) {
  const k = KIT_BY_ID[id];
  if (!k) return '<p class="foot muted">Guia não encontrado.</p>';
  const usados = EXERCISES.filter(e => e.equipment.includes(k.equip));
  const bloco = (titulo, corpo) => (corpo ? `<section class="card"><h3>${titulo}</h3>${corpo}</section>` : '');

  return `
  <header class="top"><button class="iconbtn" data-nav="back" aria-label="Voltar">‹</button>
    <div><div class="eyebrow">Material</div><h1>${esc(k.name)}</h1>
    ${k.modelo ? `<p class="sub">${esc(k.modelo)}</p>` : ''}</div></header>

  ${k.posicoes.length ? `<section class="card">
    <h3>As posições <span class="muted">${k.posicoes.length}</span></h3>
    <p class="muted small">As cores são as do boneco impresso ao centro da placa. Põe as duas pegas nos furos da cor que queres; o desenho mostra onde isso te deixa as mãos em relação ao peito.</p>
    <ul class="kitpos">${k.posicoes.map(p => `<li>
      <div class="kitpos-art">${topo(p)}</div>
      <div class="kitpos-head">
        <div class="kitpos-cortag">${p.hex ? `<i class="kitpos-cor" style="background:${p.hex}"></i>` : ''}<span>${esc(p.cor || '')}</span></div>
        <div class="kitpos-name">${esc(p.alvo)}</div>
        <div class="kitpos-onde">${esc(p.nome)}</div>
      </div>
      <div class="kitpos-body">
        <p>${esc(p.como)}</p>
        ${p.nota ? `<p class="kitpos-nota">${esc(p.nota)}</p>` : ''}
      </div>
    </li>`).join('')}</ul>
  </section>` : ''}

  ${k.montagem.length ? bloco('Antes de te apoiares', `<ol class="kitol">${k.montagem.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`) : ''}

  ${bloco('Erros que custam caro', `<dl class="kitdl">${k.erros.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`)}

  ${bloco('O que este aparelho faz mesmo', `<dl class="kitdl">${k.verdade.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`)}

  ${k.manual ? `<section class="card">
    <h3>O que o manual propõe <span class="muted">${k.manual.length}</span></h3>
    <p class="muted small">Os sete painéis do folheto, com o que penso de cada um. Nem todos te servem.</p>
    <ul class="kitman">${k.manual.map(([t, d, v]) => `<li class="v-${v}"><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul>
  </section>` : ''}

  ${k.rotina ? bloco('Se quiseres uma rotina só com isto', `<p>${esc(k.rotina)}</p>`) : ''}

  ${usados.length ? `<section class="card">
    <h3>No teu plano <span class="muted">${usados.length}</span></h3>
    ${k.plano ? `<p class="muted small">${esc(k.plano)}</p>` : ''}
    <ul class="exlist">${usados.map(ex => `<li class="exrow" data-nav="exercise" data-ex="${ex.id}" role="button" tabindex="0" aria-label="Ver ${esc(ex.name)}">
      <div class="exrow-thumb lg" aria-hidden="true">${illustration(ex, 56)}</div>
      <div class="exrow-body"><div class="exrow-name">${esc(ex.name)}</div><div class="exrow-meta">${esc(ex.muscles.slice(0, 2).join(' · '))}</div></div>
    </li>`).join('')}</ul>
  </section>` : ''}`;
}
