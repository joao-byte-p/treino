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
    // As quatro cores impressas na placa, lidas no boneco ao centro: vermelho no
    // trapézio, azul no peito, amarelo nos deltoides, verde no tríceps. As pegas
    // vão nos furos da cor que queres; o desenho mostra onde isso te põe as mãos.
    posicoes: [
      {
        cor: 'Verde', hex: '#22a06b',
        nome: 'Pegas juntas, debaixo do peito',
        alvo: 'Tríceps',
        largura: 7, altura: 46, rot: 0,
        como: 'Cotovelos rentes às costelas durante todo o percurso, a apontar para trás e não para os lados. Desce até o braço ficar paralelo ao tronco.',
        nota: 'É a mais difícil das quatro. Se a anca começa a ceder, ainda não é a tua — passa ao azul e volta cá daqui a umas semanas.',
      },
      {
        cor: 'Azul', hex: '#2f7fd1',
        nome: 'Pegas largas, ao nível do peito',
        alvo: 'Peito',
        largura: 24, altura: 43, rot: 24,
        como: 'Pegas bem afastadas, à altura dos mamilos, viradas ligeiramente para fora. O peito desce entre as mãos.',
        nota: 'Não abras os cotovelos até aos 90°: a amplitude que ganhas não compensa o que pedes à frente do ombro. Cerca de 45° chega.',
      },
      {
        cor: 'Amarelo', hex: '#d9a521',
        nome: 'Pegas à frente, anca mais alta',
        alvo: 'Ombros',
        largura: 15, altura: 34, rot: 0,
        como: 'Mãos mais perto da cabeça e anca levantada, para o empurrão ficar mais vertical. Quanto mais sobes a anca, mais o ombro trabalha e menos o peito.',
        nota: 'É meio caminho para o pike push-up que já tens na biblioteca. Se quiseres mesmo carregar o ombro, faz o pike; esta serve para variar sem mudar de exercício.',
      },
      {
        cor: 'Vermelho', hex: '#d1483f',
        nome: 'Pegas largas e um pouco atrás',
        alvo: 'Trapézio e omoplatas',
        largura: 23, altura: 52, rot: -30,
        como: 'Antes de descer, puxa os ombros para baixo e para trás e mantém-nos assim. No topo, empurra o chão e deixa as omoplatas afastarem-se.',
        nota: 'Aqui sou honesto contigo: uma flexão não treina costas. O vermelho do boneco está no trapézio, e o que esta posição faz é obrigar as omoplatas a segurar — trabalho de estabilizador, não de dorsal. Para costas a sério, as barras da rua valem-te mais.',
      },
    ],
    // O manual traz sete painéis (C a I). Nem todos te servem, e o porquê importa.
    manual: [
      ['C · Flexão estreita', 'É a posição verde. Já está acima.', 'ok'],
      ['D · Joelho ao peito', 'O manual pede que troques as pernas a saltar. Com os teus joelhos, faz a versão lenta — é o "mountain climbers controlados" que já tens na biblioteca.', 'cuidado'],
      ['E · Elevação de perna em prancha', 'Prancha de braços esticados nas pegas, uma perna a subir dois segundos e a descer. Não tens igual e vale a pena: é core sem nada em cima do joelho.', 'ok'],
      ['F · Flexão de joelhos', 'Regressão para quem está a começar. Com sete anos de treino, salta.', 'nao'],
      ['G · Elevação do corpo sentado', 'Sentas-te entre as pegas com as pernas esticadas à frente e empurras até a anca sair do chão. É a melhor da lista e é a única que não consegues fazer com mais nada que tenhas em casa.', 'ok'],
      ['H · Flexão com salto dos pés', 'Saltar com os pés a abrir e fechar. Outra vez salto, outra vez não.', 'nao'],
      ['I · Não é exercício', 'É o espaço livre: 0,6 m de cada lado da placa. Vale a pena reparar antes de te estenderes numa sala apertada.', 'ok'],
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
