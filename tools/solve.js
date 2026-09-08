// Ferramenta de autoria de poses. Resolve a geometria em vez de a calcular à mão:
// dado um apoio fixo (mão ou pé no chão) e uma restrição, devolve anca e ângulo do tronco.
// Correr: node tools/solve.js
const SEG = {
  torso: 26, shoulder: 23, neck: 9.5, head: 5.8,
  upper: 14.5, fore: 13.5, thigh: 18, shin: 18, foot: 6,
  chestW: 6.3, waistW: 4.7, shoulderFront: 2.9,
};
const ARM = SEG.upper + SEG.fore;   // 28
const LEG = SEG.thigh + SEG.shin;   // 36
const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;
const r1 = v => Math.round(v * 10) / 10;
const dirOf = t => [Math.cos(rad(t)), -Math.sin(rad(t))];
const perpOf = t => { const d = dirOf(t); return [-d[1], d[0]]; };
const P = p => `[${r1(p[0])}, ${r1(p[1])}]`;

function shoulderFront(hip, t) {
  const d = dirOf(t), p = perpOf(t);
  return [hip[0] + SEG.shoulder * d[0] + SEG.shoulderFront * p[0],
          hip[1] + SEG.shoulder * d[1] + SEG.shoulderFront * p[1]];
}
function hipFromShoulder(sf, t) {
  const d = dirOf(t), p = perpOf(t);
  return [sf[0] - SEG.shoulder * d[0] - SEG.shoulderFront * p[0],
          sf[1] - SEG.shoulder * d[1] - SEG.shoulderFront * p[1]];
}
function ankleStraight(hip, t) {
  const d = dirOf(t + 180);
  return [hip[0] + LEG * d[0], hip[1] + LEG * d[1]];
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

// Corpo em linha (prancha, flexão): mão fixa, braço na vertical, tornozelo a uma altura dada.
// ankle_y = sf_y + 59*sin t - 2.9*cos t  →  resolve t analiticamente.
function prone({ handX, handY, ankleY, armLen = ARM }) {
  const sf = [handX, handY - armLen];
  const R = Math.hypot(SEG.shoulder + LEG, SEG.shoulderFront);
  const phi = deg(Math.atan2(SEG.shoulderFront, SEG.shoulder + LEG));
  const s = (ankleY - sf[1]) / R;
  if (Math.abs(s) > 1) return null;
  const t = phi + deg(Math.asin(s));
  const hip = hipFromShoulder(sf, t);
  return { hip, torso: t, ankle: ankleStraight(hip, t), sf };
}

// Corpo em linha com apoio no cotovelo (prancha de antebraços): cotovelo fixo no chão,
// braço superior na vertical (ombro acima do cotovelo).
function proneElbow({ elbowX, elbowY, ankleY }) {
  return prone({ handX: elbowX, handY: elbowY, ankleY, armLen: SEG.upper });
}

// Flexão descida: tornozelo fixo, ângulo do tronco dado → anca e ombro.
function pivotAnkle({ ankle, torso }) {
  const d = dirOf(torso);
  const hip = [ankle[0] + LEG * d[0], ankle[1] + LEG * d[1]];
  return { hip, torso, sf: shoulderFront(hip, torso) };
}

// Quadrupedia: joelho no chão, coxa vertical, tronco a um ângulo dado.
function quadruped({ knee, torso, handX }) {
  const hip = [knee[0], knee[1] - SEG.thigh];
  const sf = shoulderFront(hip, torso);
  return { hip, torso, sf, handReach: handX == null ? null : r1(dist(sf, [handX, knee[1]])) };
}

// De pé: anca a [50,52], tornozelos em [50,88], chão a 90.
const STAND = { hip: [50, 52], torso: 90, sf: shoulderFront([50, 52], 90), ankle: [50, 88] };

// Sentado num banco: anca dada, coxa horizontal para a frente, canela vertical.
function seated({ hipY = 62, hipX = 44 } = {}) {
  const hip = [hipX, hipY];
  const knee = [hipX + SEG.thigh, hipY];
  const ankle = [knee[0], knee[1] + SEG.shin];
  return { hip, torso: 90, sf: shoulderFront(hip, 90), knee, ankle };
}

// Suspenso numa barra: mãos fixas na barra, corpo na vertical abaixo.
function hanging({ barY = 14, barX = 50 }) {
  const sf = [barX, barY + ARM];
  const hip = hipFromShoulder(sf, 90);
  return { hip, torso: 90, sf, ankle: ankleStraight(hip, 90), bar: [barX, barY] };
}

// ---- relatório ----
const out = [];
const show = (name, o) => out.push(`${name.padEnd(30)} hip ${P(o.hip)} torso ${r1(o.torso)}` +
  (o.ankle ? ` ankle ${P(o.ankle)}` : '') + (o.sf ? ` ombro ${P(o.sf)}` : '') +
  (o.knee ? ` knee ${P(o.knee)}` : '') + (o.handReach != null ? ` alcance ${o.handReach}/${ARM}` : ''));

show('de pé', STAND);
show('sentado (banco 62)', seated({}));
show('suspenso (barra y=14)', hanging({ barY: 14 }));

// flexão: mão em (68.4, 81.9), pé a 83.6
show('flexão topo', prone({ handX: 68.4, handY: 81.9, ankleY: 83.6 }));
show('flexão fundo', pivotAnkle({ ankle: [17.8, 83.6], torso: 14 }));
// flexão declinada: mão no chão (84), pés numa cadeira (ankle y 44)
show('declinada topo', prone({ handX: 68, handY: 84, ankleY: 44 }));
// flexão archer / diamante / pseudo: iguais à flexão normal
// prancha de antebraços: cotovelo no chão a 84, pé a 83.6
show('prancha antebraços', proneElbow({ elbowX: 68, elbowY: 84, ankleY: 83.6 }));
// prancha alta (mãos no chão)
show('prancha alta', prone({ handX: 68, handY: 84, ankleY: 83.6 }));
// pike: mão (69, 83.5), pé a 84 — resolve o tronco
show('pike topo', prone({ handX: 69, handY: 83.5, ankleY: 84 }));
// bear crawl: mãos e joelhos no chão
show('bear crawl', quadruped({ knee: [40, 80], torso: 6, handX: 66 }));
show('quadrupedia (bird dog)', quadruped({ knee: [40, 82], torso: 10, handX: 64 }));
show('quadrupedia mais plana', quadruped({ knee: [40, 82], torso: 16, handX: 64 }));

console.log(out.join('\n'));
console.log('\nARM', ARM, 'LEG', LEG);
