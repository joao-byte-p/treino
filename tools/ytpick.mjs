// Escolhe um vídeo por exercício a partir dos candidatos e confirma que existe.
// Critério: tutorial de forma, não treino completo; 1 a 8 minutos; título que fale do exercício.
// Correr: node tools/ytpick.mjs   (--write escreve ytId/ytTitle em js/data/exercises.js)
import fs from 'node:fs';
import { EXERCISES } from '../js/data/exercises.js';

const cand = JSON.parse(fs.readFileSync('tools/yt-candidates.json', 'utf8'));
const WRITE = process.argv.includes('--write');

// Escolhas minhas, onde o melhor vídeo não é o que a pontuação escolhe. Cada uma tem razão:
// o exercício certo em vez da variante parecida, o tutorial em vez do treino completo.
const ESCOLHA_MANUAL = {
  'pushup-board': 'IODxDxX7oi4',        // flexão perfeita, em vez de um vídeo sobre peito
  'slow-pushup': 'uMdJ1NMEOGY',         // fase excêntrica, que é o ponto do exercício
  'split-squat': 'la0pLPq-3A8',         // split squat simples, não o búlgaro
  'bear-crawl': 'qZinJ8u-iXI',          // gatinhar a avançar, não lateral
  'hollow-rock': 'hbsljZvfp6E',         // o balanço, não a posição estática
  'squat-to-stand': 'ckvHymGK3s0',      // agachamento livre explicado para joelhos
  'arm-circles': '35h5gdlm46w',         // círculos de braços, não um treino de braços
  'walk-brisk': 'PXHWMt5nvcE',          // técnica de marcha, não benefícios
  'march-in-place': 'u1gmWFvEluM',      // marcha no lugar demonstrada
  'db-swing-hiit': 'v1LoYk4qdLc',       // mesmo movimento do swing: o vídeo é o mesmo
  'plank': 'A2b2EmIg0dA',               // prancha com progressões, fonte de reabilitação
  'side-plank': 'XeN4pEZZJNI',          // prancha lateral explicada de ponta a ponta
  'pullup': 'eGo4IYlbE5g',              // elevação perfeita, em vez de uma dica de 47s
  'run-tempo': 'k5vqiyry2z8',           // o que é um tempo run, não como testar o limiar
  'bar-dips-lsit': 'r-LQKNxGJB0',       // a posição de L nas paralelas, que é a parte difícil
  'wall-sit-single': '01uSdj_zz08',     // o exercício exato, sem rodeios
  'side-plank-dips': 'hAAJ7EsluLY',     // a subida da anca, não a prancha lateral parada
  'handstand-pushup-wall': 'gdhmNaZ7nAk', // flexão em pino com a parede, não a arte do pino
  'hip-thrust-single-elevated': 'YIpw8ogCVKs', // Bret Contreras, que é quem estudou isto
  'pistol-full': 'hHxm3VbuS-w',         // progressão completa, diferente do vídeo do assistido
};

const BOM = ['how to', 'tutorial', 'proper form', 'correct form', 'technique', 'form', 'demonstration', 'demo', 'guide', 'exercise'];
const MAU = ['workout', 'challenge', 'day', 'week', 'transformation', 'routine', 'compilation', 'reaction', 'vs ', 'fail', 'motivation', 'asmr', 'music', 'live', 'podcast', 'full body', 'follow along'];
const stop = new Set(['the', 'a', 'and', 'with', 'for', 'to', 'on', 'of', 'up', 'ups', 'your', 'how', 'do', 'form', 'proper', 'technique', 'tutorial', 'progression', 'common', 'mistakes', 'beginner', 'exercise']);

function score(v, ex) {
  const t = v.title.toLowerCase();
  let s = 0;
  // palavras do próprio exercício no título: é o sinal mais forte de relevância
  const words = [...new Set((ex.nameEn + ' ' + ex.yt).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/))].filter(w => w.length > 2 && !stop.has(w));
  const hits = words.filter(w => t.includes(w)).length;
  s += (hits / Math.max(1, words.length)) * 60;
  if (BOM.some(k => t.includes(k))) s += 12;
  if (MAU.some(k => t.includes(k))) s -= 25;
  // duração: um tutorial de forma vive entre 1 e 8 minutos
  if (v.dur >= 60 && v.dur <= 480) s += 14;
  else if (v.dur > 480) s -= 8;
  else s -= 4;
  s += Math.min(12, Math.log10(Math.max(10, v.views)) * 2); // audiência como desempate, não como critério
  return s;
}

async function existe(id) {
  const u = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  try {
    const r = await fetch(u);
    if (r.status === 200) { const j = await r.json(); return { ok: true, title: j.title, channel: j.author_name }; }
    if (r.status === 401 || r.status === 403) return { ok: true, naoIncorpora: true }; // existe, só não deixa incorporar
    return { ok: false, status: r.status };
  } catch { return { ok: false, status: 'rede' }; }
}

const escolhas = {};
const falhas = [];
for (const ex of EXERCISES) {
  const c = cand[ex.id];
  if (!c || !c.candidates.length) { falhas.push(`${ex.id}: sem candidatos`); continue; }
  const manual = ESCOLHA_MANUAL[ex.id];
  const ranked = [...c.candidates].sort((a, b) => (b.id === manual) - (a.id === manual) || score(b, ex) - score(a, ex));
  if (manual && !c.candidates.some(v => v.id === manual)) ranked.unshift({ id: manual, title: '', channel: '', dur: 0, views: 0 });
  let escolhido = null;
  for (const v of ranked.slice(0, 3)) {
    const e = await existe(v.id);
    if (e.ok) { escolhido = { ...v, title: e.title || v.title, channel: e.channel || v.channel }; break; }
  }
  if (!escolhido) { falhas.push(`${ex.id}: nenhum dos 3 primeiros passou a verificação`); continue; }
  escolhas[ex.id] = escolhido;
  const m = Math.floor(escolhido.dur / 60), sg = String(escolhido.dur % 60).padStart(2, '0');
  console.log(`${ex.id.padEnd(24)} ${escolhido.id}  ${m}:${sg}  ${escolhido.channel} — ${escolhido.title}`);
}

console.log(`\nescolhidos ${Object.keys(escolhas).length}/${EXERCISES.length}`);
if (falhas.length) console.log('FALHAS:\n  ' + falhas.join('\n  '));
fs.writeFileSync('tools/yt-picks.json', JSON.stringify(escolhas, null, 2));

if (WRITE) {
  let src = fs.readFileSync('js/data/exercises.js', 'utf8');
  let n = 0;
  const BS = String.fromCharCode(92); // barra invertida, sem a escrever literalmente aqui
  const esc = t => t.split(BS).join(BS + BS).split("'").join(BS + "'");
  for (const [id, v] of Object.entries(escolhas)) {
    // encontra o bloco do exercício e substitui a linha do yt, apagando um ytId anterior
    const re = new RegExp("(id: '" + id + "',[" + BS + "s" + BS + "S]{0,1600}?    yt: '[^']*',)" +
      "(?:" + BS + "n    ytId: '[^']*', ytTitle: '(?:[^'" + BS + BS + "]|" + BS + BS + ".)*',)?");
    if (!re.test(src)) { console.log('NAO ESCREVEU: ' + id); continue; }
    src = src.replace(re, (m, keep) => keep + "\n    ytId: '" + v.id + "', ytTitle: '" + esc(v.channel + ' — ' + v.title) + "',");
    n++;
  }
  fs.writeFileSync('js/data/exercises.js', src);
  console.log('escritos ' + n + ' ytId em js/data/exercises.js');
}
