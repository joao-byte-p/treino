// Gráficos ao estilo da Bevel: um número grande com a variação ao lado, o gráfico
// por baixo e o ponto mais recente destacado. SVG puro, sem biblioteca.
// Regras que valem para os dois: nunca desenham eixos completos (só os extremos que
// dão escala), a cor vem dos tokens, e há sempre uma alternativa em texto para quem
// usa leitor de ecrã — um gráfico sem isso é um buraco.
import { esc } from './components.js';

const n = v => Math.round(v * 10) / 10;
let chartSeq = 0;

// ---- linha com área, ao estilo do gráfico de HRV ----
// pontos: [{ label, valor, legenda }]. `invertido` para grandezas em que MENOS é
// melhor (ritmo de corrida): aí o menor valor fica em cima.
export function lineChart(pontos, { fmt = v => String(v), invertido = false, tone = 'sky', alt = '', eixo = '' } = {}) {
  if (pontos.length < 2) return '';
  const W = 300, H = 104, PL = 6, PR = 6, PT = 22, PB = 18;
  const vals = pontos.map(p => p.valor);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi += 1; lo -= 1; }
  const folga = (hi - lo) * 0.18;
  lo -= folga; hi += folga;
  const x = i => PL + (i * (W - PL - PR)) / (pontos.length - 1);
  const y = v => {
    const t = (v - lo) / (hi - lo);
    return invertido ? PT + t * (H - PT - PB) : H - PB - t * (H - PT - PB);
  };
  const linha = pontos.map((p, i) => `${n(x(i))},${n(y(p.valor))}`).join(' ');
  const area = `${PL},${H - PB} ${linha} ${W - PR},${H - PB}`;
  const ult = pontos.length - 1;
  const gid = `lc${++chartSeq}`;
  // a etiqueta do último ponto encosta-se à borda se estiver perto dela
  const lx = Math.min(W - 34, Math.max(22, x(ult)));

  // O SVG estica-se para encher a largura, e por isso nada com forma própria pode
  // viver lá dentro: um círculo esticado sai elipse. A linha e a área esticam bem
  // (o traço é `non-scaling-stroke`); os pontos são elementos por cima, posicionados
  // em percentagem, e ficam redondos em qualquer largura.
  const pct = (v, total) => n((v / total) * 100);
  return `<figure class="chart" role="img" aria-label="${esc(alt || 'Gráfico de evolução')}">
    <div class="chart-box">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="chart-svg chart-${tone}">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="chart-g0"/><stop offset="1" class="chart-g1"/>
        </linearGradient></defs>
        <polygon class="chart-area" points="${area}" fill="url(#${gid})"/>
        <polyline class="chart-line" points="${linha}"/>
        <line class="chart-guide" x1="${n(x(ult))}" y1="${PT}" x2="${n(x(ult))}" y2="${H - PB}"/>
      </svg>
      ${pontos.map((p, i) => `<i class="chart-dot${i === ult ? ' on' : ''} chart-${tone}" style="left:${pct(x(i), W)}%;top:${pct(y(p.valor), H)}%"></i>`).join('')}
    </div>
    <span class="chart-tip" style="left:${n((lx / W) * 100)}%">${esc(fmt(pontos[ult].valor))}</span>
    ${eixo ? `<span class="chart-eixo">${esc(eixo)}</span>` : ''}
    <figcaption class="chart-axis"><span>${esc(pontos[0].label)}</span><span>${esc(pontos[ult].label)}</span></figcaption>
  </figure>`;
}

// ---- barras, ao estilo do gráfico de Recovery ----
export function barChart(pontos, { fmt = v => String(v), tone = 'mint', alt = '', destaque = -1 } = {}) {
  if (!pontos.length) return '';
  const alto = Math.max(1, ...pontos.map(p => p.valor));
  const d = destaque < 0 ? pontos.length - 1 : destaque;
  return `<figure class="chart chart-bars chart-${tone}" role="img" aria-label="${esc(alt || 'Gráfico de barras')}">
    <div class="bars2">${pontos.map((p, i) => `
      <div class="bar2${i === d ? ' on' : ''}">
        ${i === d ? `<span class="bar2-tip">${esc(fmt(p.valor))}</span>` : ''}
        <div class="bar2-fill" style="height:${Math.max(4, Math.round((p.valor / alto) * 100))}%"></div>
      </div>`).join('')}</div>
    <figcaption class="chart-axis"><span>${esc(pontos[0].label)}</span><span>${esc(pontos[pontos.length - 1].label)}</span></figcaption>
  </figure>`;
}

// ---- cabeçalho partilhado: número grande, rótulo e variação ----
// `melhorou` diz o SENTIDO, não o sinal: num ritmo de corrida descer é melhorar.
export function chartHead({ kicker, valor, unidade = '', delta = null, deltaTexto = '', melhorou = null }) {
  const chip = delta === null ? '' :
    `<span class="chart-delta ${melhorou === null ? '' : melhorou ? 'up' : 'down'}">${esc(deltaTexto)}</span>`;
  return `<div class="chart-head">
    <div class="card-kicker">${esc(kicker)}</div>
    <div class="chart-n">${esc(valor)}${unidade ? `<small>${esc(unidade)}</small>` : ''}${chip}</div>
  </div>`;
}
