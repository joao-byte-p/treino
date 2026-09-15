// Procura saltos na animação: percorre a interpolação de cada pose ponto a ponto e
// mede quanto cada articulação anda entre instantes vizinhos. Um movimento normal
// avança devagar; um salto quer dizer que a cinemática inversa perdeu a solução (o
// alvo passou por cima da própria articulação) ou que um ângulo deu a volta pelo
// lado errado. Foi assim que a rotação torácica dava um estalo a meio.
// Correr: node tools/suave.mjs
globalThis.window = { matchMedia: () => ({ matches: false }) };
const { POSES } = await import('../js/data/poses.js');
const { debugJoints, frameAt } = await import('../js/ui/figure.js');

const FAR = [-5.2, 0];
const PASSOS = 160;
const LIMITE = 4;          // unidades do viewBox entre dois instantes vizinhos
const n = v => Math.round(v * 10) / 10;

const problemas = [];
let medidas = 0;
for (const [id, P] of Object.entries(POSES)) {
  if (P.frames.length < 2) continue;
  const trilhos = new Map();
  let ant = null;
  for (let k = 0; k <= PASSOS; k++) {
    const j = debugJoints(frameAt(P.frames, k / PASSOS), P.far || FAR, P.wide);
    const pontos = [['anca', j.hip], ['cabeça', j.headC]];
    j.arms.forEach((a, i) => pontos.push([`cotovelo${i}`, a.pts[1]], [`mão${i}`, a.pts[2]]));
    j.legs.forEach((l, i) => pontos.push([`joelho${i}`, l.pts[1]], [`tornozelo${i}`, l.pts[2]]));
    if (ant) pontos.forEach(([nome, p], i) => {
      const d = Math.hypot(p[0] - ant[i][1][0], p[1] - ant[i][1][1]);
      if (!trilhos.has(nome)) trilhos.set(nome, []);
      trilhos.get(nome).push({ d, t: k / PASSOS });
      medidas++;
    });
    ant = pontos;
  }
  // Um movimento rápido é grande em vários instantes SEGUIDOS; um salto é grande
  // num instante e pequeno nos dois ao lado. É essa diferença que os separa — uma
  // perna a recolher move-se depressa e não é defeito nenhum.
  for (const [nome, ds] of trilhos) {
    for (let i = 1; i < ds.length - 1; i++) {
      const vizinhos = (ds[i - 1].d + ds[i + 1].d) / 2;
      if (ds[i].d > LIMITE && ds[i].d > Math.max(0.05, vizinhos) * 3) {
        problemas.push(`${id} ${nome}: salta ${n(ds[i].d)} em t=${n(ds[i].t)}, mas à volta anda ${n(vizinhos)}`);
        break;
      }
    }
  }
}
console.log(`saltos: ${medidas} medidas em ${Object.keys(POSES).length} poses`);
if (problemas.length) { console.log(`${problemas.length} articulações com salto:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem saltos: todas as animações são contínuas');
