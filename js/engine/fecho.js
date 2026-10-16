// Fecho de semana: as contas dos anéis, a sequência de semanas completas e a
// mensagem do ecrã que aparece quando ele guarda o treino que fecha a semana.
//
// As contas vivem aqui e não na Home para que o anel e a mensagem nunca discordem:
// se a Home diz 5/5, o fecho apareceu; se não apareceu, a Home não diz 5/5.
import { buildWeek } from './planner.js';
import { iso, mondayOf } from '../store.js';

const feito = (state, dateISO) => state.logs.find(l => l.date === dateISO && l.completed);

// Os anéis da Home. Um treino avulso não conta como planeado — senão pedi-lo
// aumentava a dívida da semana — mas os minutos dele contam para o tempo.
export function contasDaSemana(state, date = new Date()) {
  const wk = buildWeek(state, date);
  const planeados = wk.sessions.filter(x => x.type !== 'rest' && !x.extra);
  return {
    wk,
    planeados: planeados.length,
    feitos: planeados.filter(x => feito(state, x.date)).length,
    extras: wk.sessions.filter(x => x.extra && feito(state, x.date)).length,
    minsPlan: planeados.reduce((a, x) => a + (x.estMinutes || 0), 0),
    minsDone: wk.sessions.reduce((a, x) => a + (feito(state, x.date)?.minutes || 0), 0),
  };
}

export const semanaCompleta = c => c.planeados > 0 && c.feitos >= c.planeados;

// O que mudou entre antes e depois de guardar um treino. Só conta quem cruzou a
// linha agora: rever um treino de uma semana já completa não volta a dar o fecho.
export function oQueFechou(antes, depois) {
  return {
    semana: !semanaCompleta(antes) && semanaCompleta(depois),
    tempo: antes.minsPlan > 0 && antes.minsDone < antes.minsPlan && depois.minsDone >= depois.minsPlan,
  };
}

// Semanas completas seguidas, e a melhor sequência de sempre. Uma semana toda em
// pausa não conta nem quebra: ele avisou que ia estar fora. A semana em curso só
// conta se já estiver completa — enquanto está aberta, ainda não falhou.
export function semanasCompletas(state, hoje = new Date()) {
  const primeiro = state.logs.filter(l => l.completed).map(l => l.date).sort()[0];
  if (!primeiro) return { atual: 0, melhor: 0 };
  const seg = mondayOf(hoje);
  const estados = [];
  for (let i = 0; i < 260; i++) {
    const d = new Date(seg); d.setDate(seg.getDate() - i * 7);
    const fim = new Date(d); fim.setDate(d.getDate() + 6);
    if (iso(fim) < primeiro) break;
    const c = contasDaSemana(state, d);
    estados.unshift(c.planeados === 0 ? 'pausa' : semanaCompleta(c) ? 'completa' : i === 0 ? 'aberta' : 'falhada');
  }
  let corrida = 0, melhor = 0;
  for (const e of estados) {
    if (e === 'completa') melhor = Math.max(melhor, ++corrida);
    else if (e === 'falhada') corrida = 0;
  }
  return { atual: corrida, melhor };
}

const ritmo = c => {
  const seg = c?.seconds ?? (c?.minutes ? c.minutes * 60 : 0);
  const d = c?.dist ?? c?.km;
  return d && seg && (c.unit || 'km') === 'km' ? seg / d : null;
};
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Uma coisa concreta que aconteceu nesta semana. Uma só, a que mais vale: subir de
// nível é raro e é o que a progressão existe para dar; carga a seguir; depois o
// ritmo, mas só se for mesmo o melhor do último mês. Sem nada disto, não invento.
export function destaqueDaSemana(state, wk) {
  const ini = iso(wk.monday);
  const fimD = new Date(wk.monday); fimD.setDate(fimD.getDate() + 6);
  const fim = iso(fimD);
  const daSemana = state.logs.filter(l => l.completed && l.date >= ini && l.date <= fim);
  const eventos = daSemana.flatMap(l => l.events || []);

  const niveis = [...new Set(eventos.filter(e => e.startsWith('Subiste de nível: ')).map(e => e.slice(18)))];
  if (niveis.length === 1) return `Subiste de nível: ${niveis[0]}.`;
  if (niveis.length > 1) return `Subiste de nível em ${niveis.length} exercícios: ${niveis.slice(0, -1).join(', ')} e ${niveis[niveis.length - 1]}.`;

  const carga = eventos.find(e => e.startsWith('Mais carga: '));
  if (carga) return `${carga}.`;

  const corridas = daSemana.map(l => ({ l, r: ritmo(l.cardio) })).filter(x => x.r);
  if (corridas.length) {
    const melhor = corridas.reduce((a, b) => (b.r < a.r ? b : a));
    const mes = new Date(melhor.l.date); mes.setDate(mes.getDate() - 30);
    const outras = state.logs.filter(l => l.completed && l.date >= iso(mes) && l.date < ini && ritmo(l.cardio)).map(l => ritmo(l.cardio));
    if (outras.length && melhor.r < Math.min(...outras)) return `Melhor ritmo do último mês: ${mmss(melhor.r)}/km.`;
    const km = corridas.reduce((a, x) => a + Number(x.l.cardio.dist ?? x.l.cardio.km), 0);
    if (km >= 10) return `${Math.round(km * 10) / 10} km de corrida esta semana.`;
  }
  return null;
}

// A frase do fecho. Muda com o que aconteceu — primeira vez, regresso, sequência —
// e liga ao objetivo dele em vez de dar parabéns genéricos.
const PORQUE = {
  saude: 'Saúde é isto: a mesma semana, outra vez.',
  gordura: 'Para a gordura abdominal conta mais a regularidade do que a intensidade, e isto é regularidade.',
  musculo: 'O músculo vem de semanas destas repetidas, não de um treino heroico.',
};

export function fraseDoFecho({ atual, melhor }, objetivo) {
  const porque = PORQUE[objetivo] || PORQUE.saude;
  if (atual <= 1 && melhor <= 1) return `A tua primeira semana completa. ${porque}`;
  if (atual <= 1) return 'Uma semana completa depois de uma que não foi: é assim que se volta.';
  if (atual === melhor && atual >= 3) return `${atual} semanas completas seguidas, a tua melhor sequência. ${porque}`;
  if (atual >= 4) return `${atual} semanas completas seguidas: um ciclo inteiro sem falhar. ${porque}`;
  return `${atual} semanas completas seguidas. ${porque}`;
}
