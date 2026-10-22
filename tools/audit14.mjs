// Corrigir registos e o temporizador em pausa. Correr: node tools/audit14.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const problemas = [];
const falha = m => problemas.push(m);

// ── 1. o "00" pré-preenchido não se cola ao que ele escreve ────────────────
{
  const { ligarMmss, lerMmss } = await import('../js/ui/components.js');
  const campo = (seg, value) => {
    const ouvintes = {};
    return { value, matches: q => (q === '[data-c-seg]') === seg, select() {}, addEventListener: (t, f) => { ouvintes[t] = f; }, escrever(v) { this.value = v; ouvintes.input?.(); } };
  };
  const min = campo(false, '25'), seg = campo(true, '00');
  const root = { querySelectorAll: () => [min, seg], querySelector: q => (q === '[data-c-min]' ? min : seg) };
  ligarMmss(root);
  seg.escrever('0024');                       // o que o iPhone fazia: "00" + "24"
  if (seg.value !== '24') falha(`segundos "0024" deviam ficar "24", ficaram "${seg.value}"`);
  if (lerMmss(root) !== 25 * 60 + 24) falha(`25:24 deu ${lerMmss(root)} segundos`);
  min.escrever('3025');
  if (min.value !== '025') falha(`minutos com algarismos a mais deviam ficar com os últimos 3, ficaram "${min.value}"`);
}

// ── 2. corrigir um cardio já registado ─────────────────────────────────────
{
  const store = await import('../js/store.js');
  const base = store.defaultState(); base.onboarded = true;
  // o registo estragado: 25:2400 virou 65:00 e a semana contou 65 min
  base.logs = [
    { date: '2026-10-20', completed: true, minutes: 65, updatedAt: 1, results: {}, summary: '65:00 · 5 km', cardio: { ex: 'run-z2', seconds: 3900, minutes: 65, dist: 5, unit: 'km' } },
    // sessão guiada: a app mediu 38 min (aquecimento incluído), a corrida foi 24:10
    { date: '2026-10-21', completed: true, minutes: 38, updatedAt: 1, results: {}, summary: '24:10 · 5 km', cardio: { ex: 'run-z2', seconds: 1450, minutes: 1450 / 60, dist: 5, unit: 'km' } },
  ];
  store.importJSON(JSON.stringify(base));
  store.corrigirCardio('2026-10-20', { seconds: 25 * 60 + 24, dist: 5 });
  const l = store.findLog('2026-10-20');
  if (l.cardio.seconds !== 1524) falha(`tempo corrigido: ${l.cardio.seconds}`);
  if (l.minutes !== 25) falha(`a semana devia passar a contar 25 min, conta ${l.minutes}`);
  if (l.summary !== '25:24 · 5 km') falha(`resumo depois de corrigir: ${l.summary}`);
  if (!(l.updatedAt > 1)) falha('a correção não ficou mais recente, e a sincronização perdia-a');
  store.corrigirCardio('2026-10-21', { seconds: 1440, dist: 5.1 });
  const m = store.findLog('2026-10-21');
  if (m.minutes !== 38) falha(`corrigir a corrida não pode apagar o tempo que a app mediu: ${m.minutes}`);
  if (m.cardio.dist !== 5.1) falha('a distância corrigida não ficou');
  if (store.corrigirCardio('2026-10-20', { seconds: 0 })) falha('aceitou um tempo vazio');
}

// ── 3. somar tempo com o temporizador em pausa mostra-se logo ──────────────
{
  const { countdown } = await import('../js/timer.js');
  let mostrado = null, anel = null;
  const t = countdown(30, { onTick: s => { mostrado = s; }, onFrame: f => { anel = f; } });
  t.pause();
  t.add(10);
  if (mostrado !== 40) falha(`em pausa, +10s devia mostrar 40, mostra ${mostrado}`);
  if (anel !== 1) falha(`com mais tempo do que o inicial o anel devia estar cheio, está ${anel}`);
  t.add(-10); t.add(-10);
  if (mostrado !== 20) falha(`em pausa, −10s −10s devia mostrar 20, mostra ${mostrado}`);
  t.add(-100);
  if (mostrado !== 0) falha(`o tempo em pausa não pode ficar negativo: ${mostrado}`);
  t.stop();
}

console.log('correções e temporizador: 3 cenários');
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
