# Treino

App pessoal de plano de treino (PWA para iPhone e iPad). Sem build, sem dependências: HTML, CSS e módulos ES.

## Como funciona
- `js/data/exercises.js` — biblioteca de exercícios organizada em cadeias de progressão (`chain` + `level`).
- `js/engine/planner.js` — motor de regras: perfil → semana (por objetivo e dias) → sessões de ~30 min que cabem no tempo.
- `js/engine/progression.js` — duas sessões seguidas bem feitas → sobe de nível ou +2 kg.
- `js/ui/session.js` — sessão guiada por temporizador e registo simples (feito, kg, esforço).
- `js/store.js` — estado em localStorage, exportação/importação JSON.
- `sw.js` — funciona offline. Sobe a constante `VERSION` a cada deploy.

## Correr localmente
```bash
python -m http.server 8767
```
Abrir http://localhost:8767.

## Instalar no iPhone / iPad
Abrir o URL publicado no Safari → Partilhar → Adicionar ao ecrã principal.

## Figuras dos exercícios
As ilustrações não são imagens: são SVG desenhado a partir de um modelo de articulações.

- `js/ui/figure.js` — comprimentos dos segmentos, cinemática direta e inversa, desenho.
- `js/data/poses.js` — 2 poses por exercício (1 nas isometrias), definidas por ângulos.
- `figuras.html` — banco de provas para revisão em lote, com filtro por padrão.
- `revisao.html?ids=a,b&tam=250` — as mesmas figuras, mas só as que se pedem e em grande.
- `tools/solve.js` — resolve a geometria de apoios fixos (`node tools/solve.js`).
- `tools/check.mjs` — valida todas as poses (`node tools/check.mjs`).

## Visual
Referência: **Bevel** (a versão escura como origem, a clara como opção em Perfil → Aspeto).
Os dois temas vivem nos mesmos tokens em `css/app.css`: `:root` é o escuro, ardósia
azulada e não preto; `[data-theme="light"]` inverte a tinta. Regras que não se
voltam a discutir:
- **Nunca cor fixa fora dos tokens.** Preenchimentos discretos usam `--fill/-2/-3`,
  divisórias `--line/--line-strong`, o poço dos anéis e o painel das figuras `--well`.
  Um `rgba(255,255,255,…)` solto desaparece no tema claro.
- **Acentos são texto no tema claro**, por isso lá são escuros (`--mint: #0f7a4a`,
  4,5:1 sobre branco). Os anéis usam os degradês `--g-*`, vivos nos dois temas,
  porque nunca são texto.
- **Anéis assentam num poço** (`dial()`), grossos e com degradê ao longo do arco.
  Três lado a lado no topo de Hoje: Semana, Tempo, Ciclo. A frase de orientação vive
  no mesmo cartão, por baixo, com o kicker ORIENTAÇÃO.
- **Mosaicos de métrica** (`tile()`): ícone e rótulo em cima, número e unidade em
  baixo. Dois por linha a 375px; três cortam o rótulo.
- **Semibold, não black.** Títulos e números a 700. O 800 fazia a app mais pesada do
  que a referência.
- Cartões sem contorno; a separação é a cor do cartão sobre o fundo, mais sombra.
- **Gráficos em `js/ui/charts.js`**, ao estilo dos Trends da Bevel: número grande com a
  variação ao lado (`chartHead`), gráfico por baixo, último ponto destacado. Nunca
  desenham eixos completos — só os extremos que dão escala. Todas as barras têm cor e
  só a destacada é saturada: barras cinzentas com uma colorida liam-se como "só esta
  conta". Cada gráfico leva sempre um `alt` com os números por extenso, senão é um
  buraco para quem usa leitor de ecrã.
- **Num gráfico invertido diz-se o sentido.** No ritmo de corrida menos é melhor, por
  isso o menor valor fica em cima e há um rótulo `↑ mais rápido` — sem ele, a subida
  lê-se como piorar.
