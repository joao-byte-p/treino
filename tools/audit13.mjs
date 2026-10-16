// Fecho de semana: quando aparece, o que conta para a sequência e o que diz.
// O fecho é uma recompensa: aparecer quando não devia, ou não aparecer quando
// ele fechou a semana, é pior do que não existir. Correr: node tools/audit13.mjs
const g = new Map();
globalThis.localStorage = { getItem: k => g.get(k) ?? null, setItem: (k, v) => g.set(k, String(v)), removeItem: k => g.delete(k) };
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { defaultState, iso, mondayOf } = await import('../js/store.js');
const F = await import('../js/engine/fecho.js');

const problemas = [];
const falha = m => problemas.push(m);
const seg0 = mondayOf(new Date(2026, 8, 14));
const dia = (sem, n) => { const x = new Date(seg0); x.setDate(seg0.getDate() + sem * 7 + n); return x; };
const base = () => { const s = defaultState(); s.onboarded = true; s.profile.cycleStart = iso(seg0); return s; };
const planeadosDe = (s, sem) => F.contasDaSemana(s, dia(sem, 0)).wk.sessions.filter(x => x.type !== 'rest' && !x.extra);
const registar = (s, dateISO, extra = {}) => { s.logs.push({ date: dateISO, completed: true, minutes: 30, updatedAt: 1, ...extra }); s.logs.sort((a, b) => a.date.localeCompare(b.date)); };
const fecharSemana = (s, sem, menos = 0) => planeadosDe(s, sem).slice(0, planeadosDe(s, sem).length - menos).forEach(x => registar(s, x.date));

// ── 1. o último treino planeado fecha a semana; os outros não ──────────────
{
  const s = base();
  const p = planeadosDe(s, 0);
  if (p.length < 3) falha(`semana de teste com ${p.length} treinos planeados`);
  p.slice(0, -1).forEach(x => registar(s, x.date));
  const antes = F.contasDaSemana(s, dia(0, 0));
  if (F.oQueFechou(F.contasDaSemana(base(), dia(0, 0)), antes).semana) falha('fechou a semana com um treino ainda por fazer');
  registar(s, p[p.length - 1].date);
  const depois = F.contasDaSemana(s, dia(0, 0));
  if (!F.oQueFechou(antes, depois).semana) falha('o último treino planeado não fechou a semana');
  // rever um treino de uma semana já completa não volta a dar o fecho
  if (F.oQueFechou(depois, depois).semana) falha('uma semana já completa voltou a fechar');
}

// ── 2. um treino extra não fecha a semana ──────────────────────────────────
{
  const s = base();
  const semana = F.contasDaSemana(s, dia(0, 0)).wk;
  const descanso = semana.sessions.find(x => x.type === 'rest');
  s.extras = { [descanso.date]: { tipo: 'mobilidade', minutos: 30 } };
  const p = planeadosDe(s, 0);
  p.slice(0, -1).forEach(x => registar(s, x.date));
  const antes = F.contasDaSemana(s, dia(0, 0));
  registar(s, descanso.date);
  const depois = F.contasDaSemana(s, dia(0, 0));
  if (F.oQueFechou(antes, depois).semana) falha('um treino extra fechou a semana no lugar de um planeado');
  if (depois.extras !== 1) falha(`o extra não foi contado como extra: ${depois.extras}`);
}

// ── 3. o anel do tempo fecha uma vez, quando cruza a linha ─────────────────
{
  const s = base();
  const c0 = F.contasDaSemana(s, dia(0, 0));
  const p = planeadosDe(s, 0);
  registar(s, p[0].date, { minutes: c0.minsPlan - 5 });
  const c1 = F.contasDaSemana(s, dia(0, 0));
  if (F.oQueFechou(c0, c1).tempo) falha('o tempo fechou abaixo do planeado');
  registar(s, p[1].date, { minutes: 10 });
  const c2 = F.contasDaSemana(s, dia(0, 0));
  if (!F.oQueFechou(c1, c2).tempo) falha('o tempo não fechou ao passar o planeado');
  if (F.oQueFechou(c2, c2).tempo) falha('o tempo voltou a fechar já fechado');
}

