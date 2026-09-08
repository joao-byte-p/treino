// Procura candidatos de vídeo no YouTube para cada exercício e grava-os em JSON.
// Não escolhe nada: só recolhe resultados reais para depois se escolher com critério.
// Correr: node tools/ytfind.mjs [ficheiro-de-saida]
import { EXERCISES } from '../js/data/exercises.js';
import fs from 'node:fs';

const OUT = process.argv[2] || 'tools/yt-candidates.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// Sem estes cookies o YouTube atira-nos para o ecrã de consentimento e a redirecção entra em ciclo.
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+cb; SOCS=CAISNQgQEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfMjAyNDA4MjAuMDdfcDAaAmVuIAEaBgiA_LmzBg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function durSec(txt) {
  if (!txt) return 0;
  const p = txt.split(':').map(Number);
  if (p.some(Number.isNaN)) return 0;
  return p.reduce((a, v) => a * 60 + v, 0);
}

function views(txt) {
  if (!txt) return 0;
  const m = /([\d.,]+)\s*([KMB])?/i.exec(txt.replace(/\s/g, ' '));
  if (!m) return 0;
  const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return Math.round(n * mult);
}

function walk(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const v of node) walk(v, out); return; }
  if (node.videoRenderer) {
    const v = node.videoRenderer;
    const title = v.title?.runs?.map(r => r.text).join('') || '';
    const badges = (v.badges || []).map(b => b.metadataBadgeRenderer?.label).filter(Boolean);
    out.push({
      id: v.videoId,
      title,
      channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
      dur: durSec(v.lengthText?.simpleText),
      views: views(v.viewCountText?.simpleText || v.shortViewCountText?.simpleText),
      live: badges.includes('LIVE') || !v.lengthText,
    });
  }
  for (const k of Object.keys(node)) if (k !== 'videoRenderer') walk(node[k], out);
}

async function fetchHtml(url, tries = 4) {
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (r.ok) return await r.text();
      if (t === tries) return null;
    } catch { if (t === tries) return null; }
    await sleep(2000 * t); // recua e volta a tentar: o YouTube trava pedidos seguidos
  }
  return null;
}

async function search(term) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=EgIQAQ%253D%253D`; // sp = só vídeos
  const html = await fetchHtml(url);
  if (!html) return { error: 'pedido falhou', results: [] };
  const m = /ytInitialData\s*=\s*(\{.+?\});<\/script>/s.exec(html) || /ytInitialData"\]\s*=\s*(\{.+?\});/s.exec(html);
  if (!m) return { error: 'sem ytInitialData', results: [] };
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { return { error: 'JSON inválido', results: [] }; }
  const out = [];
  walk(data, out);
  const seen = new Set();
  const results = out.filter(v => v.id && !seen.has(v.id) && (seen.add(v.id), true));
  return { results };
}

// retoma: o que já foi recolhido não se volta a pedir
const all = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
let i = 0;
for (const ex of EXERCISES) {
  i++;
  if (all[ex.id]?.candidates?.length) { process.stderr.write(`${String(i).padStart(2)}/${EXERCISES.length} ${ex.id.padEnd(24)} já tinha
`); continue; }
  const { results, error } = await search(ex.yt);
  // filtra: sem lives, duração entre 40s e 15min (tutoriais, não documentários nem shorts de 8s)
  const good = results.filter(v => !v.live && v.dur >= 40 && v.dur <= 900);
  all[ex.id] = { name: ex.name, nameEn: ex.nameEn, term: ex.yt, error: error || null, candidates: good.slice(0, 6) };
  process.stderr.write(`${String(i).padStart(2)}/${EXERCISES.length} ${ex.id.padEnd(24)} ${good.length} candidatos${error ? ' · ' + error : ''}\n`);
  await sleep(700);
}
fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
console.log(`\nGravado em ${OUT}`);
