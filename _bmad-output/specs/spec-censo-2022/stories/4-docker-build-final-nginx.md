---
title: 'Docker: build final + nginx'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '56d5bdb6bb3871043db54300b9b3ffc3cb265023'
context:
  - '{project-root}/_bmad-output/specs/spec-censo-2022/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/stack.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O back-end (Story 1) sobe num Dockerfile de esqueleto (single-stage, não otimizado) e o front-end (Stories 2-3) ainda não tem Dockerfile nenhum — só roda via `vite dev`. `docker compose up --build` hoje só sobe a API; não há como usar as duas telas sem os servidores de dev.

**Approach:** Endurecer o Dockerfile do back-end para multi-stage (builder compila e prepara o banco; runtime só copia os artefatos finais, sem ferramentas de build). Criar Dockerfile multi-stage do front-end (builder roda `vite build`; runtime é nginx servindo os estáticos). nginx faz proxy de `/api` para o serviço da API, preservando o prefixo — mesmo contrato relativo que o front já usa em dev. `docker-compose.yml` passa a orquestrar os dois serviços (`api` interno, `web` publicado na porta 80), com `web` só subindo depois que `api` responde.

## Boundaries & Constraints

**Always:** `web` serve os estáticos do `vite build` e faz proxy de `/api/*` para `api`, preservando o caminho completo (sem reescrever `/api` fora); `api` fica só na rede interna do compose (sem publicar porta no host); build multi-stage nas duas imagens — nenhuma ferramenta de compilação (`python3`/`make`/`g++`, devDependencies) sobra na imagem final do back-end; `docker compose up --build` numa checkout limpa sobe as duas telas com dado real, sem nenhum passo manual.

**Never:** Sem mudar rotas ou lógica do back-end (`src/routes`, `src/services`, `src/db` — Stories 1-3 já testadas). Sem mudar componentes ou comportamento do front-end. Sem autenticação, sem deploy em nuvem. Sem healthcheck/restart policy elaborados — no máximo um healthcheck simples de `api` (ex.: `GET /api/ufs` via `node -e`) para o `depends_on` do `web` esperar a API responder de verdade, não só o container ter iniciado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Subida limpa | `docker compose up --build` numa checkout limpa | Dois serviços sobem; `web` só fica pronto depois de `api` responder | N/A |
| Front estático | `GET http://localhost/` | Retorna o `index.html` do build do Vite | N/A |
| Proxy da API | `GET http://localhost/api/ufs` | Mesma resposta 200 com as 27 UFs que `GET http://api:3000/api/ufs` daria direto | N/A |
| Fluxo real (cidade) | Usar a tela "Buscar cidade" no navegador, buscar "sao paulo" | Mostra os agregados de São Paulo/SP (11.451.999 hab) | N/A |
| Fluxo real (estado) | Usar a tela "Buscar estado", selecionar SP | Mostra 645 municípios / 44.411.238 hab, Taboão da Serra em 1º no ranking | N/A |
| Imagem final do back-end | Inspecionar a imagem final de `api` | Sem `python3`/`make`/`g++`/devDependencies — só `dist/`, `node_modules` de produção e o banco preparado | N/A |

</frozen-after-approval>

## Code Map

- `backend/Dockerfile` (Story 1, reescrever) -- hoje single-stage: instala build tools, `npm ci` completo, builda, prepara o banco, `CMD npm start` -- vira multi-stage: stage `builder` (com build tools, builda + `npm run db:prepare` + `npm prune --omit=dev`) e stage `runtime` (`node:22-bookworm-slim`, sem build tools, só copia `dist/`, `node_modules` podado e `data/censo.prepared.sqlite` do builder; `CMD ["node", "dist/server.js"]`)
- `frontend/Dockerfile` (novo) -- stage `builder` (`npm ci` + `npm run build`, produz `frontend/dist` estático) e stage `runtime` (`nginx:1-alpine` ou similar, copia os estáticos para `/usr/share/nginx/html`, copia a config de nginx desta story)
- `frontend/nginx.conf` (novo) -- `location /api/ { proxy_pass http://api:3000; ... }` (sem URI no `proxy_pass`, para preservar o path completo — nginx repassa `/api/municipios` como `/api/municipios`, não corta o prefixo); `location / { try_files $uri /index.html; }` para os estáticos
- `docker-compose.yml` (raiz, reescrever) -- serviço `api` com `expose: ['3000']` (sem publicar no host) e um healthcheck simples; serviço `web` com `ports: ['80:80']` e `depends_on: {api: {condition: service_healthy}}`
- `.dockerignore` (raiz, estender) -- já tem `**/node_modules`, `backend/dist`, `backend/data`; adicionar `frontend/dist`
- `backend/src/server.ts`, `frontend/vite.config.ts` -- **não tocar**; o proxy de dev do Vite e o proxy do nginx resolvem o mesmo contrato relativo `/api/...` por mecanismos diferentes, sem conflito