- **Miniaturas usam recorte quadrado centrado no corpo** (`figureSVG(..., { square: true })`),
  não o viewBox da pose. O viewBox enquadra a cena inteira e vai de 1,8:1 deitado a
  0,4:1 suspenso; numa caixa quadrada isso punha metade das figuras fora. `figcheck.mjs`
  verifica que todas cabem e enchem a caixa.

## Auditorias
Correr depois de mexer no motor, nas poses ou no registo:
```bash
for f in audit audit2 audit3 audit4 audit5 audit6 audit7 audit8 audit9 audit10 audit11 check anklecheck figcheck suave joelhos sw snapshot; do node tools/$f.mjs || break; done
```
| Ficheiro | O que verifica |
|---|---|
| `audit.mjs` | 2016 sessões: joelho, equipamento, duração, séries, progressão |
| `audit2.mjs` | 5343 passos da sessão guiada, armazenamento, fuso horário |
| `audit3.mjs` | geometria das figuras ao longo da animação: enquadramento, chão, apoios |
| `audit4.mjs` | integridade do registo, ciclos, viragem de ano, objetivo agendado |
| `audit5.mjs` | temporizador com relógio controlado, incluindo ecrã bloqueado |
| `check.mjs` | poses renderizam e os frames têm formas de membro compatíveis |
| `fitframes.mjs` | mede a caixa real de cada figura e propõe o viewBox |
| `figcheck.mjs` | inventário das figuras: poses em falta, isometrias, animações paradas, miniaturas dentro da caixa |
| `anklecheck.mjs` | ângulo do tornozelo em cada pé: apanha pés dobrados contra a canela |
| `audit6.mjs` | um ano de treinos simulado: teto dos halteres, quando as cadeias esgotam |
| `snapshot.mjs` | fotografia do HTML dos 13 ecrãs; `--update` aceita mudanças de propósito |
| `audit7.mjs` | sincronização: quem ganha o conflito, sessão a expirar, tabela em falta |
| `audit8.mjs` | troca de treino entre dias: mantém os dias de treino, não vaza para outra semana |
| `audit9.mjs` | pausas: congelam o ciclo, não contam como falta, não afetam o futuro |
| `audit10.mjs` | grupos musculares: nenhum termo fica sem tradução, nenhum exercício fora dos filtros |
| `audit11.mjs` | treino avulso: só em dia de descanso, nunca em pausa, não mexe no plano nem no ciclo |
| `sw.mjs` | todos os módulos estão na lista do service worker: um módulo de fora parte a app offline |

Guias do material vivem em `js/data/kit.js` e ligam-se aos exercícios pelo mesmo código de equipamento das fichas — a app descobre sozinha que exercícios cada guia serve. Só entra material sobre o qual haja mesmo alguma coisa a dizer.
| `suave.mjs` | percorre a animação de cada pose e apanha saltos: um instante grande com instantes pequenos ao lado |
| `joelhos.mjs` | o joelho e o cotovelo dobram sempre para o mesmo lado, e nunca a mais de 168° |
| `ytcheck.mjs` | confirma que cada vídeo referido ainda existe (pede ao YouTube) |
| `diag.mjs` | `node tools/diag.mjs <id>` imprime as articulações de uma pose |

Os vídeos vêm de `tools/ytfind.mjs` (recolhe candidatos reais na pesquisa do YouTube) e
`tools/ytpick.mjs --write` (escolhe um por exercício, confirma que existe e escreve o `ytId`).
Não se escrevem IDs à mão: um ID inventado dá erro só quando o João carrega no botão.

