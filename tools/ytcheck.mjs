// Confirma que cada vídeo referido ainda existe no YouTube. Vídeos morrem; isto avisa.
// Correr: node tools/ytcheck.mjs
import { EXERCISES } from '../js/data/exercises.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const mortos = [];
const semId = [];
let ok = 0;

for (const ex of EXERCISES) {
  if (!ex.ytId) { semId.push(ex.id); continue; }
  const u = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ex.ytId}&format=json`;
  let r = null;
  for (let t = 0; t < 3 && !r; t++) {
    try { r = await fetch(u); } catch { await sleep(1200); }
  }
  if (!r) { mortos.push(`${ex.id} (${ex.ytId}): rede`); continue; }
  if (r.status === 200 || r.status === 401 || r.status === 403) ok++;
  else mortos.push(`${ex.id} (${ex.ytId}): HTTP ${r.status}`);
  await sleep(220);
}

console.log(`vídeos verificados: ${ok} vivos · ${mortos.length} em falta · ${semId.length} sem ID`);
if (semId.length) console.log('sem ID (caem na pesquisa do YouTube): ' + semId.join(', '));
if (mortos.length) { console.log('EM FALTA:\n  ' + mortos.join('\n  ')); process.exitCode = 1; }
