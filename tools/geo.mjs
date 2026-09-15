// Despeja a geometria real de uma pose, articulação a articulação, para eu poder
// medir queixas ("a figura está abaixo da linha", "o pé passa a parede") em vez de
// as adivinhar a olho. Correr: node tools/geo.mjs <id> [id...]
globalThis.window = { matchMedia: () => ({ matches: false }) };
const { POSES } = await import('../js/data/poses.js');
const { debugJoints, frameAt, SEG } = await import('../js/ui/figure.js');
const FAR = [-5.2, 0];
const n = v => Math.round(v * 10) / 10;
const p = a => a ? `[${n(a[0])},${n(a[1])}]` : '—';

for (const id of process.argv.slice(2)) {
  const P = POSES[id];
  if (!P) { console.log(`${id}: NÃO EXISTE`); continue; }
  console.log(`\n══ ${id}  viewBox ${P.viewBox || '0 0 100 100'}${P.far ? `  far ${JSON.stringify(P.far)}` : ''}${P.wide ? '  wide' : ''}`);
  console.log(`   props: ${JSON.stringify(P.props || [])}`);
  const mostrar = (tag, f) => {
    const j = debugJoints(f, P.far || FAR, P.wide);
    console.log(`  ${tag} ${f.label ? '· ' + f.label : ''}`);
    console.log(`     anca ${p(j.hip)} tronco ${n(f.torso)} pescoço ${p(j.neck)} cabeça ${p(j.headC)} (r ${SEG.head})`);
    j.arms.forEach((a, i) => console.log(`     braço${i}${a.far ? ' (longe)' : ''} ombro ${p(a.pts[0])} cotovelo ${p(a.pts[1])} mão ${p(a.pts[2])}`));
    j.legs.forEach((l, i) => console.log(`     perna${i}${l.far ? ' (longe)' : ''} anca ${p(l.pts[0])} joelho ${p(l.pts[1])} tornozelo ${p(l.pts[2])} pé ${p(l.toe)}`));
    if (f.items) console.log(`     items ${JSON.stringify(f.items)}`);
  };
  P.frames.forEach((f, i) => mostrar(`f${i}`, f));
  if (P.frames.length > 1) mostrar('meio', frameAt(P.frames, 0.5 / P.frames.length));
}