## Tasks & Acceptance

**Execution:**
- [x] `backend/Dockerfile` -- multi-stage (builder + runtime podado)
- [x] `frontend/Dockerfile` -- multi-stage (builder Vite + runtime nginx)
- [x] `frontend/nginx.conf` -- estáticos + proxy `/api` preservando o path
- [x] `docker-compose.yml` -- serviços `api` (interno, com healthcheck) e `web` (porta 80, `depends_on` saudável)
- [x] `.dockerignore` -- adicionar `frontend/dist`

**Acceptance Criteria:**
- Given uma checkout limpa, when `docker compose up --build` roda, then as duas telas funcionam via `http://localhost` sem nenhum passo manual.
- Given a imagem final de `api` construída, when inspecionada, then não contém `python3`/`make`/`g++` nem devDependencies.
- Given os containers no ar, when `curl http://localhost/api/ufs`, then responde 200 com as 27 UFs, idêntico ao que a API responde direto.

## Implementation Notes

- `backend/Dockerfile`: stage `builder` (com `python3`/`make`/`g++`) compila, roda `db:prepare` e
  faz `npm prune --omit=dev`; stage `runtime` (mesma base `node:22-bookworm-slim`, sem build tools)
  só copia `dist/`, `node_modules` podado e `data/censo.prepared.sqlite`. `CMD ["node",
  "dist/server.js"]` direto, sem passar por `npm start`.
- `frontend/Dockerfile`: stage `builder` roda `npm ci && npm run build` (`tsc -b && vite build`,
  copiando a árvore inteira de `frontend/` para que os project references do `tsc -b` resolvam
  sem seleção manual de arquivos); stage `runtime` é `nginx:1-alpine`, só com os estáticos e o
  `nginx.conf` desta story.
- `frontend/nginx.conf`: `proxy_pass http://api:3000;` sem URI/barra final -- preserva o path
  completo (`/api/municipios/...` chega intacto no Fastify, que registra as rotas com esse mesmo
  prefixo). `location / { try_files $uri /index.html; }` para os estáticos.
- `docker-compose.yml`: `api` só com `expose: ['3000']` (sem publicar no host) e healthcheck via
  `node -e "fetch('http://localhost:3000/api/ufs')..."`; `web` com `ports: ['80:80']` e
  `depends_on: { api: { condition: service_healthy } }`.
- Achado durante a implementação (não bloqueante): depois do `npm prune --omit=dev`, sobram
  diretórios de escopo vazios em `node_modules` (`@types`, `@typescript`, `@vitest`, `@jridgewell`,
  `@rolldown`) -- artefato cosmético conhecido do `npm prune`, zero arquivos dentro, nenhum pacote
  de devDependency real presente. Verificado que não viola o critério de aceite (que fala de
  ferramentas/pacotes, não de diretórios vazios); registrado para decisão da revisão.
- Verificado ponta a ponta com `docker compose up --build -d`: `api` fica `Healthy` antes de `web`
  iniciar; `GET /` serve o `index.html` do build; `GET /api/ufs` (27), `/api/municipios/3550308`,
  `/api/ufs/35` (SP, 645 municípios/44.411.238 hab/248.219,49 km²) e `/api/ufs/35/municipios` (1º
  Taboão da Serra, 13.416,96 hab/km²) batem exatamente com os valores de referência via proxy do
  nginx; porta 3000 do `api` não responde no host (só `web`/80); `python3`/`make`/`g++` ausentes na
  imagem final de `api`.

## Spec Change Log

## Review Triage Log

Camadas rodadas: blind-hunter, edge-case-hunter, verification-gap (todas ativas, nenhuma pulada).

