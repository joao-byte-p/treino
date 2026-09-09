// Poses dos exercícios: cada frame é um conjunto de ângulos (graus, 0 = direita, 90 = cima).
// Comprimentos dos segmentos vivem em figure.js, por isso a figura é sempre a mesma pessoa.
// Convenção: arms[0] e legs[0] são o lado afastado (far: true), [1] é o lado próximo.
// Membro pode ser: [ang1, ang2, pé, far] (FK) · { pin, bend, foot, far } (IK, apoio fixo)
// · { a: [ang1, ang2], foot, far, mirror } (FK; mirror = reflexo, para vistas de frente).
// Âncoras usadas em várias poses (ver tools/solve.js):
//   de pé       anca [50,52] tronco 90 · ombro [52.9,29] · tornozelo [50,88] · chão 90
//   prona       anca [47.5,64] tronco 33 · mão [68.4,81.9] · tornozelo [17.8,83.6] · chão 88
//   prona baixo anca [52.7,74.9] tronco 14
//   sentado     anca [44,62] · joelho [62,62] · tornozelo [62,80] · chão 84
//   suspenso    barra y 4 · ombro [50,32] · anca [47.1,55]

const STAND_LEGS = [{ pin: [50, 88], foot: 2, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }];
const STAND_FLOOR = [{ type: 'floor', y: 90, x1: 14, x2: 88 }];
const VB_STAND = '14 6 72 92';
const VB_STAND_TALL = '14 -4 72 100';
const ARMS_HANG = [{ a: [-93, -88], far: true }, { a: [-90, -90] }];
const PRONE_LEGS = [{ pin: [17.8, 83.6], foot: -42, bend: 1, far: true }, { pin: [17.8, 83.6], foot: -45, bend: 1 }];
const PRONE_LEGS_LOW = [{ pin: [17.8, 83.6], foot: -37, bend: 1, far: true }, { pin: [17.8, 83.6], foot: -40, bend: 1 }];
const PRONE_FLOOR = [{ type: 'floor', y: 88, x1: 2, x2: 98 }];
const VB_PRONE = '0 38 100 56';
// mãos direto no chão (sem board): resolvido em tools/solve.js
const PRONE_HANDS = [{ pin: [68.4, 84], bend: 1, far: true }, { pin: [68.4, 84], bend: 1 }];
const PRONE2_LEGS = [{ pin: [16.2, 83.6], foot: -42, bend: 1, far: true }, { pin: [16.2, 83.6], foot: -45, bend: 1 }];
const PRONE2_LEGS_LOW = [{ pin: [16.2, 83.6], foot: -37, bend: 1, far: true }, { pin: [16.2, 83.6], foot: -40, bend: 1 }];

