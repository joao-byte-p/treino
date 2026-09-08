// Diagnóstico de uma pose: diz qual a articulação que falha e em que instante.
import { POSES } from '../js/data/poses.js';
import { SEG, frameAt, debugJoints } from '../js/ui/figure.js';
const ids = process.argv.slice(2);
const r = v => Math.round(v * 10) / 10;
for (const id of ids) {
  const P = POSES[id];
  if (!P) { console.log(id, 'nao existe'); continue; }
  const [vx, vy, vw, vh] = (P.viewBox || '0 0 100 100').split(' ').map(Number);
  const floor = (P.props || []).find(p => p.type === 'floor');
  const farOff = P.far || [-5.2, 0];
  console.log(`\n=== ${id}  viewBox ${P.viewBox}  chão ${floor ? floor.y : '-'}`);
  for (const t of [0, 0.25, 0.5, 0.75]) {
    const f = frameAt(P.frames, t);
    const j = debugJoints(f, P.far, P.wide);
    const rows = [];
    const target = sp => {
      if (!sp || Array.isArray(sp) || !sp.pin) return null;
      let x = sp.pin;
      if (sp.far && !sp.mirror) x = [x[0] + farOff[0], x[1] + farOff[1]];
      if (sp.mirror) x = [2 * j.hip[0] - x[0], x[1]];
      return x;
    };
    j.arms.forEach((a, i) => {
      const tg = target((f.arms || [])[i]);
      rows.push(`arm${i} ombro ${r(a.pts[0][0])},${r(a.pts[0][1])} cotovelo ${r(a.pts[1][0])},${r(a.pts[1][1])} mao ${r(a.pts[2][0])},${r(a.pts[2][1])}` +
        (tg ? ` alvo ${r(tg[0])},${r(tg[1])} erro ${r(Math.hypot(tg[0] - a.pts[2][0], tg[1] - a.pts[2][1]))} dist-ombro ${r(Math.hypot(tg[0] - a.pts[0][0], tg[1] - a.pts[0][1]))}/${SEG.upper + SEG.fore}` : ''));
    });
    j.legs.forEach((l, i) => {
      const tg = target((f.legs || [])[i]);
      rows.push(`leg${i} anca ${r(l.pts[0][0])},${r(l.pts[0][1])} joelho ${r(l.pts[1][0])},${r(l.pts[1][1])} pe ${r(l.pts[2][0])},${r(l.pts[2][1])}` +
        (l.toe ? ` dedo ${r(l.toe[0])},${r(l.toe[1])}` : '') +
        (tg ? ` alvo ${r(tg[0])},${r(tg[1])} erro ${r(Math.hypot(tg[0] - l.pts[2][0], tg[1] - l.pts[2][1]))} dist-anca ${r(Math.hypot(tg[0] - l.pts[0][0], tg[1] - l.pts[0][1]))}/${SEG.thigh + SEG.shin}` : ''));
    });
    rows.push(`cabeca ${r(j.headC[0])},${r(j.headC[1])} (raio ${SEG.head}) anca ${r(j.hip[0])},${r(j.hip[1])} tronco ${r(f.torso)}`);
    console.log(` t=${t}\n   ` + rows.join('\n   '));
  }
}
