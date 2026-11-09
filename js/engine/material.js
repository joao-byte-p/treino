// O que levar para o treino. Ele treina numa divisão à parte, e ir buscar a corda a
// meio do HIIT parte o treino. Daqui sai a lista: só o que se transporta (os sítios,
// como a piscina ou as barras, não se levam), pela ordem em que aparece na sessão,
// e com os pesos dos halteres, que nos ajustáveis se montam antes.

const ITENS = {
  dumbbells: { nome: 'Halteres', icon: 'halter' },
  board: { nome: 'Push-up board', icon: 'board' },
  bench: { nome: 'Banco', icon: 'banco' },
  rope: { nome: 'Corda de saltar', icon: 'corda' },
  chair: { nome: 'Cadeira ou banco', icon: 'cadeira' },
  toalha: { nome: 'Toalha', icon: 'toalha' },
};

// Exercícios que pedem uma coisa que o equipamento não diz.
const EXTRA_POR_EXERCICIO = { 'towel-pull-apart': 'toalha' };

// A natação é o único treino em que o material é o saco.
const SACO_PISCINA = ['Fato de banho', 'Touca e óculos', 'Toalha e chinelos'];

const kgTxt = kgs => kgs.length === 1 ? `${kgs[0]} kg` : `${kgs.slice(0, -1).join(', ')} e ${kgs[kgs.length - 1]} kg`;

export function materialDaSessao(session) {
  const vistos = new Map();
  const pesos = [];
  let primeiroPeso = null;
  for (const b of session.blocks || []) {
    for (const it of b.items || []) {
      const ex = it.ex;
      if (!ex) continue;
      if (ex.chain === 'swim') {
        for (const nome of SACO_PISCINA) if (!vistos.has(nome)) vistos.set(nome, { id: nome, nome, icon: 'saco' });
        continue;
      }
      // No aquecimento e nos alongamentos a cadeira é só um apoio, e serve qualquer
      // um (um degrau, um banco de jardim, a parede). Só conta se o treino a pedir.
      const soApoio = ['warmup', 'cooldown', 'mobility'].includes(b.kind);
      const codigos = [...ex.equipment, EXTRA_POR_EXERCICIO[ex.id]].filter(c => ITENS[c] && !(soApoio && c === 'chair'));
      for (const c of codigos) if (!vistos.has(c)) vistos.set(c, { id: c, ...ITENS[c] });
      const kg = it.load?.kg;
      if (ex.equipment.includes('dumbbells') && kg) {
        if (primeiroPeso == null) primeiroPeso = kg;
        if (!pesos.includes(kg)) pesos.push(kg);
      }
    }
  }
  const itens = [...vistos.values()];
  const halteres = itens.find(i => i.id === 'dumbbells');
  if (halteres) {
    const kgs = [...pesos].sort((a, b) => a - b);
    halteres.detalhe = kgs.length ? kgTxt(kgs) : 'peso à escolha';
    halteres.montar = primeiroPeso;
  }
  return itens;
}

// A versão curta, para a Home e para a página do dia.
export function materialResumo(itens) {
  return itens.map(i => (i.detalhe ? `${i.nome} · ${i.detalhe}` : i.nome));
}