export const POSES = {

  // ── Flexão na push-up board ──────────────────────────────────
  'pushup-board': {
    viewBox: '0 34 100 60',
    accent: 'arms',
    props: [...PRONE_FLOOR, { type: 'box', x: 58, y: 82, w: 20, h: 6 }],
    frames: [
      {
        label: 'Em cima, corpo em linha',
        hip: [48, 64], torso: 33, head: 0,
        arms: [{ pin: [68.4, 81.9], bend: 1, far: true }, { pin: [68.4, 81.9], bend: 1 }],
        legs: PRONE_LEGS,
      },
      {
        label: 'Em baixo, cotovelos atrás',
        hip: [52.7, 74.9], torso: 14, head: 0,
        arms: [{ pin: [68.4, 81.9], bend: 1, far: true }, { pin: [68.4, 81.9], bend: 1 }],
        legs: PRONE_LEGS_LOW,
      },
    ],
  },

  // ── Goblet squat ─────────────────────────────────────────────
  'goblet-squat': {
    viewBox: '14 6 72 92',
    accent: 'legs',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Em pé, halter ao peito',
        hip: [50, 52], torso: 90, head: 0,
        arms: [[-82, 74, true], [-78, 78]],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
      {
        label: 'Em baixo, joelho alinhado',
        hip: [40, 68], torso: 60, head: -12,
        arms: [[-112, 44, true], [-108, 48]],
        legs: STAND_LEGS,
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
    ],
  },

  // ── Peso morto romeno com halteres ───────────────────────────
  'db-rdl': {
    viewBox: '12 6 78 92',
    accent: 'legs',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Em pé, halteres nas coxas',
        hip: [50, 52], torso: 90, head: 0,
        arms: [[-93, -88, true], [-90, -90]],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Anca para trás, costas retas',
        hip: [36, 60], torso: 26, head: -14,
        arms: [[-93, -88, true], [-90, -90]],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Pike push-up ─────────────────────────────────────────────
  'pike-pushup': {
    viewBox: '30 34 66 60',
    accent: 'arms',
    props: [{ type: 'floor', y: 88, x1: 32, x2: 94 }],
    frames: [
      {
        label: 'Anca alta, braços esticados',
        hip: [47.5, 48.3], torso: -10.9, head: -50,
        arms: [{ pin: [69, 83.5], bend: 1, far: true }, { pin: [69, 83.5], bend: 1 }],
        legs: [{ pin: [44, 84], foot: -37, bend: 1, far: true }, { pin: [44, 84], foot: -40, bend: 1 }],
      },
      {
        label: 'Cabeça entre as mãos',
        hip: [56.4, 50.2], torso: -45.3, head: -20,
        arms: [{ pin: [69, 83.5], bend: 1, far: true }, { pin: [69, 83.5], bend: 1 }],
        legs: [{ pin: [44, 84], foot: -37, bend: 1, far: true }, { pin: [44, 84], foot: -40, bend: 1 }],
      },
    ],
  },

  // ── Dead bug ─────────────────────────────────────────────────
  'dead-bug': {
    viewBox: '6 38 116 52',
    far: [0, -5.2],
    accent: 'torso',
    props: [{ type: 'floor', y: 84, x1: 8, x2: 120 }],
    frames: [
      {
        label: 'Braços a 90°, joelhos sobre a anca',
        hip: [70, 76], torso: 180, head: 0,
        arms: [[97, 84, true], [88, 92]],
        legs: [[95, -6, 54, true], [88, 0, 60]],
      },
      {
        label: 'Estende braço e perna opostos',
        hip: [70, 76], torso: 180, head: 0,
        arms: [[97, 84, true], [162, 176]],
        legs: [[95, -6, 54, true], [14, 4, 66]],
      },
    ],
  },

  // ── Flexão declinada (pés elevados) ──
  'pushup-decline': {
    viewBox: '0 34 96 58',
    props: [{ type: 'floor', y: 88, x1: 2, x2: 94 }, { type: 'box', x: 0, y: 49, w: 22, h: 39 }],
    frames: [
      {
        label: 'Pés elevados, corpo em linha',
        hip: [45.7, 49.6], torso: -8.9, head: 0,
        arms: PRONE_HANDS,
        legs: [{ pin: [10.2, 44], foot: -68, bend: 1, far: true }, { pin: [10.2, 44], foot: -70, bend: 1 }],
      },
      {
        label: 'Peito perto do chão',
        hip: [43.1, 58.6], torso: -24, head: 0,
        arms: PRONE_HANDS,
        legs: [{ pin: [10.2, 44], foot: -68, bend: 1, far: true }, { pin: [10.2, 44], foot: -70, bend: 1 }],
      },
    ],
  },

  // ── Flexão archer ──
  'pushup-archer': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Mãos bem afastadas',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: [{ a: [-121, -121], far: true }, { pin: [68.4, 84], bend: 1 }],
        legs: PRONE2_LEGS,
      },
      {
        label: 'Desce para um lado, braço oposto estica',
        hip: [51.4, 76.1], torso: 12, head: 0,
        arms: [{ a: [-168, -145], far: true }, { pin: [68.4, 84], bend: 1 }],
        legs: PRONE2_LEGS_LOW,
      },
    ],
  },

  // ── Flexão pseudo planche ──
  'pushup-pseudo-planche': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Mãos à altura da anca, ombros à frente',
        hip: [47.3, 64.8], torso: 31.6, head: 0,
        arms: [{ pin: [62, 83], bend: 1, far: true }, { pin: [62, 83], bend: 1 }],
        legs: [{ pin: [16.6, 83.6], foot: -42, bend: 1, far: true }, { pin: [16.6, 83.6], foot: -45, bend: 1 }],
      },
      {
        label: 'Desce sem perder a inclinação',
        hip: [51.8, 76.1], torso: 12, head: 0,
        arms: [{ pin: [62, 83], bend: 1, far: true }, { pin: [62, 83], bend: 1 }],
        legs: [{ pin: [16.6, 83.6], foot: -37, bend: 1, far: true }, { pin: [16.6, 83.6], foot: -40, bend: 1 }],
      },
    ],
  },

  // ── Pike push-up com pés elevados ──
  'pike-elevated': {
    viewBox: '4 20 92 72',
    props: [{ type: 'floor', y: 88, x1: 6, x2: 94 }, { type: 'box', x: 6, y: 65, w: 26, h: 23 }],
    frames: [
      {
        label: 'Anca alta, quase na vertical',
        hip: [50, 40], torso: -35, head: -40,
        arms: [{ pin: [69, 83.5], bend: 1, far: true }, { pin: [69, 83.5], bend: 1 }],
        legs: [{ pin: [24, 60], foot: -60, bend: 1, far: true }, { pin: [24, 60], foot: -64, bend: 1 }],
      },
      {
        label: 'Testa para o chão, anca fixa',
        hip: [50, 40], torso: -55, head: -20,
        arms: [{ pin: [69, 83.5], bend: 1, far: true }, { pin: [69, 83.5], bend: 1 }],
        legs: [{ pin: [24, 60], foot: -60, bend: 1, far: true }, { pin: [24, 60], foot: -64, bend: 1 }],
      },
    ],
  },

  // ── Parada de mãos na parede ──
  'wall-handstand-hold': {
    viewBox: '18 -2 68 100',
    props: [{ type: 'floor', y: 94, x1: 20, x2: 84 }, { type: 'wall', x: 62, y1: 0, y2: 94 }],
    frames: [
      {
        label: 'Peito para a parede, ombros nas orelhas',
        hip: [48, 42], torso: -75, head: 10,
        arms: [{ pin: [44, 92], bend: -1, far: true }, { pin: [44, 92], bend: -1 }],
        legs: [{ a: [70, 78], foot: 24, far: true }, { a: [76, 84], foot: 28 }],
      },
    ],
  },

  // ── Press de ombros sentado ──
  'db-press-seated': {
    viewBox: '20 2 62 88',
    props: [{ type: 'floor', y: 84, x1: 22, x2: 78 }, { type: 'box', x: 26, y: 62, w: 40, h: 4 }, { type: 'bar', x1: 28, y1: 62, x2: 28, y2: 40 }],
    frames: [
      {
        label: 'Halteres à altura das orelhas',
        hip: [44, 62], torso: 90, head: 0,
        arms: [{ a: [-104, 82], far: true }, { a: [-100, 85] }],
        legs: [[4, -86, -16, true], [0, -90, -20]],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Braços esticados sem trancar',
        hip: [44, 62], torso: 90, head: 0,
        arms: [{ a: [80, 86], far: true }, { a: [83, 88] }],
        legs: [[4, -86, -16, true], [0, -90, -20]],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Press de ombros em pé ──
  'db-press-standing': {
    viewBox: VB_STAND_TALL,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Halteres à altura das orelhas',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-104, 82], far: true }, { a: [-100, 85] }],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Cabeça passa entre os braços',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [80, 86], far: true }, { a: [83, 88] }],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // -- Push press --
  'db-push-press': {
    viewBox: VB_STAND_TALL,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Mini-agachamento, joelhos alinhados',
        hip: [50, 58], torso: 90, head: 0,
        arms: [{ a: [-104, 82], far: true }, { a: [-100, 85] }],
        legs: STAND_LEGS,
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Explode e transfere para os braços',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [80, 86], far: true }, { a: [83, 88] }],
        legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Flexão diamante ──
  'diamond-pushup': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      { label: 'Mãos juntas sob o peito', hip: [47.1, 65.2], torso: 30.7, head: 0, arms: PRONE_HANDS, legs: PRONE2_LEGS },
      { label: 'Cotovelos colados ao tronco', hip: [51.4, 76.1], torso: 12, head: 0, arms: PRONE_HANDS, legs: PRONE2_LEGS_LOW },
    ],
  },

  // ── Flexões lentas de ativação ──
  'slow-pushup': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      { label: 'Desce em 3 segundos', hip: [47.1, 65.2], torso: 30.7, head: 0, arms: PRONE_HANDS, legs: PRONE2_LEGS },
      { label: 'Sobe em 3 segundos', hip: [51.4, 76.1], torso: 12, head: 0, arms: PRONE_HANDS, legs: PRONE2_LEGS_LOW },
    ],
  },

  // ── Dips em cadeira ──
  'chair-dips': {
    viewBox: '16 18 68 62',
    props: [{ type: 'floor', y: 78, x1: 18, x2: 82 }, { type: 'box', x: 20, y: 60, w: 20, h: 18 }],
    frames: [
      {
        label: 'Braços esticados, ombros longe das orelhas',
        hip: [39.1, 57.2], torso: 100, head: -8,
        arms: [{ pin: [34, 60], bend: 1, far: true }, { pin: [34, 60], bend: 1 }],
        legs: [{ pin: [70.3, 75.2], foot: 38, bend: -1, far: true }, { pin: [70.3, 75.2], foot: 40, bend: -1 }],
      },
      {
        label: 'Desce até 90° no cotovelo',
        hip: [39.1, 66], torso: 100, head: -8,
        arms: [{ pin: [34, 60], bend: 1, far: true }, { pin: [34, 60], bend: 1 }],
        legs: [{ pin: [70.3, 75.2], foot: 38, bend: -1, far: true }, { pin: [70.3, 75.2], foot: 40, bend: -1 }],
      },
    ],
  },

  // ── Dips em paralelas ──
  'bar-dips': {
    viewBox: '28 -4 44 104',
    props: [{ type: 'bar', x1: 40, y1: 48, x2: 66, y2: 48 }, { type: 'bar', x1: 36, y1: 52, x2: 62, y2: 52 }],
    frames: [
      {
        label: 'Braços esticados, tronco ligeiramente à frente',
        hip: [49.1, 43], torso: 92, head: -6,
        arms: [{ pin: [52, 48], bend: 1, far: true }, { pin: [52, 48], bend: 1 }],
        legs: [{ a: [-84, -126], foot: -70, far: true }, { a: [-80, -130], foot: -70 }],
      },
      {
        label: 'Ombro ao nível do cotovelo',
        hip: [49.1, 57], torso: 92, head: -6,
        arms: [{ pin: [52, 48], bend: 1, far: true }, { pin: [52, 48], bend: 1 }],
        legs: [{ a: [-84, -126], foot: -70, far: true }, { a: [-80, -130], foot: -70 }],
      },
    ],
  },

  // ── Elevações laterais (vista de frente) ──
  'db-lateral-raise': {
    viewBox: '6 6 88 88',
    wide: true, far: [0, 0],
    props: [{ type: 'floor', y: 90, x1: 8, x2: 92 }],
    frames: [
      {
        label: 'Peso leve, braços ao lado do corpo',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-95, -92], mirror: true, far: true }, { a: [-95, -92] }],
        legs: [{ a: [-84, -88], foot: 8, mirror: true, far: true }, { a: [-84, -88], foot: -8 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Sobe até à altura dos ombros',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-8, -2], mirror: true, far: true }, { a: [-8, -2] }],
        legs: [{ a: [-84, -88], foot: 8, mirror: true, far: true }, { a: [-84, -88], foot: -8 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Remo unilateral com halter ───────────────────────────────
  'db-row-1arm': {
    viewBox: '20 12 76 82',
    props: [{ type: 'floor', y: 88, x1: 22, x2: 92 }, { type: 'box', x: 46, y: 76, w: 32, h: 12 }],
    frames: [
      {
        label: 'Costas neutras, braço estendido',
        hip: [40, 50], torso: 10, head: -8,
        arms: [{ pin: [60, 76], bend: 1, far: true }, { pin: [63.2, 76.9], bend: 1 }],
        legs: [{ pin: [40, 86], foot: 4, bend: -1, far: true }, { pin: [40, 86], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Puxa o cotovelo até à anca',
        hip: [40, 50], torso: 10, head: -8,
        arms: [{ pin: [60, 76], bend: 1, far: true }, { pin: [58, 62], bend: 1 }],
        legs: [{ pin: [40, 86], foot: 4, bend: -1, far: true }, { pin: [40, 86], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Remo renegado (em prancha) ───────────────────────────────
  'renegade-row': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Prancha alta sobre os halteres',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: PRONE_HANDS,
        legs: PRONE2_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Puxa um halter sem rodar a anca',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: [{ pin: [68.4, 84], bend: 1, far: true }, { pin: [66, 70], bend: 1 }],
        legs: PRONE2_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Remo invertido na barra baixa ────────────────────────────
  'inverted-row-bars': {
    viewBox: '0 30 96 62',
    props: [{ type: 'floor', y: 88, x1: 2, x2: 94 }, { type: 'bar', x1: 52, y1: 40, x2: 84, y2: 40 }, { type: 'wall', x: 82, y1: 40, y2: 88 }],
    frames: [
      {
        label: 'Corpo em linha, braços esticados',
        hip: [43.5, 73.4], torso: 20.6, head: -6,
        arms: [{ pin: [66, 40], bend: -1, far: true }, { pin: [66, 40], bend: -1 }],
        legs: [[-162.4, -156.4, 120, true], [-159.4, -159.4, 116]],
      },
      {
        label: 'Puxa o peito até à barra',
        hip: [45.6, 65], torso: 35.6, head: -6,
        arms: [{ pin: [66, 40], bend: -1, far: true }, { pin: [66, 40], bend: -1 }],
        legs: [[-147.4, -141.4, 120, true], [-144.4, -144.4, 116]],
      },
    ],
  },

  // ── Elevações ────────────────────────────────────────────────
  'pullup': {
    viewBox: '10 -2 80 100',
    wide: true, far: [0, 0],
    props: [{ type: 'bar', x1: 24, y1: 4, x2: 76, y2: 4 }],
    frames: [
      {
        label: 'Braços esticados, ombros ativos',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ pin: [60, 4], bend: 1, mirror: true, far: true }, { pin: [60, 4], bend: 1 }],
        legs: [{ a: [-86, -88], foot: 6, mirror: true, far: true }, { a: [-86, -88], foot: -6 }],
      },
      {
        label: 'Queixo passa a barra',
        hip: [50, 40], torso: 90, head: 0,
        arms: [{ pin: [60, 4], bend: 1, mirror: true, far: true }, { pin: [60, 4], bend: 1 }],
        legs: [{ a: [-86, -88], foot: 6, mirror: true, far: true }, { a: [-86, -88], foot: -6 }],
      },
    ],
  },

  // ── Elevações negativas (só a descida) ───────────────────────
  'pullup-negative': {
    viewBox: '10 -2 80 100',
    wide: true, far: [0, 0],
    props: [{ type: 'bar', x1: 24, y1: 4, x2: 76, y2: 4 }],
    frames: [
      {
        label: 'Começa com o queixo acima da barra',
        hip: [50, 40], torso: 90, head: 0,
        arms: [{ pin: [60, 4], bend: 1, mirror: true, far: true }, { pin: [60, 4], bend: 1 }],
        legs: [{ a: [-86, -88], foot: 6, mirror: true, far: true }, { a: [-86, -88], foot: -6 }],
      },
      {
        label: 'Desce em 5 segundos controlados',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ pin: [60, 4], bend: 1, mirror: true, far: true }, { pin: [60, 4], bend: 1 }],
        legs: [{ a: [-86, -88], foot: 6, mirror: true, far: true }, { a: [-86, -88], foot: -6 }],
      },
    ],
  },

  // ── Elevação de joelhos suspenso ─────────────────────────────
  // Vista de LADO, ao contrário das outras suspensões: a subida do joelho acontece no
  // plano sagital, por isso de frente não se veria movimento nenhum.
  'hanging-knee-raise': {
    viewBox: '20 -4 60 100',
    accent: 'core',
    props: [{ type: 'bar', x1: 40, y1: 4, x2: 64, y2: 4 }],
    frames: [
      {
        label: 'Suspenso, ombros ativos',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ pin: [52, 4], bend: 1, far: true }, { pin: [52, 4], bend: 1 }],
        legs: [[-92, -90, -22, true], [-90, -90, -18]],
      },
      {
        label: 'Joelhos ao peito, sem balanço',
        hip: [50, 52], torso: 84, head: 0,
        arms: [{ pin: [52, 4], bend: 1, far: true }, { pin: [52, 4], bend: 1 }],
        legs: [[2, -104, -44, true], [6, -100, -40]],
      },
    ],
  },

  // ── Curl de bíceps ───────────────────────────────────────────
  'db-curl': {
    viewBox: VB_STAND,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Cotovelos colados ao tronco',
        hip: [50, 52], torso: 90, head: 0,
        arms: ARMS_HANG, legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Sobe sem balançar o tronco',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-98, 52], far: true }, { a: [-95, 55] }], legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Curl martelo ─────────────────────────────────────────────
  'db-hammer-curl': {
    viewBox: VB_STAND,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Pega neutra, polegar para cima',
        hip: [50, 52], torso: 90, head: 0,
        arms: ARMS_HANG, legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0', rot: 90 }, { type: 'db', at: 'wrist1', rot: 90 }],
      },
      {
        label: 'Sobe até quase tocar o ombro',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-95, 48], far: true }, { a: [-92, 50] }], legs: STAND_LEGS,
        items: [{ type: 'db', at: 'wrist0', rot: 90 }, { type: 'db', at: 'wrist1', rot: 90 }],
      },
    ],
  },

  // ── Fly posterior inclinado ──────────────────────────────────
  'db-rear-delt-fly': {
    viewBox: '10 10 88 84',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 96 }],
    frames: [
      {
        label: 'Tronco a 45°, joelhos suaves',
        hip: [44, 56], torso: 50, head: -14,
        arms: [{ a: [-93, -88], far: true }, { a: [-90, -90] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Abre e aperta as omoplatas',
        hip: [44, 56], torso: 50, head: -14,
        arms: [{ a: [-28, -12], far: true }, { a: [-25, -10] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Superman ─────────────────────────────────────────────────
  'superman': {
    viewBox: '-4 56 108 30',
    props: [{ type: 'floor', y: 78, x1: 8, x2: 108 }],
    frames: [
      {
        label: 'Deitado de barriga para baixo',
        hip: [48, 70], torso: 0, head: 0,
        arms: [{ a: [-11, -11], far: true }, { a: [-8, -8] }],
        legs: [{ a: [185, 185], foot: 200, far: true }, { a: [188, 188], foot: 204 }],
      },
      {
        label: 'Levanta braços e pernas 2 segundos',
        hip: [48, 70], torso: 0, head: 4,
        arms: [{ a: [5, 5], far: true }, { a: [8, 8] }],
        legs: [{ a: [169, 169], foot: 184, far: true }, { a: [172, 172], foot: 188 }],
      },
    ],
  },

  // ── Agachamento dividido ─────────────────────────────────────
  'split-squat': {
    viewBox: '14 10 80 86',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Pés fixos, um à frente do outro',
        hip: [50, 56], torso: 88, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [27.5, 83.5], foot: -118, bend: -1, far: true }, { pin: [60, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Desce a direito, joelho sobre o pé',
        hip: [50, 68], torso: 88, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [27, 84], foot: -117, bend: -1, far: true }, { pin: [60, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Agachamento búlgaro ──────────────────────────────────────
  'bulgarian-split-squat': {
    viewBox: '14 10 80 86',
    props: [{ type: 'floor', y: 90, x1: 16, x2: 88 }, { type: 'box', x: 20, y: 76, w: 22, h: 14 }],
    frames: [
      {
        label: 'Pé de trás na cadeira, peso à frente',
        hip: [50, 58], torso: 86, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [35, 76], foot: -160, bend: -1, far: true }, { pin: [64, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Desce vertical, joelho alinhado',
        hip: [50, 70], torso: 86, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [35, 76], foot: -160, bend: -1, far: true }, { pin: [64, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Pistol squat assistido ───────────────────────────────────
  'pistol-assisted': {
    viewBox: '10 10 88 86',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 96 }, { type: 'wall', x: 78, y1: 20, y2: 90 }],
    frames: [
      {
        label: 'Segura numa porta ou mesa',
        hip: [50, 54], torso: 86, head: 0,
        arms: [{ a: [-30, -12], far: true }, { pin: [74, 48], bend: -1 }],
        legs: [{ a: [-16, -8], foot: 60, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Desce lento até onde o joelho aceita',
        hip: [50, 65], torso: 72, head: -8,
        arms: [{ a: [-20, 0], far: true }, { pin: [74, 48], bend: -1 }],
        legs: [{ a: [-4, 2], foot: 60, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Afundo para trás ─────────────────────────────────────────
  'reverse-lunge': {
    viewBox: '14 10 80 86',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Em pé, peso nas mãos',
        hip: [50, 52], torso: 90, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Passo largo para trás, joelho a 90°',
        hip: [48, 60], torso: 88, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [25, 84], foot: -117, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Step-up controlado ───────────────────────────────────────
  'step-up': {
    viewBox: '29 -5 58 100',
    props: [{ type: 'floor', y: 90, x1: 16, x2: 94 }, { type: 'box', x: 56, y: 70, w: 26, h: 20 }],
    frames: [
      {
        label: 'Pé todo no degrau, sem impulso atrás',
        hip: [46, 56], torso: 88, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [40, 88], foot: 0, bend: -1, far: true }, { pin: [64, 70], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Sobe só com a perna de cima',
        hip: [60, 42], torso: 90, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [46, 76], foot: -20, bend: -1, far: true }, { pin: [64, 70], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Afundo caminhando ────────────────────────────────────────
  'walking-lunge': {
    viewBox: '10 10 84 86',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 92 }],
    frames: [
      {
        label: 'Passo longo, tronco vertical',
        hip: [46, 56], torso: 90, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [23.5, 83.5], foot: -118, bend: -1, far: true }, { pin: [62, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Joelho de trás quase toca o chão',
        hip: [46, 66], torso: 90, head: 0,
        arms: ARMS_HANG,
        legs: [{ pin: [23, 84], foot: -117, bend: -1, far: true }, { pin: [62, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Wall sit ─────────────────────────────────────────────────
  'wall-sit': {
    viewBox: '28 14 62 82',
    props: [{ type: 'floor', y: 90, x1: 30, x2: 86 }, { type: 'wall', x: 40, y1: 20, y2: 90 }],
    frames: [
      {
        label: 'Costas na parede, joelhos a 90°',
        hip: [46, 64], torso: 90, head: 0,
        arms: [{ a: [-88, -86], far: true }, { a: [-86, -88] }],
        legs: [{ pin: [64, 88], foot: 4, bend: -1, far: true }, { pin: [64, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Agachamento isométrico parcial ───────────────────────────
  'spanish-squat-iso': {
    viewBox: '14 10 80 86',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Desce até 60° e segura',
        hip: [40, 58], torso: 86, head: 0,
        arms: [{ a: [-18, -8], far: true }, { a: [-15, -5] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Step-down excêntrico lento ───────────────────────────────
  'slow-step-down': {
    viewBox: '34 -3 49 98',
    props: [{ type: 'floor', y: 90, x1: 30, x2: 86 }, { type: 'box', x: 46, y: 78, w: 26, h: 12 }],
    frames: [
      {
        label: 'Em pé no degrau',
        hip: [46, 44], torso: 90, head: 0,
        arms: [{ a: [-20, -10], far: true }, { a: [-18, -8] }],
        legs: [{ a: [-88, -92], foot: -10, far: true }, { pin: [56, 78], foot: 0, bend: -1 }],
      },
      {
        label: 'Desce o calcanhar em 4 segundos',
        hip: [46, 54], torso: 88, head: 0,
        arms: [{ a: [-20, -10], far: true }, { a: [-18, -8] }],
        legs: [{ a: [-88, -92], foot: -10, far: true }, { pin: [56, 78], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Elevação de tibial ───────────────────────────────────────
  'tibialis-raise': {
    viewBox: '30 14 62 82',
    props: [{ type: 'floor', y: 90, x1: 32, x2: 88 }, { type: 'wall', x: 42, y1: 20, y2: 90 }],
    frames: [
      {
        label: 'Costas na parede, pés à frente',
        hip: [48, 56], torso: 90, head: 0,
        arms: [{ a: [-88, -86], far: true }, { a: [-86, -88] }],
        legs: [{ pin: [58, 88], foot: 4, bend: -1, far: true }, { pin: [58, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Levanta as pontas dos pés',
        hip: [48, 56], torso: 90, head: 0,
        arms: [{ a: [-88, -86], far: true }, { a: [-86, -88] }],
        legs: [{ pin: [58, 88], foot: 25, bend: -1, far: true }, { pin: [58, 88], foot: 22, bend: -1 }],
      },
    ],
  },

  // ── Elevação de gémeos unilateral ────────────────────────────
  'calf-raise-single': {
    viewBox: '20 6 64 92',
    props: [{ type: 'floor', y: 92, x1: 22, x2: 80 }, { type: 'box', x: 38, y: 84, w: 28, h: 8 }, { type: 'wall', x: 74, y1: 18, y2: 92 }],
    frames: [
      {
        label: 'Calcanhar abaixo do degrau',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-40, -20], far: true }, { pin: [72, 46], bend: -1 }],
        legs: [{ a: [-100, -150], foot: -30, far: true }, { pin: [50, 84], foot: 0, bend: -1 }],
      },
      {
        label: 'Sobe alto, 1 segundo em cima',
        hip: [50, 45], torso: 90, head: 0,
        arms: [{ a: [-40, -20], far: true }, { pin: [72, 42], bend: -1 }],
        legs: [{ a: [-100, -150], foot: -30, far: true }, { pin: [50, 78], foot: -50, bend: -1 }],
      },
    ],
  },

  // ── Peso morto romeno unilateral ─────────────────────────────
  'db-single-leg-rdl': {
    viewBox: '-4 8 100 88',
    props: [{ type: 'floor', y: 90, x1: -2, x2: 94 }],
    frames: [
      {
        label: 'Halter na mão oposta à perna de apoio',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-93, -88], far: true }, { a: [-90, -90] }],
        legs: [{ a: [-96, -92], foot: 4, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Perna de trás estica como contrapeso',
        hip: [44, 58], torso: 26, head: -14,
        arms: [{ a: [-93, -88], far: true }, { a: [-90, -90] }],
        legs: [{ a: [172, 176], foot: 190, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Peso morto romeno em posição desfasada ───────────────────
  'db-staggered-rdl': {
    viewBox: '12 6 78 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Pé de trás só com a ponta no chão',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-93, -88], far: true }, { a: [-90, -90] }],
        legs: [{ pin: [40, 84], foot: -40, bend: -1, far: true }, { pin: [52, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: '90% do peso no pé da frente',
        hip: [36, 60], torso: 26, head: -14,
        arms: [{ a: [-93, -88], far: true }, { a: [-90, -90] }],
        legs: [{ pin: [40, 84], foot: -40, bend: -1, far: true }, { pin: [52, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Swing com halter ─────────────────────────────────────────
  'db-swing': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Anca para trás, halter entre as pernas',
        hip: [42, 58], torso: 30, head: -16,
        arms: [{ a: [-143, -143], far: true }, { a: [-140, -140] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
      {
        label: 'Anca dispara, braços só acompanham',
        hip: [50, 52], torso: 95, head: 0,
        arms: [{ a: [-22, -18], far: true }, { a: [-20, -15] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
    ],
  },

  // ── Ponte de glúteos ─────────────────────────────────────────
  'glute-bridge': {
    viewBox: '17 58 76 36',
    props: [{ type: 'floor', y: 89, x1: 16, x2: 94 }],
    frames: [
      {
        label: 'Anca no chão, pés à largura da anca',
        hip: [46, 78], torso: -8, head: 0,
        arms: [{ a: [-178, -181], far: true }, { a: [-180, -183] }],
        legs: [{ pin: [30, 87], foot: 24, bend: 1, far: true }, { pin: [30, 87], foot: 20, bend: 1 }],
      },
      {
        label: 'Empurra pelos calcanhares até à linha',
        hip: [46, 66], torso: -26.6, head: 0,
        arms: [{ a: [-178, -181], far: true }, { a: [-180, -183] }],
        legs: [{ pin: [30, 87], foot: 24, bend: 1, far: true }, { pin: [30, 87], foot: 20, bend: 1 }],
      },
    ],
  },

  // ── Hip thrust com halter ────────────────────────────────────
  'db-hip-thrust': {
    viewBox: '16 54 84 40',
    props: [{ type: 'floor', y: 90, x1: 18, x2: 98 }, { type: 'box', x: 68, y: 68, w: 26, h: 22 }],
    frames: [
      {
        label: 'Ombros no banco, halter na anca',
        hip: [42, 80], torso: 20, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ pin: [24, 86], foot: 22, bend: 1, far: true }, { pin: [24, 86], foot: 18, bend: 1 }],
        items: [{ type: 'db', at: [42, 74], rot: 90 }],
      },
      {
        label: 'Extensão completa, glúteo apertado',
        hip: [42, 68], torso: 8, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ pin: [24, 86], foot: 22, bend: 1, far: true }, { pin: [24, 86], foot: 18, bend: 1 }],
        items: [{ type: 'db', at: [42, 62], rot: 90 }],
      },
    ],
  },

  // ── Hip thrust unilateral ────────────────────────────────────
  'single-leg-hip-thrust': {
    viewBox: '16 42 84 52',
    props: [{ type: 'floor', y: 90, x1: 18, x2: 98 }, { type: 'box', x: 68, y: 68, w: 26, h: 22 }],
    frames: [
      {
        label: 'Uma perna no ar, joelho a 90°',
        hip: [42, 80], torso: 20, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ a: [112, 32], foot: 16, far: true }, { pin: [24, 86], foot: 18, bend: 1 }],
      },
      {
        label: 'Anca sobe nivelada, sem rodar',
        hip: [42, 68], torso: 8, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ a: [112, 32], foot: 16, far: true }, { pin: [24, 86], foot: 18, bend: 1 }],
      },
    ],
  },

  // ── Prancha frontal ──────────────────────────────────────────
  'plank': {
    viewBox: '4 54 94 38',
    props: [{ type: 'floor', y: 88, x1: 6, x2: 96 }],
    frames: [
      {
        label: 'Cotovelos sob os ombros, anca em linha',
        hip: [45.1, 73.3], torso: 16.6, head: 0,
        arms: [{ a: [-90, 4], far: true }, { a: [-90, 0] }],
        legs: [{ pin: [10.6, 83.6], foot: -42, bend: 1, far: true }, { pin: [10.6, 83.6], foot: -45, bend: 1 }],
      },
    ],
  },

  // ── Prancha RKC ──────────────────────────────────────────────
  'rkc-plank': {
    viewBox: '4 54 94 38',
    props: [{ type: 'floor', y: 88, x1: 6, x2: 96 }],
    frames: [
      {
        label: 'Punhos fechados, tensão máxima',
        hip: [45.1, 71.3], torso: 16.6, head: 0,
        arms: [{ a: [-90, 14], far: true }, { a: [-90, 10] }],
        legs: [{ pin: [10.6, 83.6], foot: -42, bend: 1, far: true }, { pin: [10.6, 83.6], foot: -45, bend: 1 }],
      },
    ],
  },

  // ── Prancha com toque no ombro ───────────────────────────────
  'plank-reach': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Prancha alta, pés afastados',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: PRONE_HANDS,
        legs: PRONE2_LEGS,
      },
      {
        label: 'Toca o ombro oposto sem rodar',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: [{ pin: [68.4, 84], bend: 1, far: true }, { pin: [60, 60], bend: 1 }],
        legs: PRONE2_LEGS,
      },
    ],
  },

  // ── Prancha lateral ──────────────────────────────────────────
  'side-plank': {
    viewBox: '-3 40 101 52',
    props: [{ type: 'floor', y: 88, x1: -1, x2: 96 }],
    frames: [
      {
        label: 'Cotovelo sob o ombro, anca alta',
        hip: [45.1, 73.3], torso: 16.6, head: 0,
        arms: [{ a: [78, 84], far: true }, { a: [-90, 0] }],
        legs: [{ pin: [10.6, 82], foot: -150, bend: 1, far: true }, { pin: [10.6, 85], foot: -146, bend: 1 }],
      },
    ],
  },

  // ── Prancha de Copenhague ────────────────────────────────────
  'copenhagen-plank': {
    viewBox: '0 44 98 48',
    props: [{ type: 'floor', y: 88, x1: 2, x2: 96 }, { type: 'box', x: 2, y: 78, w: 22, h: 10 }],
    frames: [
      {
        label: 'Perna de cima no banco, de baixo recolhida',
        hip: [45.1, 73.3], torso: 16.6, head: 0,
        arms: [{ a: [78, 84], far: true }, { a: [-90, 0] }],
        legs: [{ pin: [36, 84], foot: -150, bend: 1, far: true }, { pin: [12, 78], foot: -178, bend: 1 }],
      },
    ],
  },

  // ── Bird dog ─────────────────────────────────────────────────
  'bird-dog': {
    viewBox: '-10 41 104 50',
    props: [{ type: 'floor', y: 86, x1: 2, x2: 98 }],
    frames: [
      {
        label: 'Quatro apoios, costas neutras',
        hip: [40, 65], torso: 18, head: 0,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [62.8, 84.5], bend: 1 }],
        legs: [{ pin: [22, 83], foot: 178, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
      {
        label: 'Estende braço e perna opostos',
        hip: [40, 65], torso: 18, head: 6,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [89, 62], bend: 1 }],
        legs: [{ pin: [6, 66], foot: 172, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
    ],
  },

  // ── Hollow hold ──────────────────────────────────────────────
  // A lombar tem de assentar no chão: era o que a legenda dizia e o desenho não fazia,
  // com o corpo todo a flutuar 8 unidades acima da linha.
  'hollow-hold': {
    viewBox: '8 50 104 44',
    props: [{ type: 'floor', y: 88, x1: 10, x2: 110 }],
    frames: [
      {
        label: 'Lombar no chão, ombros e pernas no ar',
        hip: [60, 86], torso: 150, head: -14,
        arms: [{ a: [147, 152], far: true }, { a: [150, 155] }],
        legs: [{ a: [22, 20], foot: -3, far: true }, { a: [25, 23], foot: 0 }],
      },
    ],
  },

  // ── Hollow rocks ─────────────────────────────────────────────
  // O balanço rola sobre as costas: a anca desce ao chão num extremo e sobe no outro,
  // com os ombros e as pernas a fazer o contrapeso. Nunca sai do chão de vez.
  'hollow-rock': {
    viewBox: '8 50 104 44',
    props: [{ type: 'floor', y: 88, x1: 10, x2: 110 }],
    frames: [
      {
        label: 'Balança para trás',
        hip: [58, 83], torso: 146, head: -16,
        arms: [{ a: [141, 146], far: true }, { a: [144, 149] }],
        legs: [{ a: [28, 26], foot: 3, far: true }, { a: [31, 29], foot: 6 }],
      },
      {
        label: 'Balança para a frente sem perder a forma',
        hip: [62, 87], torso: 158, head: -12,
        arms: [{ a: [153, 158], far: true }, { a: [156, 161] }],
        legs: [{ a: [16, 14], foot: -9, far: true }, { a: [19, 17], foot: -6 }],
      },
    ],
  },

  // ── HIIT: burpee step-out ────────────────────────────────────
  'burpee-stepout': {
    viewBox: '5 7 84 88',
    props: [{ type: 'floor', y: 90, x1: 2, x2: 98 }],
    frames: [
      {
        label: 'Em pé, pronto a descer',
        hip: [50, 54], torso: 90, head: 0,
        arms: [{ pin: [52.9, 54], bend: 1, far: true }, { pin: [52.9, 54], bend: 1 }],
        legs: [{ pin: [50, 90], foot: 4, bend: -1, far: true }, { pin: [50, 90], foot: 0, bend: -1 }],
      },
      {
        label: 'Pés para trás um de cada vez, flexão',
        hip: [47.1, 67.2], torso: 30.7, head: 0,
        arms: [{ pin: [68.4, 86], bend: 1, far: true }, { pin: [68.4, 86], bend: 1 }],
        legs: [{ pin: [16.2, 85.6], foot: -42, bend: 1, far: true }, { pin: [16.2, 85.6], foot: -45, bend: 1 }],
      },
    ],
  },

  // ── HIIT: thruster ───────────────────────────────────────────
  'db-thruster': {
    viewBox: VB_STAND_TALL,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Agachamento com halteres aos ombros',
        hip: [44, 66], torso: 70, head: -10,
        arms: [{ a: [-118, 46], far: true }, { a: [-115, 50] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Sobe e pressiona num só movimento',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [80, 86], far: true }, { a: [83, 88] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── HIIT: mountain climbers ──────────────────────────────────
  'mountain-climber-slow': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Prancha alta, anca baixa',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: PRONE_HANDS,
        legs: PRONE2_LEGS,
      },
      {
        label: 'Joelho ao peito, ritmo constante',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: PRONE_HANDS,
        legs: [{ pin: [16.2, 83.6], foot: -42, bend: 1, far: true }, { pin: [50, 74], foot: -30, bend: 1 }],
      },
    ],
  },

  // ── HIIT: remo alternado em prancha ──────────────────────────
  'plank-row-alt': {
    viewBox: VB_PRONE,
    props: PRONE_FLOOR,
    frames: [
      {
        label: 'Prancha sobre halteres leves',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: PRONE_HANDS, legs: PRONE2_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Puxa um, pousa, puxa o outro',
        hip: [47.1, 65.2], torso: 30.7, head: 0,
        arms: [{ pin: [68.4, 84], bend: 1, far: true }, { pin: [66, 70], bend: 1 }],
        legs: PRONE2_LEGS,
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── HIIT: shadow boxing ──────────────────────────────────────
  'shadow-boxing': {
    viewBox: '10 6 84 92',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 92 }],
    frames: [
      {
        label: 'Postura de guarda, joelhos suaves',
        hip: [48, 54], torso: 88, head: 0,
        arms: [{ a: [-46, 56], far: true }, { a: [-42, 60] }],
        legs: [{ pin: [40, 88], foot: -8, bend: -1, far: true }, { pin: [56, 88], foot: 4, bend: -1 }],
      },
      {
        label: 'Jab e direto, roda a anca',
        hip: [48, 54], torso: 84, head: 0,
        arms: [{ a: [-46, 56], far: true }, { a: [-6, 0] }],
        legs: [{ pin: [40, 88], foot: -8, bend: -1, far: true }, { pin: [56, 88], foot: 4, bend: -1 }],
      },
    ],
  },

  // ── HIIT: bear crawl ─────────────────────────────────────────
  'bear-crawl': {
    viewBox: '4 44 96 48',
    props: [{ type: 'floor', y: 88, x1: 6, x2: 96 }],
    frames: [
      {
        label: 'Joelhos a dois dedos do chão',
        hip: [40, 62], torso: 14, head: 0,
        arms: [{ pin: [62.8, 85], bend: 1, far: true }, { pin: [62.8, 85], bend: 1 }],
        legs: [{ pin: [22, 85], foot: -150, bend: -1, far: true }, { pin: [22, 85], foot: -150, bend: -1 }],
      },
      {
        label: 'Avança mão e pé opostos',
        hip: [40, 62], torso: 14, head: 0,
        arms: [{ pin: [72, 85], bend: 1, far: true }, { pin: [62.8, 85], bend: 1 }],
        legs: [{ pin: [22, 85], foot: -150, bend: -1, far: true }, { pin: [32, 85], foot: -150, bend: -1 }],
      },
    ],
  },

  // ── HIIT: corda de saltar ────────────────────────────────────
  'rope-skip-light': {
    viewBox: '10 6 84 92',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 92 }, { type: 'rope', x1: 40, y1: 56, x2: 62, y2: 56, bow: 46 }],
    frames: [
      {
        label: 'Saltos de dois centímetros',
        hip: [50, 54], torso: 90, head: 0,
        arms: [{ a: [-58, -30], far: true }, { a: [-55, -26] }],
        legs: [{ pin: [50, 90], foot: 4, bend: -1, far: true }, { pin: [50, 90], foot: 0, bend: -1 }],
      },
      {
        label: 'Aterra na ponta dos pés',
        hip: [50, 50], torso: 90, head: 0,
        arms: [{ a: [-58, -30], far: true }, { a: [-55, -26] }],
        legs: [{ pin: [50, 86], foot: -40, bend: -1, far: true }, { pin: [50, 86], foot: -44, bend: -1 }],
      },
    ],
  },

  // ── HIIT: agachamento ao ar ──────────────────────────────────
  'squat-to-stand': {
    viewBox: VB_STAND,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Em pé, braços à frente',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-14, -4], far: true }, { a: [-11, -2] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Profundidade confortável, calcanhares no chão',
        hip: [40, 68], torso: 62, head: -12,
        arms: [{ a: [-42, -32], far: true }, { a: [-39, -30] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Cardio: corrida ──────────────────────────────────────────
  'run-z2': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Passada curta, pé debaixo da anca',
        hip: [50, 52], torso: 84, head: 4,
        arms: [{ a: [-58, -112], far: true }, { a: [-128, -62] }],
        legs: [{ a: [-128, -68], foot: -30, far: true }, { a: [-52, -100], foot: -12 }],
      },
      {
        label: 'Troca de pernas, ritmo conversável',
        hip: [50, 50], torso: 84, head: 4,
        arms: [{ a: [-128, -62], far: true }, { a: [-58, -112] }],
        legs: [{ a: [-52, -100], foot: -12, far: true }, { a: [-132, -44], foot: -40 }],
      },
    ],
  },

  'run-tempo': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Ritmo firme, joelho mais alto',
        hip: [50, 50], torso: 80, head: 6,
        arms: [{ a: [-50, -120], far: true }, { a: [-136, -54] }],
        legs: [{ a: [-136, -56], foot: -34, far: true }, { a: [-36, -104], foot: -10 }],
      },
      {
        label: 'Impulso atrás, tronco estável',
        hip: [50, 48], torso: 80, head: 6,
        arms: [{ a: [-136, -54], far: true }, { a: [-50, -120] }],
        legs: [{ a: [-36, -104], foot: -10, far: true }, { a: [-142, -36], foot: -44 }],
      },
    ],
  },

  // ── Cardio: natação ──────────────────────────────────────────
  'swim-easy': {
    viewBox: '-5 46 113 40',
    props: [{ type: 'water', y: 62, x1: -3, x2: 106 }],
    frames: [
      {
        label: 'Braço a entrar, corpo alinhado',
        hip: [44, 70], torso: 0, head: 4,
        arms: [{ a: [14, 10], far: true }, { a: [186, 178] }],
        legs: [{ a: [182, 176], foot: 200, far: true }, { a: [178, 184], foot: 196 }],
      },
      {
        label: 'Troca de braço, pernas soltas',
        hip: [44, 70], torso: 0, head: -4,
        arms: [{ a: [186, 178], far: true }, { a: [14, 10] }],
        legs: [{ a: [178, 184], foot: 196, far: true }, { a: [182, 176], foot: 200 }],
      },
    ],
  },

  // ── Cardio: caminhada rápida ─────────────────────────────────
  'walk-brisk': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Passo firme, braços a acompanhar',
        hip: [50, 52], torso: 88, head: 0,
        arms: [{ a: [-72, -100], far: true }, { a: [-108, -74] }],
        legs: [{ a: [-112, -92], foot: -20, far: true }, { pin: [58, 88], foot: 18, bend: -1 }],
      },
      {
        label: 'Troca de perna',
        hip: [50, 52], torso: 88, head: 0,
        arms: [{ a: [-108, -74], far: true }, { a: [-72, -100] }],
        legs: [{ a: [-72, -104], foot: -20, far: true }, { pin: [46, 88], foot: -10, bend: -1 }],
      },
    ],
  },

  // ── Cardio: basket livre ─────────────────────────────────────
  'basket-shoot': {
    viewBox: '14 -2 76 100',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Bola à frente, joelhos suaves',
        hip: [50, 54], torso: 90, head: 0,
        arms: [{ a: [-40, 30], far: true }, { a: [-36, 34] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'ball', at: 'wrist1', r: 6 }],
      },
      {
        label: 'Lançamento, sem saltar',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [62, 84], far: true }, { a: [66, 86] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'ball', at: 'wrist1', r: 6 }],
      },
    ],
  },

  // ── Mobilidade: alongamento do flexor da anca ────────────────
  'hip-flexor-stretch': {
    viewBox: '8 20 84 76',
    props: [{ type: 'floor', y: 90, x1: 10, x2: 90 }],
    frames: [
      {
        label: 'Afundo baixo, glúteo de trás apertado',
        hip: [48, 62], torso: 92, head: 0,
        arms: [{ a: [-80, -84], far: true }, { a: [-78, -86] }],
        legs: [{ a: [-150, -30], foot: 0, far: true }, { pin: [64, 88], foot: 0, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: figura 4 deitado ─────────────────────────────
  'figure-four': {
    viewBox: '20 52 74 40',
    far: [0, -3],
    props: [{ type: 'floor', y: 88, x1: 22, x2: 92 }],
    frames: [
      {
        label: 'Tornozelo sobre o joelho oposto',
        hip: [66, 78], torso: 180, head: 0,
        arms: [{ a: [-8, -4], far: true }, { a: [-30, -8] }],
        legs: [{ a: [24, -150], foot: -64, far: true }, { pin: [86, 84], foot: 40, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: 90/90 da anca ────────────────────────────────
  // Uma pose só: interpolar a troca de lado fazia as pernas passarem esticadas
  // pelo chão. A troca está descrita nas indicações do exercício.
  'ninety-ninety': {
    viewBox: '18 22 54 72',
    props: [{ type: 'floor', y: 88, x1: 20, x2: 70 }],
    frames: [
      {
        label: 'Ambas as pernas a 90°, costas retas',
        hip: [46, 66], torso: 84, head: -6,
        arms: [{ a: [-64, -70], far: true }, { a: [-60, -74] }],
        legs: [{ a: [-8, -96], foot: -170, far: true }, { a: [-172, -86], foot: -10 }],
      },
    ],
  },

  // ── Mobilidade: world's greatest stretch ─────────────────────
  'worlds-greatest': {
    viewBox: '4 16 92 80',
    props: [{ type: 'floor', y: 90, x1: 6, x2: 94 }],
    frames: [
      {
        label: 'Afundo longo, mão no chão',
        hip: [46, 64], torso: 20, head: 10,
        arms: [{ a: [-96, -92], far: true }, { pin: [64, 86], bend: 1 }],
        legs: [{ pin: [20, 86], foot: -160, bend: -1, far: true }, { pin: [66, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Roda e aponta o braço ao céu',
        hip: [46, 64], torso: 20, head: 26,
        arms: [{ a: [72, 86], far: true }, { pin: [64, 86], bend: 1 }],
        legs: [{ pin: [20, 86], foot: -160, bend: -1, far: true }, { pin: [66, 88], foot: 0, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: rotação torácica ─────────────────────────────
  'thoracic-rotation': {
    viewBox: '0 30 100 60',
    props: [{ type: 'floor', y: 86, x1: 2, x2: 98 }],
    frames: [
      {
        label: 'Cotovelo ao cotovelo oposto',
        hip: [40, 65], torso: 18, head: 0,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [58, 66], bend: 1 }],
        legs: [{ pin: [22, 83], foot: 178, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
      {
        label: 'Abre para o céu, anca fixa',
        hip: [40, 65], torso: 18, head: 24,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [72, 40], bend: 1 }],
        legs: [{ pin: [22, 83], foot: 178, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: tornozelo na parede ──────────────────────────
  'ankle-mobility': {
    viewBox: '18 10 60 82',
    props: [{ type: 'floor', y: 88, x1: 20, x2: 76 }, { type: 'wall', x: 70, y1: 14, y2: 88 }],
    frames: [
      {
        label: 'Pé a um palmo da parede',
        hip: [44, 58], torso: 86, head: 0,
        arms: [{ pin: [68, 48], bend: -1, far: true }, { pin: [68, 52], bend: -1 }],
        legs: [{ a: [-140, -50], foot: 0, far: true }, { pin: [60, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Joelho à parede sem levantar o calcanhar',
        hip: [48, 62], torso: 84, head: 0,
        arms: [{ pin: [68, 48], bend: -1, far: true }, { pin: [68, 52], bend: -1 }],
        legs: [{ a: [-140, -50], foot: 0, far: true }, { pin: [60, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Mobilidade: gato e vaca ──────────────────────────────────
  'cat-cow': {
    viewBox: '0 38 100 52',
    props: [{ type: 'floor', y: 86, x1: 2, x2: 98 }],
    frames: [
      {
        label: 'Inspira e arqueia (vaca)',
        hip: [40, 65], torso: 12, head: 18,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [62.8, 84.5], bend: 1 }],
        legs: [{ pin: [22, 83], foot: 178, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
      {
        label: 'Expira e arredonda (gato)',
        hip: [40, 65], torso: 24, head: -34,
        arms: [{ pin: [62.8, 84.5], bend: 1, far: true }, { pin: [62.8, 84.5], bend: 1 }],
        legs: [{ pin: [22, 83], foot: 178, bend: -1, far: true }, { pin: [22, 83], foot: 178, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: cão para baixo e cobra ───────────────────────
  'downdog-cobra': {
    viewBox: '2 26 94 68',
    props: [{ type: 'floor', y: 90, x1: 4, x2: 94 }],
    frames: [
      {
        label: 'Cão para baixo, calcanhares para o chão',
        hip: [33.7, 52.2], torso: -44.6, head: -30,
        arms: [{ pin: [69, 87], bend: 1, far: true }, { pin: [69, 87], bend: 1 }],
        legs: [{ pin: [32, 87], foot: 10, bend: 1, far: true }, { pin: [32, 87], foot: 6, bend: 1 }],
      },
      {
        label: 'Cobra, anca no chão e peito aberto',
        hip: [44, 82], torso: 34, head: 24,
        arms: [{ pin: [69, 87], bend: 1, far: true }, { pin: [69, 87], bend: 1 }],
        legs: [{ pin: [14, 87], foot: 184, bend: 1, far: true }, { pin: [14, 87], foot: 180, bend: 1 }],
      },
    ],
  },

  // ── Mobilidade: isquiotibiais em pé ──────────────────────────
  'hamstring-stretch': {
    viewBox: '14 14 80 82',
    props: [{ type: 'floor', y: 90, x1: 16, x2: 90 }, { type: 'box', x: 62, y: 72, w: 24, h: 18 }],
    frames: [
      {
        label: 'Calcanhar na cadeira, anca para trás',
        hip: [44, 56], torso: 56, head: -16,
        arms: [{ a: [-58, -46], far: true }, { a: [-54, -42] }],
        legs: [{ pin: [40, 88], foot: 0, bend: -1, far: true }, { pin: [66, 70], foot: 40, bend: -1 }],
      },
    ],
  },

  // ── Mobilidade: agachamento profundo ─────────────────────────
  'deep-squat-hold': {
    viewBox: '14 24 76 72',
    props: [{ type: 'floor', y: 90, x1: 16, x2: 86 }],
    frames: [
      {
        label: 'Desce até onde o joelho aceita',
        hip: [42, 74], torso: 68, head: -10,
        arms: [{ a: [-36, -26], far: true }, { a: [-33, -24] }],
        legs: [{ pin: [52, 88], foot: 4, bend: -1, far: true }, { pin: [52, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Mobilidade: respiração diafragmática ─────────────────────
  'diaphragm-breathing': {
    viewBox: '24 52 66 40',
    far: [0, -3],
    props: [{ type: 'floor', y: 86, x1: 26, x2: 88 }],
    frames: [
      {
        label: 'Uma mão no peito, outra na barriga',
        hip: [66, 78], torso: 180, head: 0,
        arms: [{ a: [-6, -2], far: true }, { pin: [58, 74], bend: -1 }],
        legs: [{ pin: [46, 84], foot: 168, bend: 1, far: true }, { pin: [44, 84], foot: 170, bend: 1 }],
      },
      {
        label: 'Inspira 4 segundos, só a barriga sobe',
        hip: [66, 78], torso: 180, head: 0,
        arms: [{ a: [-6, -2], far: true }, { pin: [58, 71], bend: -1 }],
        legs: [{ pin: [46, 84], foot: 168, bend: 1, far: true }, { pin: [44, 84], foot: 170, bend: 1 }],
      },
    ],
  },

  // ── Aquecimento: círculos de braços ──────────────────────────
  'arm-circles': {
    viewBox: '10 -2 80 100',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Braços à frente',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-4, 2], far: true }, { a: [0, 4] }],
        legs: STAND_LEGS,
      },
      {
        label: 'Círculos grandes, ambas as direções',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [86, 92], far: true }, { a: [90, 94] }],
        legs: STAND_LEGS,
      },
    ],
  },

  // ── Aquecimento: círculos de anca e balanços ─────────────────
  'hip-circles': {
    viewBox: '10 6 80 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Mãos na anca, balanço para a frente',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-118, -8], far: true }, { a: [-115, -4] }],
        legs: [{ a: [-56, -78], foot: -10, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'E para trás, amplitude progressiva',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-118, -8], far: true }, { a: [-115, -4] }],
        legs: [{ a: [-124, -104], foot: -30, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
    ],
  },

  // ── Aquecimento: agachamentos lentos ─────────────────────────
  'bw-squat-warm': {
    viewBox: VB_STAND,
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Em pé, braços à frente',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-14, -4], far: true }, { a: [-11, -2] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Lento, joelhos alinhados',
        hip: [42, 66], torso: 66, head: -10,
        arms: [{ a: [-40, -30], far: true }, { a: [-37, -28] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // ── Aquecimento: pull-aparts com toalha ──────────────────────
  'towel-pull-apart': {
    viewBox: '6 6 88 88',
    wide: true, far: [0, 0],
    props: [{ type: 'floor', y: 90, x1: 8, x2: 92 }],
    frames: [
      {
        label: 'Toalha esticada à frente',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-30, -20], mirror: true, far: true }, { a: [-30, -20] }],
        legs: [{ a: [-84, -88], foot: 8, mirror: true, far: true }, { a: [-84, -88], foot: -8 }],
      },
      {
        label: 'Puxa para os lados, aperta as omoplatas',
        hip: [50, 52], torso: 90, head: 0,
        arms: [{ a: [-12, 4], mirror: true, far: true }, { a: [-12, 4] }],
        legs: [{ a: [-84, -88], foot: 8, mirror: true, far: true }, { a: [-84, -88], foot: -8 }],
      },
    ],
  },

  // ── Aquecimento: marcha no lugar ─────────────────────────────
  'march-in-place': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Joelho à altura da anca, sem saltar',
        hip: [50, 52], torso: 88, head: 0,
        arms: [{ a: [-64, -104], far: true }, { a: [-116, -66] }],
        legs: [{ a: [-6, -96], foot: -20, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Troca de perna',
        hip: [50, 52], torso: 88, head: 0,
        arms: [{ a: [-116, -66], far: true }, { a: [-64, -104] }],
        legs: [{ a: [-92, -88], foot: -10, far: true }, { pin: [56, 62], foot: -30, bend: -1 }],
      },
    ],
  },

  // ── Swing com halter (intervalo) — mesmo movimento ───────────
  'db-swing-hiit': {
    viewBox: '14 6 76 92',
    props: STAND_FLOOR,
    frames: [
      {
        label: 'Anca para trás, ritmo constante',
        hip: [42, 58], torso: 30, head: -16,
        arms: [{ a: [-143, -143], far: true }, { a: [-140, -140] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
      {
        label: 'Halter até à altura do peito',
        hip: [50, 52], torso: 95, head: 0,
        arms: [{ a: [-22, -18], far: true }, { a: [-20, -15] }],
        legs: [{ pin: [50, 88], foot: 4, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
    ],
  },

  // ── Níveis novos no topo das cadeias ─────────────────────────

  // Curl concentrado: sentado, cotovelo apoiado na coxa, só o antebraço se move.
  'db-curl-concentration': {
    viewBox: '22 24 62 62',
    accent: 'arms',
    props: [{ type: 'floor', y: 82, x1: 24, x2: 82 }, { type: 'box', x: 30, y: 62, w: 22, h: 20 }],
    frames: [
      {
        label: 'Cotovelo na face interna da coxa',
        hip: [44, 62], torso: 45, head: -10,
        arms: [{ a: [-100, -95], far: true }, { a: [-90, -85] }],
        legs: [[4, -86, 0, true], [0, -90, 0]],
        items: [{ type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Sobe sem mexer o ombro',
        hip: [44, 62], torso: 45, head: -10,
        arms: [{ a: [-100, -95], far: true }, { a: [-90, 80] }],
        legs: [[4, -86, 0, true], [0, -90, 0]],
        items: [{ type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // Dips com pernas à frente: o mesmo dip, com as pernas a fazer de contrapeso.
  'bar-dips-lsit': {
    viewBox: '24 -4 78 104',
    props: [{ type: 'bar', x1: 40, y1: 48, x2: 66, y2: 48 }, { type: 'bar', x1: 36, y1: 52, x2: 62, y2: 52 }],
    frames: [
      {
        label: 'Pernas esticadas à frente, à altura da anca',
        hip: [49.1, 43], torso: 92, head: -6,
        arms: [{ pin: [52, 48], bend: 1, far: true }, { pin: [52, 48], bend: 1 }],
        legs: [[10, 6, 34, true], [6, 2, 30]],
      },
      {
        label: 'Ombro ao nível do cotovelo, pernas na linha',
        hip: [49.1, 57], torso: 92, head: -6,
        arms: [{ pin: [52, 48], bend: 1, far: true }, { pin: [52, 48], bend: 1 }],
        legs: [[10, 6, 34, true], [6, 2, 30]],
      },
    ],
  },

  // Wall sit numa perna: a perna livre estica à frente e duplica a carga na de apoio.
  'wall-sit-single': {
    viewBox: '28 14 68 82',
    props: [{ type: 'floor', y: 90, x1: 30, x2: 94 }, { type: 'wall', x: 40, y1: 20, y2: 90 }],
    frames: [
      {
        label: 'Costas na parede, uma perna estica à frente',
        hip: [46, 64], torso: 90, head: 0,
        arms: [{ a: [-88, -86], far: true }, { a: [-86, -88] }],
        legs: [{ a: [-8, -4], foot: 34, far: true }, { pin: [64, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },

  // Prancha lateral com subida da anca: a anca desce e sobe, o resto fica.
  'side-plank-dips': {
    viewBox: '-3 40 101 52',
    accent: 'core',
    props: [{ type: 'floor', y: 88, x1: -1, x2: 96 }],
    frames: [
      {
        label: 'Anca alta, corpo em linha',
        hip: [45.1, 73.3], torso: 16.6, head: 0,
        arms: [{ a: [78, 84], far: true }, { a: [-90, 0] }],
        legs: [{ pin: [10.6, 82], foot: -150, bend: 1, far: true }, { pin: [10.6, 85], foot: -146, bend: 1 }],
      },
      {
        label: 'Desce a anca a dois dedos do chão',
        hip: [45.1, 80], torso: 22, head: 0,
        arms: [{ a: [78, 84], far: true }, { a: [-90, 0] }],
        legs: [{ pin: [10.6, 82], foot: -150, bend: 1, far: true }, { pin: [10.6, 85], foot: -146, bend: 1 }],
      },
    ],
  },

  // Flexão em pino: a mesma vertical do apoio, agora a dobrar os braços.
  'handstand-pushup-wall': {
    viewBox: '18 -2 68 100',
    props: [{ type: 'floor', y: 94, x1: 20, x2: 84 }, { type: 'wall', x: 62, y1: 0, y2: 94 }],
    frames: [
      {
        label: 'Braços esticados, corpo em linha',
        hip: [48, 42], torso: -75, head: 10,
        arms: [{ pin: [44, 92], bend: -1, far: true }, { pin: [44, 92], bend: -1 }],
        legs: [{ a: [70, 78], foot: 24, far: true }, { a: [76, 84], foot: 28 }],
      },
      {
        label: 'Cabeça a dois dedos do chão',
        hip: [48, 52], torso: -75, head: 10,
        arms: [{ pin: [44, 92], bend: -1, far: true }, { pin: [44, 92], bend: -1 }],
        legs: [{ a: [70, 78], foot: 24, far: true }, { a: [76, 84], foot: 28 }],
      },
    ],
  },

  // Hip thrust unilateral com o pé de apoio num degrau: mais amplitude para o glúteo.
  'hip-thrust-single-elevated': {
    viewBox: '10 34 90 60',
    accent: 'legs',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 98 }, { type: 'box', x: 68, y: 68, w: 26, h: 22 }, { type: 'box', x: 14, y: 78, w: 22, h: 12 }],
    frames: [
      {
        label: 'Pé de apoio no degrau, joelho a 90°',
        hip: [42, 80], torso: 20, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ a: [112, 32], foot: 16, far: true }, { pin: [26, 76], foot: 0, bend: 1 }],
      },
      {
        label: 'Anca sobe nivelada, sem rodar',
        hip: [42, 66], torso: 6, head: -6,
        arms: [{ a: [-174, -178], far: true }, { a: [-172, -176] }],
        legs: [{ a: [112, 32], foot: 16, far: true }, { pin: [26, 76], foot: 0, bend: 1 }],
      },
    ],
  },

  // Pistol completo: o assistido sem parede, com os braços à frente a equilibrar.
  'pistol-full': {
    viewBox: '10 10 90 86',
    accent: 'legs',
    props: [{ type: 'floor', y: 90, x1: 12, x2: 98 }],
    frames: [
      {
        label: 'Perna livre estendida à frente',
        hip: [50, 54], torso: 86, head: 0,
        arms: [{ a: [-16, -8], far: true }, { a: [-12, -4] }],
        legs: [{ a: [-16, -8], foot: 60, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
      },
      {
        label: 'Desce em 3 segundos, joelho alinhado',
        hip: [50, 65], torso: 72, head: -8,
        arms: [{ a: [-4, 4], far: true }, { a: [0, 8] }],
        legs: [{ a: [-4, 2], foot: 60, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
      },
    ],
  },
};
