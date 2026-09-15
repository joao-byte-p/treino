// Gera os ciclos de corrida. A canela escreve-se pela FLEXÃO do joelho e não por
// um ângulo absoluto: um joelho só dobra para um lado, e a flexão nunca pode ser
// negativa. Foi por escrever ângulos soltos que a perna acabou a dobrar ao
// contrário a meio da passada. Correr: node tools/gait.mjs
const n = v => Math.round(v * 10) / 10;

// apoio fixo -> coxa e flexão equivalentes
function doPe(hipY, alvo, far) {
  const raiz = [far ? 44.8 : 50, hipY];
  const t = far ? [alvo[0] - 5.2, alvo[1]] : alvo;
  const dx = t[0] - raiz[0], dy = t[1] - raiz[1];
  const d = Math.min(35.99, Math.hypot(dx, dy));
  const linha = Math.atan2(-dy, dx) * 180 / Math.PI;
  const a = Math.acos(Math.min(1, d / 36)) / Math.PI * 180;
  return [n(linha + a), n(2 * a)];   // [coxa, flexão]
}

// [coxa, flexão, tornozelo] -> [coxa, canela, pé]. A canela fica SEMPRE do mesmo
// lado da coxa, e o pé segue a canela: é isso que impede o joelho de virar.
const angulos = ([coxa, flex, torn]) => [n(coxa), n(coxa - flex), n(coxa - flex + torn)];

function ciclo({ hipY, apoios, ar, torso, head, labels }) {
  const L = apoios.map((ap, i) => angulos([...doPe(hipY[i], ap.pe, false), ap.torn]))
    .concat(ar.map(angulos));
  // O braço segue a mesma regra do joelho: o cotovelo dobra sempre para o mesmo
  // lado. A flexão oscila entre 60° atrás (braço mais aberto) e 100° à frente.
  const A = Array.from({ length: 8 }, (_, k) => {
    const up = -91 + 33 * Math.cos((2 * Math.PI * k) / 8 + Math.PI);
    const flex = 80 - 20 * Math.cos((2 * Math.PI * k) / 8);
    return [n(up), n(up + flex)];
  });
  return Array.from({ length: 8 }, (_, k) => {
    const perto = L[k], longe = L[(k + 4) % 8], bP = A[k], bL = A[(k + 4) % 8];
    return `      {
        label: '${labels[k]}',
        hip: [50, ${hipY[k]}], torso: ${torso}, head: ${head},
        arms: [{ a: [${bL.join(', ')}], far: true }, { a: [${bP.join(', ')}] }],
        legs: [{ a: [${longe[0]}, ${longe[1]}], foot: ${longe[2]}, far: true }, { a: [${perto[0]}, ${perto[1]}], foot: ${perto[2]} }],
      },`;
  }).join('\n');
}

const LABELS = ['Contacto: o pé assenta debaixo da anca', 'Apoio: anca por cima do pé', 'Impulso: a perna estende-se atrás',
  'O pé larga o chão', 'Contacto do outro pé', 'Apoio do outro lado', 'Impulso do outro lado', 'E o outro pé larga o chão'];

// no ar: [coxa, flexão do joelho, ângulo do tornozelo relativo à canela]
console.log('--- run-z2\n' + ciclo({
  hipY: [53, 55, 51, 49, 53, 55, 51, 49],
  apoios: [{ pe: [56, 88], torn: 95 }, { pe: [50, 88], torn: 114 }, { pe: [42, 87], torn: 85 }],
  ar: [[-122, 45, 120], [-108, 85, 120], [-86, 115, 115], [-54, 95, 110], [-38, 40, 100]],
  torso: 84, head: 4, labels: LABELS,
}));
console.log('--- run-tempo\n' + ciclo({
  hipY: [52, 54, 50, 47, 52, 54, 50, 47],
  apoios: [{ pe: [57, 88], torn: 92 }, { pe: [50, 88], torn: 112 }, { pe: [40, 86], torn: 82 }],
  ar: [[-126, 52, 120], [-110, 98, 120], [-82, 130, 112], [-48, 105, 108], [-34, 44, 98]],
  torso: 80, head: 6, labels: LABELS,
}));
