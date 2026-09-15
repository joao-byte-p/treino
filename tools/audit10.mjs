// Grupos musculares: nenhum termo escrito à mão pode ficar sem tradução, e nenhum
// exercício pode ficar fora de todos os filtros — se ficasse, desaparecia da
// biblioteca ao filtrar e ninguém dava por isso.
// Correr: node tools/audit10.mjs
const { EXERCISES } = await import('../js/data/exercises.js');
const { GRUPOS, gruposDe, termosDesconhecidos } = await import('../js/data/muscles.js');

const problemas = [];
const fora = termosDesconhecidos();
if (fora.length) problemas.push(`termos sem grupo: ${fora.join(', ')}`);

const conhecidos = new Set(GRUPOS.map(g => g[0]));
const contagem = Object.fromEntries(GRUPOS.map(g => [g[0], 0]));
for (const e of EXERCISES) {
  const g = gruposDe(e);
  if (!g.size) problemas.push(`${e.id} não cai em nenhum grupo`);
  for (const k of g) {
    if (!conhecidos.has(k)) problemas.push(`${e.id} aponta para o grupo inexistente "${k}"`);
    else contagem[k]++;
  }
}
for (const [k, n] of Object.entries(contagem)) if (!n) problemas.push(`grupo "${k}" está vazio: filtro que não dá nada`);

console.log(`grupos musculares: ${EXERCISES.length} exercícios`);
console.log('  ' + GRUPOS.map(([k, l]) => `${l} ${contagem[k]}`).join(' · '));
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
