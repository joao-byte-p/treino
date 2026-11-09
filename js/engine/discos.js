// Quando compensa comprar discos. Até aqui a app só o dizia depois de um exercício
// esgotar as repetições extra no teto — tarde, e um exercício de cada vez. Agora
// olha para o conjunto: quando dois ou mais exercícios já estão no teto e a subir
// por repetições, a carga deixou de ser a alavanca, e é altura de comprar.
import { BY_ID } from '../data/exercises.js';

// Os discos avulsos da Decathlon que servem nas barras dele (28 mm).
const SUGESTAO = { discos: 4, kg: 5 };

export function noTeto(state) {
  const teto = state.profile?.dumbbellMaxKg || 10;
  return Object.entries(state.loads || {})
    .filter(([id, kg]) => kg >= teto && BY_ID[id]?.equipment.includes('dumbbells'))
    .map(([id]) => ({ ex: BY_ID[id], bonus: (state.repBonus || {})[id] || 0 }));
}

export function recomendacaoDiscos(state, hoje = new Date()) {
  const teto = state.profile?.dumbbellMaxKg || 10;
  const lista = noTeto(state);
  const presos = lista.filter(x => x.bonus >= 2);
  const recomendar = presos.length >= 2;
  const porHalter = (SUGESTAO.discos * SUGESTAO.kg) / 2;
  const adiado = state.profile?.discosAdiadoAte && state.profile.discosAdiadoAte > hoje.toISOString().slice(0, 10);
  return {
    teto, lista, presos, recomendar,
    mostrarNaHome: recomendar && !adiado,
    sugestao: `${SUGESTAO.discos} discos de ${SUGESTAO.kg} kg (28 mm)`,
    novoTeto: teto + porHalter,
  };
}
