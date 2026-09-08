import { POSES } from '../js/data/poses.js';
import { figureSVG, frameAt } from '../js/ui/figure.js';
let bad = 0;
for (const [id, P] of Object.entries(POSES)) {
  for (let i = 0; i < P.frames.length; i++) {
    try { figureSVG(id, { frame: i }); } catch (e) { console.log('ESTATICO', id, 'frame', i, e.message); bad++; }
  }
  for (const u of [0, 0.2, 0.4, 0.5, 0.7, 0.9]) {
    try { const f = frameAt(P.frames, u); if (!f || !f.hip) throw new Error('frame sem hip'); } catch (e) { console.log('ANIMADO', id, 'u', u, e.message); bad++; }
  }
}
console.log(bad === 0 ? 'todas as poses OK' : bad + ' problemas');

// valida que os frames usam a mesma forma de membro (FK/IK/ângulos) — senão a interpolação falha
import { POSES as P2 } from '../js/data/poses.js';
const form = s => (Array.isArray(s) ? 'fk' : s.a ? 'ang' : 'pin');
let mism = 0;
for (const [id, P] of Object.entries(P2)) {
  for (const key of ['arms', 'legs']) {
    const forms = P.frames.map(f => (f[key] || []).map(form).join(','));
    if (new Set(forms).size > 1) { console.log('FORMAS DIFERENTES', id, key, forms); mism++; }
    const counts = P.frames.map(f => (f[key] || []).length);
    if (new Set(counts).size > 1) { console.log('CONTAGEM DIFERENTE', id, key, counts); mism++; }
  }
}
console.log(mism === 0 ? 'formas consistentes' : mism + ' inconsistencias');
