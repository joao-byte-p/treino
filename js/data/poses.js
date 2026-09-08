// Poses dos exercícios: cada frame é um conjunto de ângulos (graus, 0 = direita, 90 = cima).
// Comprimentos dos segmentos vivem em figure.js, por isso a figura é sempre a mesma pessoa.
// Convenção: arms[0] e legs[0] são o lado afastado (far: true), [1] é o lado próximo.
// Lote 1 — 5 exercícios para validar o estilo.

export const POSES = {
  // ── Flexão na push-up board ──────────────────────────────────
  'pushup-board': {
    viewBox: '0 34 100 60',
    accent: 'arms',
    props: [{ type: 'floor', y: 89, x1: 2, x2: 98 }, { type: 'box', x: 58, y: 85, w: 20, h: 4 }],
    arrow: { from: [90, 54], to: [90, 74] },
    frames: [
      {
        label: 'Em cima, corpo em linha',
        hip: [48, 64], torso: 33, head: 0,
        arms: [{ pin: [68.4, 84.6], bend: 1, far: true }, { pin: [68.4, 84.6], bend: 1 }],
        legs: [{ pin: [17.8, 83.6], foot: -52, bend: 1, far: true }, { pin: [17.8, 83.6], foot: -55, bend: 1 }],
      },
      {
        label: 'Em baixo, cotovelos atrás',
        hip: [52.7, 74.9], torso: 14, head: 0,
        arms: [{ pin: [68.4, 84.6], bend: 1, far: true }, { pin: [68.4, 84.6], bend: 1 }],
        legs: [{ pin: [17.8, 83.6], foot: -47, bend: 1, far: true }, { pin: [17.8, 83.6], foot: -50, bend: 1 }],
      },
    ],
  },

  // ── Goblet squat ─────────────────────────────────────────────
  'goblet-squat': {
    viewBox: '14 6 72 92',
    accent: 'legs',
    props: [{ type: 'floor', y: 90, x1: 16, x2: 84 }],
    arrow: { from: [82, 46], to: [82, 68] },
    frames: [
      {
        label: 'Em pé, halter ao peito',
        hip: [50, 52], torso: 90, head: 0,
        arms: [[-82, 74, true], [-78, 78]],
        legs: [{ pin: [50, 88], foot: 2, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
      {
        label: 'Em baixo, joelho alinhado',
        hip: [40, 68], torso: 60, head: -12,
        arms: [[-112, 44, true], [-108, 48]],
        legs: [{ pin: [50, 88], foot: 2, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        marks: [{ at: 'knee1' }],
        items: [{ type: 'db', at: 'wrist1', rot: 90 }],
      },
    ],
  },

  // ── Peso morto romeno com halteres ───────────────────────────
  'db-rdl': {
    viewBox: '12 6 78 92',
    accent: 'legs',
    props: [{ type: 'floor', y: 90, x1: 14, x2: 88 }],
    arrow: { from: [44, 50], to: [24, 58], bow: 0.25 },
    frames: [
      {
        label: 'Em pé, halteres nas coxas',
        hip: [50, 52], torso: 90, head: 0,
        arms: [[-93, -88, true], [-90, -90]],
        legs: [{ pin: [50, 88], foot: 2, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
      {
        label: 'Anca para trás, costas retas',
        hip: [36, 60], torso: 26, head: -14,
        arms: [[-93, -88, true], [-90, -90]],
        legs: [{ pin: [50, 88], foot: 2, bend: -1, far: true }, { pin: [50, 88], foot: 0, bend: -1 }],
        items: [{ type: 'db', at: 'wrist0' }, { type: 'db', at: 'wrist1' }],
      },
    ],
  },

  // ── Pike push-up ─────────────────────────────────────────────
  'pike-pushup': {
    viewBox: '30 34 66 60',
    accent: 'arms',
    props: [{ type: 'floor', y: 88, x1: 32, x2: 94 }],
    arrow: { from: [90, 58], to: [90, 78] },
    frames: [
      {
        label: 'Anca alta, braços esticados',
        hip: [47.5, 48.3], torso: -10.9, head: -50,
        arms: [{ pin: [69, 85.5], bend: 1, far: true }, { pin: [69, 85.5], bend: 1 }],
        legs: [{ pin: [44, 84], foot: -37, bend: 1, far: true }, { pin: [44, 84], foot: -40, bend: 1 }],
      },
      {
        label: 'Cabeça entre as mãos',
        hip: [56.4, 50.2], torso: -45.3, head: -20,
        arms: [{ pin: [69, 85.5], bend: 1, far: true }, { pin: [69, 85.5], bend: 1 }],
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
};