// ── 4. a sequência: falhar quebra, a pausa não, a semana aberta não ────────
{
  const s = base();
  fecharSemana(s, 0); fecharSemana(s, 1); fecharSemana(s, 2);
  let r = F.semanasCompletas(s, dia(3, 2));       // semana 3 aberta, sem treinos
  if (r.atual !== 3) falha(`3 semanas completas e a 4.ª em curso deviam dar 3, deu ${r.atual}`);
  fecharSemana(s, 3, 1);                           // semana 3 falhada por um treino
  r = F.semanasCompletas(s, dia(4, 2));
  if (r.atual !== 0 || r.melhor !== 3) falha(`semana falhada devia quebrar (0, melhor 3), deu ${r.atual}/${r.melhor}`);
  // semana toda em pausa no meio não quebra nem conta
  const t = base();
  fecharSemana(t, 0);
  t.pausas = [{ de: iso(dia(1, 0)), ate: iso(dia(1, 6)), motivo: 'Férias' }];
  fecharSemana(t, 2);
  r = F.semanasCompletas(t, dia(2, 6));
  if (r.atual !== 2) falha(`semana de pausa entre duas completas devia dar 2, deu ${r.atual}`);
  if (F.semanasCompletas(base()).atual !== 0) falha('sem treinos a sequência devia ser 0');
}

// ── 5. o destaque é real, e o mais valioso ganha ───────────────────────────
{
  const s = base();
  const p = planeadosDe(s, 1);
  const wk = F.contasDaSemana(s, dia(1, 0)).wk;
  if (F.destaqueDaSemana(s, wk) !== null) falha('sem nada para destacar, inventou um destaque');
  registar(s, p[0].date, { events: ['Mais carga: Remo a 10 kg'] });
  if (F.destaqueDaSemana(s, wk) !== 'Mais carga: Remo a 10 kg.') falha(`destaque de carga: ${F.destaqueDaSemana(s, wk)}`);
  registar(s, p[1].date, { events: ['Subiste de nível: Flexões diamante'] });
  if (F.destaqueDaSemana(s, wk) !== 'Subiste de nível: Flexões diamante.') falha(`subir de nível devia ganhar à carga: ${F.destaqueDaSemana(s, wk)}`);

  // ritmo: só se for mesmo o melhor do último mês
  const r = base();
  const wkR = F.contasDaSemana(r, dia(2, 0)).wk;
  registar(r, iso(dia(1, 2)), { cardio: { seconds: 1500, dist: 5, unit: 'km' } });   // 5:00/km na semana anterior
  registar(r, iso(dia(2, 2)), { cardio: { seconds: 1530, dist: 5, unit: 'km' } });   // 5:06/km: pior
  if (F.destaqueDaSemana(r, wkR) !== null) falha('um ritmo pior que o do mês foi dado como destaque');
  registar(r, iso(dia(2, 4)), { cardio: { seconds: 1460, dist: 5, unit: 'km' } });   // 4:52/km: melhor
  if (F.destaqueDaSemana(r, wkR) !== 'Melhor ritmo do último mês: 4:52/km.') falha(`destaque de ritmo: ${F.destaqueDaSemana(r, wkR)}`);
}

// ── 6. a frase muda com a história e liga ao objetivo ──────────────────────
{
  const f = F.fraseDoFecho;
  if (!/primeira semana completa/.test(f({ atual: 1, melhor: 1 }, 'saude'))) falha('primeira semana sem a frase de primeira');
  if (!/é assim que se volta/.test(f({ atual: 1, melhor: 4 }, 'saude'))) falha('regresso depois de falhar sem a frase de regresso');
  if (!/melhor sequência/.test(f({ atual: 5, melhor: 5 }, 'saude'))) falha('recorde sem dizer que é a melhor sequência');
  if (!/gordura abdominal/.test(f({ atual: 2, melhor: 3 }, 'gordura'))) falha('objetivo gordura sem a frase da gordura');
  if (!/3 semanas completas seguidas/.test(f({ atual: 3, melhor: 6 }, 'musculo'))) falha('sequência a meio sem o número');
  if (!f({ atual: 2, melhor: 2 }, 'objetivo-que-nao-existe')) falha('objetivo desconhecido partiu a frase');
}

console.log('fecho de semana: 6 cenários');
if (problemas.length) { console.log(`${problemas.length} problemas:\n  ` + problemas.join('\n  ')); process.exitCode = 1; }
else console.log('sem problemas');
