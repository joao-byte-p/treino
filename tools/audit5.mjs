// Testa a lógica do temporizador com um relógio controlado, sem depender do browser.
let now = 1000000;
const cbs = [];
globalThis.window = { matchMedia: () => ({ matches: false }) };
// navigator já existe no node e é só de leitura
globalThis.requestAnimationFrame = fn => { cbs.push(fn); return cbs.length; };
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => now };
const realNow = Date.now;
Date.now = () => now;

const { countdown, fmt, fmtLong } = await import('../js/timer.js');

const problems = [];
const warn = m => problems.push(m);
// avança o relógio e corre os quadros pendentes, como o browser faria
function advance(ms, step = 100) {
  for (let done = 0; done < ms; done += step) {
    now += step;
    const pend = cbs.splice(0, cbs.length);
    for (const fn of pend) fn(now);
  }
}

// 1. conta para baixo e termina uma só vez
{
  const seen = [];
  let dones = 0;
  const t = countdown(10, { onTick: s => seen.push(s), onDone: () => dones++ });
  advance(4000);
  if (seen[0] !== 10) warn(`primeiro valor devia ser 10, foi ${seen[0]}`);
  const atual = seen[seen.length - 1];
  if (atual !== 6) warn(`após 4s devia faltar 6, faltam ${atual}`);
  advance(7000);
  if (dones !== 1) warn(`onDone disparou ${dones} vezes (esperado 1)`);
  t.stop();
}

// 2. pausa congela, retomar continua de onde ficou
{
  const seen = [];
  const t = countdown(20, { onTick: s => seen.push(s) });
  advance(5000);
  const antes = seen[seen.length - 1];
  t.pause();
  advance(8000);
  const durante = seen[seen.length - 1];
  if (durante !== antes) warn(`pausa não congelou: ${antes} -> ${durante}`);
  t.resume();
  advance(3000);
  const depois = seen[seen.length - 1];
  if (depois !== antes - 3) warn(`retomar devia continuar em ${antes - 3}, ficou ${depois}`);
  t.stop();
}

// 3. juntar e tirar segundos
{
  const seen = [];
  const t = countdown(30, { onTick: s => seen.push(s) });
  advance(5000);
  const antes = seen[seen.length - 1];
  t.add(10);
  advance(1000);
  const depois = seen[seen.length - 1];
  if (depois !== antes + 9) warn(`+10s: esperado ${antes + 9}, obtido ${depois}`);
  t.add(-10);
  advance(1000);
  const final = seen[seen.length - 1];
  if (final !== depois - 11) warn(`-10s: esperado ${depois - 11}, obtido ${final}`);
  t.stop();
}

// 4. pausar e juntar segundos enquanto está em pausa
{
  const seen = [];
  const t = countdown(30, { onTick: s => seen.push(s) });
  advance(2000);
  const antes = seen[seen.length - 1];
  t.pause();
  t.add(10);
  advance(3000);
  if (seen[seen.length - 1] !== antes) warn('juntar segundos em pausa fez o relógio andar');
  t.resume();
  advance(1000);
  const depois = seen[seen.length - 1];
  if (depois !== antes + 9) warn(`+10s em pausa: esperado ${antes + 9}, obtido ${depois}`);
  t.stop();
}

// 5. app suspensa (ecrã bloqueado): ao voltar não pode ficar preso nem ir a negativo
{
  let dones = 0;
  const seen = [];
  const t = countdown(15, { onTick: s => seen.push(s), onDone: () => dones++ });
  advance(2000);
  now += 120000;            // 2 minutos sem quadros, como quando o ecrã apaga
  advance(300);
  if (dones !== 1) warn(`após suspensão longa onDone disparou ${dones} vezes`);
  if (seen.some(s => s < 0)) warn(`relógio foi a negativo: ${Math.min(...seen)}`);
  t.stop();
}

// 6. parar impede disparos posteriores
{
  let dones = 0;
  const t = countdown(3, { onDone: () => dones++ });
  t.stop();
  advance(5000);
  if (dones !== 0) warn('onDone disparou depois de stop()');
}

// 7. formatação
{
  const casos = [[0, '0', '00:00'], [5, '5', '00:05'], [59, '59', '00:59'], [60, '1:00', '01:00'], [95, '1:35', '01:35'], [1500, '25:00', '25:00']];
  for (const [s, curto, longo] of casos) {
    if (fmt(s) !== curto) warn(`fmt(${s}) = ${fmt(s)}, esperado ${curto}`);
    if (fmtLong(s) !== longo) warn(`fmtLong(${s}) = ${fmtLong(s)}, esperado ${longo}`);
  }
}

Date.now = realNow;
console.log(problems.length ? `${problems.length} problemas:\n` + problems.join('\n') : 'sem problemas');
