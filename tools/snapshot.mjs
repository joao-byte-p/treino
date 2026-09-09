// Fotografias do HTML de cada ecrã. As auditorias todas correm em Node e apanham
// motor, geometria e registo, mas nenhuma via o ecrã: uma regressão de marcação
// passava sem ninguém notar. Aqui os ecrãs são funções que devolvem HTML, por isso
// dá-se-lhes um estado fixo e um relógio parado e compara-se com o que está gravado.
// Correr: node tools/snapshot.mjs          (compara e falha se mudou)
//         node tools/snapshot.mjs --update (aceita o novo estado como referência)
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'tools/snapshots';
const UPDATE = process.argv.includes('--update');
const AGORA = new Date(2026, 8, 9, 10, 30, 0).getTime(); // 9 de setembro de 2026, quarta

// ── ambiente mínimo de browser, antes de qualquer import da app ──
const guardado = new Map();
globalThis.localStorage = {
  getItem: k => (guardado.has(k) ? guardado.get(k) : null),
  setItem: (k, v) => guardado.set(k, String(v)),
  removeItem: k => guardado.delete(k),
};
globalThis.window = { matchMedia: () => ({ matches: false }) };
// navigator já existe no Node e é só de leitura; nenhum ecrã lhe toca ao renderizar
const DataReal = Date;
class DataParada extends DataReal {
  constructor(...a) { super(...(a.length ? a : [AGORA])); }
  static now() { return AGORA; }
}
globalThis.Date = DataParada;

const { defaultState, iso, mondayOf } = await import('../js/store.js');
const views = await import('../js/ui/views.js');

// ── estado de referência: nem vazio nem aleatório ──
function estado() {
  const s = defaultState();
  s.onboarded = true;
  s.profile.name = 'João';
  s.chainLevels = { pushup: 2, squat: 3, row: 2, hinge: 1, plank: 2 };
  s.chainStreak = { pushup: 1 };
  s.loads = { 'goblet-squat': 12, 'db-rdl': 10, 'db-row-1arm': 8 };
  s.repBonus = { 'goblet-squat': 2 };
  const seg = mondayOf(new Date());
  s.logs = [0, 2, 4].map(d => {
    const x = new Date(seg); x.setDate(x.getDate() + d - 7);
    return { date: iso(x), type: 'forcaA', title: 'Força A', completed: true, minutes: 30, sessionRpe: 8, results: {}, summary: '3 de 3 exercícios · 30 min', events: ['Subiste de nível: Flexão declinada (pés elevados)'] };
  });
  return s;
}

const nav = { go() {}, back() {}, rerender() {} };
const st = estado();
localStorage.setItem('treino.v1', JSON.stringify(st));
const store = await import('../js/store.js');
store.update(s => { Object.assign(s, st, { profile: { ...s.profile, ...st.profile } }); });

const ECRAS = {
  home: () => views.renderHome(nav),
  plan: () => views.renderPlan(nav, 0),
  'plan-proxima': () => views.renderPlan(nav, 1),
  day: () => views.renderDay(nav, iso(new Date()), null),
  library: () => views.renderLibrary(nav, '', 'todos', false),
  'library-filtrada': () => views.renderLibrary(nav, '', 'squat', true),
  'library-procura': () => views.renderLibrary(nav, 'flex', 'todos', false),
  'exercise-pushup': () => views.renderExercise(nav, 'pushup-board'),
  'exercise-isometria': () => views.renderExercise(nav, 'plank'),
  'exercise-teto': () => views.renderExercise(nav, 'goblet-squat'),
  progress: () => views.renderProgress(nav),
  settings: () => views.renderSettings(nav, false),
  onboarding: () => views.renderSettings(nav, true),
};

fs.mkdirSync(DIR, { recursive: true });
const mudou = [];
const novos = [];
const erros = [];

for (const [nome, fn] of Object.entries(ECRAS)) {
  let html;
  try { html = fn(); } catch (e) { erros.push(`${nome}: ${e.message}`); continue; }
  if (typeof html !== 'string' || !html.trim()) { erros.push(`${nome}: devolveu vazio`); continue; }
  // uma tag por linha, para o diff dizer onde mudou em vez de "a linha 1 mudou"
  const bonito = html.replace(/>\s*</g, '>\n<').trim() + '\n';
  const ficheiro = path.join(DIR, `${nome}.html`);
  if (!fs.existsSync(ficheiro)) { fs.writeFileSync(ficheiro, bonito); novos.push(nome); continue; }
  const antes = fs.readFileSync(ficheiro, 'utf8');
  if (antes === bonito) continue;
  if (UPDATE) { fs.writeFileSync(ficheiro, bonito); mudou.push(nome); continue; }
  const a = antes.split('\n'); const b = bonito.split('\n');
  const i = a.findIndex((l, k) => l !== b[k]);
  mudou.push(`${nome} (linha ${i + 1}: "${(a[i] || '').slice(0, 70)}" → "${(b[i] || '').slice(0, 70)}")`);
}

console.log(`ecrãs: ${Object.keys(ECRAS).length}`);
if (novos.length) console.log(`gravados pela primeira vez: ${novos.join(', ')}`);
if (erros.length) { console.log(`ERROS:\n  ` + erros.join('\n  ')); process.exitCode = 1; }
if (mudou.length && UPDATE) console.log(`atualizados: ${mudou.join(', ')}`);
else if (mudou.length) {
  console.log(`${mudou.length} ecrãs mudaram:\n  ` + mudou.join('\n  '));
  console.log('\nSe a mudança é de propósito: node tools/snapshot.mjs --update');
  process.exitCode = 1;
} else if (!erros.length && !novos.length) console.log('sem alterações de marcação');
