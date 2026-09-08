// Mede a caixa real de cada figura ao longo da animação e propõe viewBox e chão.
import { POSES } from '../js/data/poses.js';
import { SEG, frameAt, debugJoints } from '../js/ui/figure.js';
const M = 4;
const out = [];
for (const [id, P] of Object.entries(POSES)) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let k = 0; k <= 40; k++) {
    const f = frameAt(P.frames, k / 40);
    const j = debugJoints(f, P.far, P.wide);
    const pts = [j.hip, j.neck];
    j.arms.forEach(a => a.pts.forEach(p => pts.push(p)));
    j.legs.forEach(l => { l.pts.forEach(p => pts.push(p)); if (l.toe) pts.push(l.toe); });
    pts.push([j.headC[0] - SEG.head, j.headC[1] - SEG.head], [j.headC[0] + SEG.head, j.headC[1] + SEG.head]);
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  }
  // acessórios também têm de caber
  for (const p of P.props || []) {
    if (p.type === 'box') { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x + p.w); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y + p.h); }
    if (p.type === 'bar') { x0 = Math.min(x0, p.x1, p.x2); x1 = Math.max(x1, p.x1, p.x2); y0 = Math.min(y0, p.y1, p.y2); y1 = Math.max(y1, p.y1, p.y2); }
    if (p.type === 'wall') { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y1 ?? 6); y1 = Math.max(y1, p.y2 ?? 92); }
    if (p.type === 'floor' || p.type === 'water') { y1 = Math.max(y1, p.y); }
  }
  const floor = (P.props || []).find(p => p.type === 'floor');
  const vb = [Math.round(x0 - M), Math.round(y0 - M), Math.round(x1 - x0 + 2 * M), Math.round(y1 - y0 + 2 * M)];
  out.push({ id, atual: P.viewBox, novo: vb.join(' '), maisBaixo: Math.round(y1 * 10) / 10, chao: floor ? floor.y : null });
}
const bad = out.filter(o => o.atual !== o.novo);
console.log('viewBox a ajustar:', bad.length, 'de', out.length, '\n');
for (const o of bad) console.log(`  '${o.id}': '${o.atual}' -> '${o.novo}'${o.chao != null && o.maisBaixo > o.chao + 2.6 ? `   [chão ${o.chao}, mais baixo ${o.maisBaixo}]` : ''}`);
console.log('\nchão acima do ponto mais baixo do corpo:');
for (const o of out) if (o.chao != null && o.maisBaixo > o.chao + 2.6) console.log(`  ${o.id}: chão ${o.chao}, corpo desce até ${o.maisBaixo}`);
