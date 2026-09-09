// Mede o ângulo do tornozelo: entre tornozelo→joelho e tornozelo→ponta do pé.
// De pé, com o pé no chão, ronda os 90°. Ponta esticada chega aos ~165°. Ponta
// puxada não desce dos ~65°. Abaixo de 45° o pé está dobrado contra a canela, e é
// impossível; acima de 172° é uma linha reta e o pé deixa de se ver.
// Correr: node tools/anklecheck.mjs
import { POSES } from '../js/data/poses.js';
import { debugJoints } from '../js/ui/figure.js';

const FAR = [-5.2, 0];
const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI;
const norm = d => ((((d + 180) % 360) + 360) % 360) - 180;

// Exceções com razão. Um agachamento a uma perna em profundidade exige mesmo uma
// flexão do tornozelo no limite do humano; não é o mesmo que um pé dobrado por erro.
const ACEITES = {
  'pistol-assisted[1].leg1': 'pistol em profundidade: tornozelo no limite, é o exercício',
  'pistol-full[1].leg1': 'pistol em profundidade: tornozelo no limite, é o exercício',
};

const fora = [];
const colineares = [];
let medidos = 0;
for (const [id, P] of Object.entries(POSES)) {
  P.frames.forEach((fr, fi) => {
    const j = debugJoints(fr, P.far || FAR, P.wide);
    j.legs.forEach((l, li) => {
      if (!l.toe) return;
      medidos++;
      const paraJoelho = ang(l.ankle, l.pts[1]); // tornozelo → joelho
      const pe = ang(l.ankle, l.toe);            // tornozelo → ponta
      const j2 = Math.abs(norm(pe - paraJoelho)); // ângulo da articulação
      const chave = `${id}[${fi}].leg${li}`;
      if (j2 < 45 && !ACEITES[chave]) fora.push({ id, fi, li, j: Math.round(j2), canela: Math.round(ang(l.pts[1], l.pts[2])), pe: Math.round(pe) });
      else if (j2 > 176) colineares.push(`${chave} ${Math.round(j2)}°`);
    });
  });
}
console.log(`pés medidos: ${medidos} · dobrados: ${fora.length} · exceções aceites: ${Object.keys(ACEITES).length}`);
for (const f of fora.sort((a, b) => a.j - b.j)) console.log(`  DOBRADO ${f.id.padEnd(24)} f${f.fi} perna${f.li}: articulação ${String(f.j).padStart(3)}°  (canela ${f.canela}°, pé ${f.pe}°)`);
// Colineares não são defeito: é a ponta esticada ou o pé assente a continuar a canela
// (ajoelhado, deitado, a nadar). Só custam legibilidade, porque o pé some na perna.
if (colineares.length) console.log(`
pé colinear com a canela, ${colineares.length} (ponta esticada — legível a custo):
  ` + colineares.join(', '));
if (fora.length) process.exitCode = 1;

// pernas sem pé nenhum, para saber onde falta
const semPe = [];
for (const [id, P] of Object.entries(POSES)) {
  P.frames.forEach((fr, fi) => {
    const j = debugJoints(fr, P.far || FAR, P.wide);
    j.legs.forEach((l, li) => { if (!l.toe) semPe.push(`${id}[${fi}].leg${li}`); });
  });
}
if (semPe.length) console.log(`\nsem pé (${semPe.length}):\n  ` + semPe.join(', '));
