// Auditoria de geometria das figuras: durante TODA a animação, verifica que
// nada sai do enquadramento, que nada atravessa o chão e que os apoios que
// deviam estar fixos não deslizam nem ficam fora do alcance do membro.
import { POSES } from '../js/data/poses.js';
import { SEG, frameAt, debugJoints } from '../js/ui/figure.js';
import { BY_ID } from '../js/data/exercises.js';

const problems = [];
const warn = (t, m) => problems.push(`${t.padEnd(20)} ${m}`);
const MARGIN = 3.2;      // metade do traço mais largo
const FLOOR_TOL = 2.6;   // o pé pode assentar no chão
const ARM = SEG.upper + SEG.fore;
const LEG = SEG.thigh + SEG.shin;

// palavras que em português levam acento e aparecem sem ele
const MISSPELL = /\b(chao|pes|maos|bracos|cabeca|ate|apos|direcao|inclinacao|respiracao|serie|series|musculo|angulo|minimo|maximo|ultimo|proximo|tras|atras|nivel|comeca|joelho a 90 graus|posicao|amplitude maxima)\b/i;

let checked = 0;
for (const [id, P] of Object.entries(POSES)) {
  const [vx, vy, vw, vh] = (P.viewBox || '0 0 100 100').split(' ').map(Number);
  const floor = (P.props || []).find(p => p.type === 'floor');
  const N = 50;
  const samples = Array.from({ length: N + 1 }, (_, k) => k / N);

  // um apoio só é "fixo" se o alvo for igual em todos os frames
  const fixedPin = (kind, idx) => {
    const specs = P.frames.map(f => (f[kind] || [])[idx]);
    if (!specs.every(sp => sp && !Array.isArray(sp) && sp.pin)) return null;
    const first = specs[0].pin;
    return specs.every(sp => sp.pin[0] === first[0] && sp.pin[1] === first[1]) ? first : null;
  };

  const track = new Map();
  let outOfFrame = null, throughFloor = null;
  const unreachable = new Map();

  for (const t of samples) {
    const f = frameAt(P.frames, t);
    let j;
    try { j = debugJoints(f, P.far, P.wide); } catch (e) { warn('erro', `${id} t=${t}: ${e.message}`); break; }
    checked++;

    // alvo pretendido, calculado como o renderizador o calcula: desvio do lado
    // afastado e reflexo da vista de frente incluídos
    const farOff = P.far || [-5.2, 0];
    const targetOf = sp => {
      if (!sp || Array.isArray(sp) || !sp.pin) return null;
      let t = sp.pin;
      if (sp.far && !sp.mirror) t = [t[0] + farOff[0], t[1] + farOff[1]];
      if (sp.mirror) t = [2 * j.hip[0] - t[0], t[1]];
      return t;
    };
    const pts = [];
    j.arms.forEach((a, i) => {
      a.pts.forEach(p => pts.push(p));
      track.set(`arm${i}`, [...(track.get(`arm${i}`) || []), a.pts[2]]);
      const t = targetOf((f.arms || [])[i]);
      if (t) {
        const err = Math.hypot(t[0] - a.pts[2][0], t[1] - a.pts[2][1]);
        if (err > 1) unreachable.set(`arm${i}`, Math.max(unreachable.get(`arm${i}`) || 0, err));
      }
    });
    j.legs.forEach((l, i) => {
      l.pts.forEach(p => pts.push(p));
      if (l.toe) pts.push(l.toe);
      track.set(`leg${i}`, [...(track.get(`leg${i}`) || []), l.pts[2]]);
      const t = targetOf((f.legs || [])[i]);
      if (t) {
        const err = Math.hypot(t[0] - l.pts[2][0], t[1] - l.pts[2][1]);
        if (err > 1) unreachable.set(`leg${i}`, Math.max(unreachable.get(`leg${i}`) || 0, err));
      }
    });
    pts.push(j.hip, j.neck);
    pts.push([j.headC[0] - SEG.head, j.headC[1]], [j.headC[0] + SEG.head, j.headC[1]],
             [j.headC[0], j.headC[1] - SEG.head], [j.headC[0], j.headC[1] + SEG.head]);

    for (const p of pts) {
      const over = Math.max(vx - MARGIN - p[0], p[0] - (vx + vw + MARGIN), vy - MARGIN - p[1], p[1] - (vy + vh + MARGIN));
      if (over > 0 && (!outOfFrame || over > outOfFrame.d)) outOfFrame = { d: Math.round(over * 10) / 10, p: p.map(v => Math.round(v)), t };
      if (floor && p[1] > floor.y + FLOOR_TOL) {
        const d = p[1] - floor.y;
        if (!throughFloor || d > throughFloor.d) throughFloor = { d: Math.round(d * 10) / 10, p: p.map(v => Math.round(v)), t };
      }
    }
  }

  if (outOfFrame) warn('fora do quadro', `${id}: ${outOfFrame.d} unidades em ${JSON.stringify(outOfFrame.p)}`);
  if (throughFloor) warn('atravessa o chao', `${id}: ${throughFloor.d} abaixo do chão em ${JSON.stringify(throughFloor.p)}`);
  for (const [k, over] of unreachable) warn('apoio nao alcancado', `${id} ${k}: mão/pé fica a ${Math.round(over * 10) / 10} do sítio`);

  for (const [key, list] of track) {
    const kind = key.startsWith('arm') ? 'arms' : 'legs';
    const idx = Number(key.slice(-1));
    if (!fixedPin(kind, idx)) continue;   // apoio que muda de sítio é movimento, não defeito
    const xs = list.map(p => p[0]), ys = list.map(p => p[1]);
    const slide = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (slide > 1.2) warn('apoio desliza', `${id} ${key}: ${Math.round(slide * 10) / 10} unidades`);
  }

  for (const [i, f] of P.frames.entries()) {
    if (!f.label) warn('sem rotulo', `${id} frame ${i + 1}`);
    else if (MISSPELL.test(f.label)) warn('acento em falta', `${id}: "${f.label}"`);
  }
  if (!BY_ID[id]) warn('orfa', `${id} não corresponde a exercício`);
}

console.log(`amostras de geometria: ${checked}`);
if (!problems.length) console.log('sem problemas');
else {
  console.log(`${problems.length} problemas:\n`);
  for (const p of problems.sort()) console.log(p);
}
