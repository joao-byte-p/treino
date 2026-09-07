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

## Fases
1. ✅ App offline: motor, biblioteca em texto, temporizador, registo local.
2. Ilustrações passo a passo (`img/<id>.png`) e IDs de vídeo YouTube verificados (`ytId`).
3. Login e sincronização Supabase (UE) com RLS por utilizador.
