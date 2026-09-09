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

## Auditorias
Correr depois de mexer no motor, nas poses ou no registo:
```bash
node tools/audit.mjs && node tools/audit2.mjs && node tools/audit3.mjs && node tools/audit4.mjs && node tools/audit5.mjs && node tools/audit6.mjs && node tools/audit7.mjs && node tools/check.mjs && node tools/anklecheck.mjs && node tools/snapshot.mjs
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
| `figcheck.mjs` | inventário das figuras: poses em falta, isometrias, animações paradas |
| `anklecheck.mjs` | ângulo do tornozelo em cada pé: apanha pés dobrados contra a canela |
| `audit6.mjs` | um ano de treinos simulado: teto dos halteres, quando as cadeias esgotam |
| `snapshot.mjs` | fotografia do HTML dos 13 ecrãs; `--update` aceita mudanças de propósito |
| `audit7.mjs` | sincronização: quem ganha o conflito, sessão a expirar, tabela em falta |
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

O código do email é enviado pelo serviço de email do próprio projeto Supabase. Esse
serviço **só entrega a endereços que pertencem à equipa do projeto** e manda 2 por
hora — por isso o login tem de usar o email da conta Supabase. Para outros endereços
seria preciso configurar SMTP próprio no projeto, o que para um utilizador não
compensa. O endereço também fica guardado em `profile.syncEmail`, e portanto viaja
dentro do documento sincronizado, na linha dele.

O documento é o estado inteiro e ganha o lado com `updatedAt` mais recente. Para
uma pessoa em dois aparelhos isto basta; juntar campo a campo seria complexidade a
mais para um problema que não existe.
