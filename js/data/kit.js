// Guias do material. Uma coisa é saber o exercício, outra é saber usar o aparelho
// que o faz — e essa segunda não cabe na ficha de nenhum exercício, porque é a
// mesma para todos os que o usam.
//
// `equip` liga ao mesmo código de equipamento das fichas (js/data/exercises.js),
// e é por aí que a app descobre sozinha que exercícios é que cada guia serve.
// Só entra aqui material sobre o qual eu tenha mesmo alguma coisa a dizer: uma
// página que diz "usa a cadeira para te apoiares" é ruído.

export const KIT = [
  {
    id: 'board',
    equip: 'board',
    name: 'Push-up board',
    modelo: 'Crivit, Lidl · 65 × 20 cm · 12 posições · até 100 kg',
    resumo: 'Duas pegas que mudam de sítio. O que muda o músculo é onde as pões, não a placa.',
    // O que a placa faz mesmo, por oposição ao que a caixa promete.
    verdade: [
      ['Pulso direito', 'É esta a razão principal para a placa existir (o nome alemão do teu modelo é literalmente "poupa-pulsos"). Na flexão no chão o pulso dobra a 90°; na pega, fica em linha com o antebraço. Se tens desconforto no pulso, isto sozinho já justifica a compra.'],
      ['Posição repetível', 'A mão cai sempre no mesmo sítio. Parece pouco, mas é o que te deixa comparar uma série com a da semana passada sem estar a adivinhar a largura.'],
      ['Dois centímetros de altura', 'O peito desce um pouco mais do que desceria no chão. É mais amplitude, não é outro exercício.'],
    ],
    montagem: [
      'Encaixa cada pega a fundo até prender. Abana-a antes de te apoiares: uma pega meia-encaixada sai a meio da série.',
      'As duas pegas vão sempre no MESMO par de encaixes — a placa é simétrica e usar dois pares diferentes torce o ombro.',
      'Os protetores de borracha colam-se por baixo, ao longo dos lados compridos. Sem eles a placa desliza em soalho.',
      'A placa fica debaixo do PEITO, não debaixo dos ombros. À frente de mais, o ombro passa a fazer o trabalho todo.',
    ],
    // As quatro posições, descritas pelo que fazem e não pela cor — o código de
    // cores está impresso no centro da placa e varia de modelo para modelo.
    posicoes: [
      {
        nome: 'Estreita, debaixo do peito',
        alvo: 'Tríceps',
        largura: 7, altura: 46, rot: 0,
        como: 'Pegas juntas, à largura da anca ou menos, à altura do esterno. Cotovelos rentes às costelas durante todo o percurso.',
        nota: 'É a mais difícil das quatro. Se a anca começa a ceder, é sinal de que ainda não é a tua.',
      },
      {
        nome: 'À largura dos ombros',
        alvo: 'Peito e ombros',
        largura: 15, altura: 44, rot: 0,
        como: 'Pegas à largura dos ombros, viradas para a frente. Cotovelos a cerca de 45° do tronco.',
        nota: 'A mais neutra das quatro e a que deves usar por defeito. É esta que está no teu plano como flexão base.',
      },
      {
        nome: 'Larga, ao nível do peito',
        alvo: 'Peito',
        largura: 24, altura: 43, rot: 24,
        como: 'Pegas bem afastadas e viradas ligeiramente para fora, à altura dos mamilos. Peito a descer entre as mãos.',
        nota: 'Não abras os cotovelos até aos 90°: a amplitude que ganhas não compensa o que pedes à frente do ombro.',
      },
      {
        nome: 'Larga com as pegas viradas para dentro',
        alvo: 'Marcada como "costas" na placa',
        largura: 23, altura: 50, rot: -30,
        como: 'Pegas afastadas e rodadas para dentro, um pouco abaixo do peito. Puxa os ombros para baixo e para trás antes de descer.',
        nota: 'Aqui sou honesto contigo: uma flexão não treina costas. O que esta posição faz é obrigar as omoplatas a segurar — trabalho de estabilizador, não de dorsal. Para costas a sério, as barras da rua valem-te mais do que a placa.',
      },
    ],
    erros: [
      ['Placa à frente de mais', 'As mãos ficam à altura dos ombros ou acima. Desce a placa até as pegas te ficarem à altura do peito.'],
      ['Cotovelos a 90°', 'O clássico da posição larga. Aponta os cotovelos para trás em diagonal, não para os lados.'],
      ['Anca a ceder', 'Aperta os glúteos antes de descer. Se mesmo assim cede, sobe os pés é a solução errada — muda para uma posição mais fácil.'],
      ['Mudar de posição a meio da série', 'Escolhe uma por série. As quatro numa série só dá uma série medíocre em quatro sítios.'],
    ],
    // Uma sugestão concreta, para não ficar tudo em teoria.
    rotina: 'Uma volta pelas três primeiras posições, 8 a 12 repetições em cada, 60 segundos entre elas. Serve de aquecimento completo do tronco em cerca de 8 minutos, e podes usá-la nos dias em que não tens vontade de mais nada.',
    // Só dois exercícios a pedem por nome, e isso engana: a placa serve qualquer
    // flexão. É esta a razão de andar pouco usada no plano.
    plano: 'Só estes dois a pedem por nome, mas a placa serve qualquer flexão da biblioteca — diamante, archer, lenta, declinada. As mãos vão nas pegas em vez de irem no chão, o exercício é o mesmo e o pulso fica melhor tratado.',
  },

  {
    id: 'dumbbells',
    equip: 'dumbbells',
    name: 'Halteres ajustáveis',
    modelo: '12 kg cada',
    resumo: 'O erro caro dos ajustáveis não é o peso — é um disco mal apertado.',
    verdade: [
      ['Aperta e confirma', 'Antes de cada série, agarra num disco de cada lado e roda. Se mexe, a porca não está a fazer força. Um disco a sair a meio de um press acima da cabeça é a única lesão grave que este material consegue causar.'],
      ['Os dois lados iguais', 'É banal enganar-se num disco de 1 kg num dos lados. Conta os discos, não confies na memória.'],
      ['Doze quilos é um teto', 'Chega para tudo o que envolva um braço de cada vez, e fica curto no agachamento e na dobradiça de anca. A app sabe disso: quando o exercício deixa de ter carga suficiente, ela passa a somar repetições e depois tempo debaixo de tensão, e só te diz para comprar mais peso quando já não há mais nada a fazer.'],
    ],
    montagem: [
      'Monta no chão, nunca em cima de uma superfície alta.',
      'Discos do mais pesado para o mais leve, de dentro para fora — assim o peso fica junto ao centro e o halter não abana.',
      'Guarda-os desmontados se ficarem num sítio de passagem. Um halter de 12 kg em cima de um pé descalço não é brincadeira.',
    ],
    posicoes: [],
    erros: [
      ['Largar em cima do chão', 'Os ajustáveis não são de largar. Desce-os controlado ou parte-se a rosca.'],
      ['Pegar com a palma virada para baixo ao apanhar do chão', 'Roda para pega neutra antes de levantar.'],
    ],
    rotina: '',
  },

  {
    id: 'rope',
    equip: 'rope',
    name: 'Corda de saltar',
    modelo: '',
    resumo: 'Quase toda a gente salta com a corda comprida de mais e alto de mais.',
    verdade: [
      ['Comprimento', 'Põe um pé no meio da corda e puxa as pegas para cima ao longo do corpo: devem chegar-te às axilas, não acima. Comprida de mais obriga-te a saltar mais alto para lhe dar espaço.'],
      ['Altura do salto', 'Dois centímetros chegam. Se ouves o embate dos pés no chão do andar de baixo, estás a saltar alto de mais — e são os teus joelhos que pagam.'],
      ['Cotovelos junto ao corpo', 'Quem roda a corda a partir do ombro cansa-se nos ombros antes das pernas. A rotação é do pulso.'],
    ],
    montagem: [],
    posicoes: [],
    erros: [
      ['Aterrar com o calcanhar', 'Aterra na ponta do pé e deixa o calcanhar descer sem bater.'],
      ['Olhar para os pés', 'Olha em frente. Ver a corda não ajuda a saltá-la.'],
    ],
    rotina: 'Trinta segundos a saltar, trinta a descansar, oito vezes. Quatro minutos é um aquecimento completo — e com joelhos sensíveis é tempo que chegue.',
  },
];

export const KIT_BY_ID = Object.fromEntries(KIT.map(k => [k.id, k]));
