// Ficheiro de calendário (.ics) com os treinos planeados.
// Porque não notificações: no iOS, uma app web só recebe notificações agendadas
// através de um servidor de push (VAPID). Sem servidor, `setTimeout` só corre com a
// app aberta, o que não avisa ninguém de nada. O calendário do telefone já sabe
// avisar, e funciona com a app fechada — por isso é ele que dá o lembrete.
import { buildWeek } from './engine/planner.js';
import { mondayOf } from './store.js';

const pad = n => String(n).padStart(2, '0');

// Data local no formato do calendário. Sem "Z": fica na hora do telefone,
// senão um treino das 18h aparecia às 19h no verão.
function stamp(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function fold(linha) {
  // O formato exige linhas até 75 octetos, continuadas com um espaço à frente.
  const bytes = [...linha];
  if (bytes.length <= 73) return linha;
  const partes = [];
  for (let i = 0; i < bytes.length; i += 73) partes.push(bytes.slice(i, i + 73).join(''));
  return partes.join('\r\n ');
}

// O formato pede barra, ponto e vírgula, vírgula e mudança de linha escapados.
const BS = String.fromCharCode(92);
const escape = t => String(t)
  .split(BS).join(BS + BS)
  .split(';').join(BS + ';')
  .split(',').join(BS + ',')
  .split(String.fromCharCode(10)).join(BS + 'n');

export function buildICS(state, { semanas = 8, hora = 18, minuto = 0, aviso = 30 } = {}) {
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Treino//PT', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH', 'X-WR-CALNAME:Treino',
  ];
  const base = mondayOf(new Date());
  let n = 0;
  for (let w = 0; w < semanas; w++) {
    const d = new Date(base);
    d.setDate(d.getDate() + w * 7);
    const wk = buildWeek(state, d);
    for (const s of wk.sessions) {
      if (s.type === 'rest') continue;
      const [Y, M, D] = s.date.split('-').map(Number);
      const inicio = new Date(Y, M - 1, D, hora, minuto, 0);
      if (inicio < new Date()) continue; // não vale a pena lembrar o passado
      const fim = new Date(inicio.getTime() + (s.estMinutes || 30) * 60000);
      n++;
      linhas.push(
        'BEGIN:VEVENT',
        `UID:treino-${s.date}-${s.type}@treino`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(inicio)}`,
        `DTEND:${stamp(fim)}`,
        fold(`SUMMARY:${escape(s.title)}`),
        fold(`DESCRIPTION:${escape(`${s.subtitle} · ${s.estMinutes} min`)}`),
        'BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${escape(s.title)}`), `TRIGGER:-PT${aviso}M`, 'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  linhas.push('END:VCALENDAR');
  return { texto: linhas.join('\r\n') + '\r\n', eventos: n };
}

export function downloadICS(state, opcoes) {
  const { texto, eventos } = buildICS(state, opcoes);
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'treino.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return eventos;
}
