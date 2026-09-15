// Gera o ciclo de corrida. A perna percorre uma volta inteira por passada — a
// canela roda sempre no mesmo sentido — e por isso os ângulos têm de andar sempre
// para o mesmo lado: se dois instantes seguidos ficarem a mais de 180° um do
// outro, a interpolação escolhe o caminho curto e a perna dobra ao contrário.
const n = v => Math.round(v * 10) / 10;
function fk(raiz, alvo, l1, l2, bend) {
  const dx = alvo[0] - raiz[0], dy = alvo[1] - raiz[1];
  const d = Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy));
  const linha = Math.atan2(-dy, dx) * 180 / Math.PI;
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI;
  const p1 = linha - bend * a;
  const k = [raiz[0] + l1 * Math.cos(p1 * Math.PI / 180), raiz[1] - l1 * Math.sin(p1 * Math.PI / 180)];
  return [n(p1), n(Math.atan2(-(alvo[1] - k[1]), alvo[0] - k[0]) * 180 / Math.PI)];
}

function ciclo({ hipY, apoios, ar, torso, head, labels }) {
  // estados da perna: 0-2 em apoio (definidos pelo pé no chão), 3-7 no ar
  const L = [];
  apoios.forEach((ap, i) => L.push([...fk([50, hipY[i]], ap.pe, 18, 18, -1), ap.foot]));
  ar.forEach(a => L.push(a));
  const A = [];
  for (let k = 0; k < 8; k++) {
    const up = -91 + 33 * Math.cos((2 * Math.PI * k) / 8 + Math.PI);
    const flex = 28 - 72 * Math.cos((2 * Math.PI * k) / 8);
    A.push([n(up), n(up + flex)]);
  }
  return Array.from({ length: 8 }, (_, k) => {
    const perto = L[k], longe = L[(k + 4) % 8];
    const bPerto = A[k], bLonge = A[(k + 4) % 8];
    return `      {
        label: '${labels[k]}',
        hip: [50, ${hipY[k]}], torso: ${torso}, head: ${head},
        arms: [{ a: [${bLonge.join(', ')}], far: true }, { a: [${bPerto.join(', ')}] }],
        legs: [{ a: [${longe[0]}, ${longe[1]}], foot: ${longe[2]}, far: true }, { a: [${perto[0]}, ${perto[1]}], foot: ${perto[2]} }],
      },`;
  }).join('\n');
}

const LABELS = ['Contacto: o pé assenta debaixo da anca', 'Apoio: anca por cima do pé', 'Impulso: a perna estende-se atrás',
  'O pé larga o chão', 'Contacto do outro pé', 'Apoio do outro lado', 'Impulso do outro lado', 'E o outro pé larga o chão'];

console.log('--- run-z2\n' + ciclo({
  hipY: [53, 55, 51, 49, 53, 55, 51, 49],
  apoios: [{ pe: [56, 88], foot: 5 }, { pe: [50, 88], foot: 0 }, { pe: [42, 87], foot: -19 }],
  ar: [[-126, -170, -60], [-112, 176, -80], [-78, 150, -110], [-44, 34, 130], [-34, -78, 20]],
  torso: 84, head: 4, labels: LABELS,
}));
console.log('--- run-tempo\n' + ciclo({
  hipY: [52, 54, 50, 47, 52, 54, 50, 47],
  apoios: [{ pe: [57, 88], foot: 2 }, { pe: [50, 88], foot: 0 }, { pe: [40, 86], foot: -22 }],
  ar: [[-130, -174, -64], [-114, 172, -84], [-72, 142, -114], [-38, 26, 126], [-28, -74, 16]],
  torso: 80, head: 6, labels: LABELS,
}));
