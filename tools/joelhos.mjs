// Um joelho dobra para um lado só. Se o sinal do ângulo do joelho mudar dentro da
// mesma pose, há um instante em que a perna dobra ao contrário — e isso pode
// acontecer só a meio da animação, sem nenhuma das poses escritas estar errada.
// O mesmo vale para o cotovelo. Correr: node tools/joelhos.mjs
globalThis.window = { matchMedia: () => ({ matches: false }) };
const { POSES } = await import('../js/data/poses.js');
const { debugJoints, frameAt } = await import('../js/ui/figure.js');

const FAR = [-5.2, 0];
const PASSOS = 60;
const MORTO = 8;      // abaixo disto o membro está esticado e o lado não se lê
const MAXIMO = 168;   // acima disto está dobrado em dois
const n = v => Math.round(v * 10) / 10;
const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI;
const norm = d => ((((d + 180) % 360) + 360) % 360) - 180;

const problemas = [];
let medidos = 0;
for (const [id, P] of Object.entries(POSES)) {
  const estados = P.frames.length < 2 ? [P.frames[0]]
    : Array.from({ length: PASSOS + 1 }, (_, k) => frameAt(P.frames, k / PASSOS));
  const lados = new Map();
  estados.forEach((f, k) => {
    const j = debugJoints(f, P.far || FAR, P.wide);
    const membros = [
      ...j.legs.map((l, i) => [`joelho${i}`, l.pts]),
      ...j.arms.map((a, i) => [`cotovelo${i}`, a.pts]),
    ];
    for (const [nome, p] of membros) {
      const d = norm(ang(p[1], p[2]) - ang(p[0], p[1]));
      medidos++;
      if (Math.abs(d) > MAXIMO) problemas.push(`${id} ${nome}: dobrado ${n(Math.abs(d))}° em t=${n(k / PASSOS)}`);
      if (Math.abs(d) < MORTO) continue;
      const lado = Math.sign(d);
      if (!lados.has(nome)) lados.set(nome, { lado, t: k / PASSOS });
      else if (lados.get(nome).lado !== lado)
        problemas.push(`${id} ${nome}: dobra para os dois lados (${lados.get(nome).lado > 0 ? '+' : '−'} em t=${n(lados.get(nome).t)}, ${lado > 0 ? '+' : '−'} em t=${n(k / PASSOS)})`);
    }
  });
}
const vistos = new Set();
const unicos = problemas.filter(p => { const c = p.split(':')[0] + p.split(':')[1].slice(0, 12); if (vistos.has(c)) return false; vistos.add(c); return true; });
console.log(`joelhos e cotovelos: ${medidos} medidas em ${Object.keys(POSES).length} poses`);
if (unicos.length) { console.log(`${unicos.length} a dobrar mal:\n  ` + unicos.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas: cada articulação dobra sempre para o mesmo lado');