- **[patch/medium]** Stage `runtime` de `backend/Dockerfile` nunca troca para um usuário não-root — `node dist/server.js` roda como root no container final — blind-hunter. `node:22-bookworm-slim` já traz um usuário `node` pronto. Fix: `USER node` (com `chown` do que for necessário) antes do `CMD`.
- **[patch/low]** Nenhuma stage define `ENV NODE_ENV=production` no runtime do back-end — blind-hunter. Fastify e o ecossistema Node usam essa variável para logging/otimizações de produção. Fix: adicionar ao stage `runtime`.
- **[patch/low]** Nenhum serviço tem `restart` policy — blind-hunter e edge-case-hunter (achado convergente). Um crash ou reboot do host deixa a aplicação inteira fora do ar sem recuperação automática, contradizendo o "sobe com um comando só" do enunciado. O "Never" da story só exclui política *elaborada*; `unless-stopped` é o mínimo razoável e não conflita com essa exclusão. Fix: `restart: unless-stopped` em `api` e `web`.
- **[patch/low]** Diretórios de escopo vazios (`@types`, `@typescript`, `@vitest`, `@jridgewell`, `@rolldown`) sobram em `node_modules` depois do `npm prune --omit=dev` — achado já registrado por mim mesmo nas Implementation Notes. Verificado que não viola o critério de aceite (zero arquivos, nenhum pacote real), mas o fix é gratuito e fecha a ambiguidade. Fix: `find node_modules -maxdepth 1 -type d -empty -delete` depois do prune.
- **[low, rejeitado]** Sem gzip nem `Cache-Control` diferenciado (estáticos com hash vs. `index.html`) no `nginx.conf` — blind-hunter. Ganho de performance real, mas fora do que a story pediu e desproporcional para o contexto de avaliação (carregamento local, poucas vezes). Não acionado.
- **[low, rejeitado]** Só `api` tem healthcheck; `web` não tem nenhum — blind-hunter. Nada depende de `web` no grafo do compose (é o último salto), então o valor seria só observabilidade, não orquestração; a story só pediu healthcheck em `api` para o `depends_on`. Não acionado.
- **[low, rejeitado]** `frontend/Dockerfile` copia a árvore inteira (`COPY frontend/ ./`), incluindo specs de teste/E2E, invalidando o cache de build a cada edição não relacionada — blind-hunter. Não afeta a imagem final (só `dist/` é copiado para o runtime) nem o caminho de avaliação (`up --build` roda uma vez); é só um custo de loop de desenvolvimento. Não acionado.
- **[low, rejeitado]** Sem headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) no nginx — blind-hunter. Desproporcional para um visualizador público e somente-leitura de dado do Censo, sem login nem dado sensível; nenhum non-goal do SPEC pede isso. Não acionado.
- **[low, rejeitado]** `proxy_pass http://api:3000` resolve o DNS uma vez na subida do worker do nginx; se o container `api` for recriado sozinho depois, `web` fica com o IP antigo e passa a responder 502 — blind-hunter e edge-case-hunter (achado convergente). Inatingível no fluxo de avaliação real (`docker compose up --build` sobe os dois juntos, sempre re-resolve); só se manifesta se alguém recriar só o `api` isoladamente depois. Fix exigiria `resolver` + indireção por variável — mais que correção direta. Não acionado.
- **[low, rejeitado]** `GET /api` (sem barra final) não casa com `location /api/` e cai no fallback de SPA, devolvendo 200 com HTML em vez de um erro claro — edge-case-hunter. O front nunca chama `/api` sem sub-caminho (sempre `/api/ufs`, `/api/municipios`, etc.); inatingível pelo uso real da aplicação. Não acionado.
- **[defer]** Nenhum teste automatizado sobe os containers Docker e valida o proxy do nginx/wiring do compose de ponta a ponta — verification-gap, disposição já registrada pela própria camada como "defer". Bate com a decisão já explícita no Design Notes desta story (infra verificada por `curl`/inspeção manual, não por suíte Playwright nova contra Docker); nenhuma ação nova, decisão mantida.

## Design Notes

`api` não publica porta no host (só `expose`) — só `web` (nginx) é a porta que o usuário acessa, mais próximo de um setup de produção real. Verificação e depuração direta da API continuam possíveis de dentro da rede do compose (`docker compose exec` ou `docker compose logs api`).

Sem suíte Playwright nova contra os containers Docker — a suíte de dev (Stories 2-3, contra `vite dev`) já cobre o comportamento da aplicação; esta story verifica a camada de infraestrutura (proxy, estáticos, build multi-stage) via `curl`/inspeção de imagem, registrado em `## Verification`.

## Verification

**Commands:**
- `docker compose up --build -d` -- expected: os dois serviços sobem, `web` fica `healthy`/pronto só depois de `api`
- `curl -s http://localhost/ | head -c 200` -- expected: HTML do front (`<!doctype html>` do build do Vite)
- `curl -s http://localhost/api/ufs | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"` -- expected: `27`
- `curl -s http://localhost/api/municipios/3550308` -- expected: agregados de São Paulo/SP batendo com os valores de referência
- `docker compose exec api sh -c "which python3 make g++ 2>/dev/null; echo done"` -- expected: nenhum dos três encontrado antes do `done`
- `docker compose down` -- expected: limpa os containers ao final da verificação