Regras que evitam os erros mais comuns:
- Ângulos interpolam pelo **arco mais curto**, senão os membros dão a volta por cima do ombro.
- Membros apoiados usam `{ pin }` (cinemática inversa): a mão e o pé ficam fixos.
- Os dois frames de um exercício têm de usar a **mesma forma** de membro (`[ang]`, `{a}` ou `{pin}`).
- O ângulo do pé é `foot:`. Escrito como terceiro valor de `a: [x, y, z]` é **silenciosamente ignorado**, e o pé desaparece: aconteceu em 46 pernas. `anklecheck.mjs` conta os pés desenhados.
- **Plano de vista tem de coincidir com o plano do movimento.** Uma elevação de joelhos de frente não mostra flexão da anca.
- O `foot:` também interpola pelo arco mais curto: se o caminho passar por baixo, a ponta atravessa o chão a meio da animação (foi o caso do cão-cobra).
- `mirror: true` + `wide: true` dão vista de frente (elevações laterais, elevações, pull-aparts).
- **A canela escreve-se pela flexão do joelho** (`coxa - flexão`), nunca por um ângulo solto: um joelho dobra para um lado só, e a interpolação entre duas poses certas pode passar pelo lado errado. O mesmo para o cotovelo. `joelhos.mjs` mede-o em 60 instantes de cada pose.
- **A cinemática inversa não tem solução estável quando o alvo passa em cima da própria articulação.** Se a mão tiver de ir de um lado ao outro do ombro, ou se usa ângulos ou se acrescenta um instante pelo caminho. `suave.mjs` apanha o estalo.
- **Qualquer campo de texto com letra abaixo de 16px faz o Safari do iPhone dar zoom à página sozinho.** A regra global em `css/app.css` põe `font-size: max(16px, 1em)` em todos; não a contrariar com uma regra de classe.

## Automático
`.github/workflows/auditorias.yml` corre tudo isto a cada push para `main`. Às segundas
às 6h corre também `ytcheck.mjs`, porque os vídeos do YouTube desaparecem sem avisar e
é melhor saber por email do que ao carregar no botão no ginásio.

## Fases
1. ✅ App offline: motor, biblioteca, temporizador, registo local.
2. ✅ Figuras animadas e vídeo confirmado nos 90 exercícios (`ytId` + `ytTitle`).
3. ✅ Login por código no email e sincronização Supabase (UE) com RLS por utilizador.

## Ligar a sincronização
Uma vez, no editor de SQL do projeto Supabase, colar o SQL que a app mostra em
Definições → Sincronizar → "Primeira vez". Cria `public.estado` (uma linha por
utilizador) e as três políticas de RLS que impedem qualquer outra pessoa de ler
essa linha. Depois é entrar na app com o email: o código chega por email e não há
password para guardar em lado nenhum.

**O SMTP próprio é obrigatório**, ao contrário do que este README dizia antes. O
serviço de email embutido do Supabase só entrega à equipa do projeto, manda 2 por
hora e — o que decide tudo — **não deixa editar os modelos de email**. Sem editar o
modelo, o email traz um link em vez do código, e o link abre no Safari, que no iPhone
não partilha armazenamento com a app instalada. O login nunca chegaria à app.

Feito a 14 de setembro de 2026 com o Brevo (UE, grátis, sem mexer no DNS). As três
paredes em que se bateu, para não se bater outra vez:
- **Remetente**: tem de ser um email verificado no Brevo (Remetentes → Verificado).
- **Username** do SMTP não é o email: é o «Login» gerado que o Brevo mostra em
  SMTP & API → SMTP, do tipo `b94a3e001@smtp-brevo.com`. Com o email dá `535
  Authentication failed`.
- **IPs autorizados**: o Brevo nasce com «Bloquear IPs não autorizados» **ativado e a
  lista vazia**, o que recusa toda a gente — os servidores do Supabase incluídos — com
  `525 Unauthorized IP address`. Segurança → IPs autorizados → «Desativar para chaves
  SMTP».

Depois do SMTP: Authentication → Emails → «Confirm signup» e «Magic Link» → Source →
acrescentar `{{ .Token }}` (o código de 6 dígitos). E URL Configuration → Site URL →
endereço da app. O erro verdadeiro do SMTP nunca aparece na app nem no toast do
painel: está em Logs → **Auth Logs** (não Edge Logs), no campo `error`. A forma mais
rápida de testar sem gastar tentativas na app é Authentication → Users → Add user →
Send magic link.

O endereço usado fica em `profile.syncEmail`, e portanto viaja dentro do documento
sincronizado, na linha dele.

O documento é o estado inteiro e ganha o lado com `updatedAt` mais recente. Para
uma pessoa em dois aparelhos isto basta; juntar campo a campo seria complexidade a
mais para um problema que não existe.
