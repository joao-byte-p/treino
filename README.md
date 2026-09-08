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
- `tools/solve.js` — resolve a geometria de apoios fixos (`node tools/solve.js`).
- `tools/check.mjs` — valida todas as poses (`node tools/check.mjs`).

## Auditorias
Correr depois de mexer no motor, nas poses ou no registo:
```bash
node tools/audit.mjs && node tools/audit2.mjs && node tools/audit3.mjs && node tools/audit4.mjs && node tools/audit5.mjs && node tools/check.mjs
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
| `diag.mjs` | `node tools/diag.mjs <id>` imprime as articulações de uma pose |

Regras que evitam os erros mais comuns:
- Ângulos interpolam pelo **arco mais curto**, senão os membros dão a volta por cima do ombro.
- Membros apoiados usam `{ pin }` (cinemática inversa): a mão e o pé ficam fixos.
- Os dois frames de um exercício têm de usar a **mesma forma** de membro (`[ang]`, `{a}` ou `{pin}`).
- `mirror: true` + `wide: true` dão vista de frente (elevações laterais, elevações, pull-aparts).

## Fases
1. ✅ App offline: motor, biblioteca, temporizador, registo local.
2. ✅ Figuras animadas nos 83 exercícios. Falta fixar IDs de vídeo YouTube verificados (`ytId`).
3. Login e sincronização Supabase (UE) com RLS por utilizador.
