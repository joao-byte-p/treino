// O service worker guarda uma lista explícita de ficheiros. Um módulo novo que
// fique de fora funciona no browser e falha offline — e offline é exactamente
// onde a app é usada, com o telemóvel no bolso e sem rede no ginásio.
// Correr: node tools/sw.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const sw = readFileSync('sw.js', 'utf8');
const lista = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]));

const js = [];
(function anda(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) anda(p);
    else if (f.endsWith('.js')) js.push(p.split(sep).join('/'));
  }
})('js');

const fora = js.filter(f => !lista.has(f));
const fantasmas = [...lista].filter(f => f.endsWith('.js') && !js.includes(f));

console.log(`service worker: ${js.length} módulos, ${lista.size} entradas na cache`);
if (fora.length || fantasmas.length) {
  if (fora.length) console.log(`  fora da cache (a app parte offline): ${fora.join(', ')}`);
  if (fantasmas.length) console.log(`  na cache mas já não existem: ${fantasmas.join(', ')}`);
  process.exitCode = 1;
} else console.log('sem problemas: todos os módulos estão na cache');
