---
title: 'README'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '067f235cd020e2353b15425f9ef9c37dd9b9c3ce'
context:
  - '{project-root}/_bmad-output/specs/spec-censo-2022/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/stack.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/architecture.md'
  - '{project-root}/docs/data-exploration.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Não existe README na raiz. Quem clona o repositório não tem instruções de instalação/execução, não vê as decisões técnicas explicadas, nem sabe onde consultar os artefatos do processo BMAD.

**Approach:** Escrever `README.md` na raiz com: instalação/execução em um único comando (`docker compose up --build`, porta 80, sem passo manual — Story 4), estrutura do projeto (`backend/`, `frontend/`, `censo.sqlite`, `docker-compose.yml`), como rodar os testes de cada lado, decisões técnicas explícitas referenciando diretamente `architecture.md` (por que não Clean Architecture/DDD completo) e `docs/data-exploration.md` (achados do dado que motivaram as constraints), uma seção "o que faria diferente com mais tempo" (evolução do `architecture.md`: Clean Architecture + DDD tático, cache, réplica de leitura/CQRS, FTS5, paginação por cursor), e um ponteiro para `_bmad-output/specs/spec-censo-2022/` (SPEC.md, stack.md, architecture.md, stories.yaml, memlogs, specs de cada story) para quem quiser ver como o framework de spec driven development foi conduzido. Sem mudar código de aplicação.

## Implementation Notes

Escrito diretamente nesta sessão (rota `oneshot`), sem subagente de implementação separado.
Referencia `architecture.md` e `stack.md` (decisões técnicas, evolução futura) e
`docs/data-exploration.md` (constraints vindas do dado) por link, em vez de gerar texto genérico
novo, conforme pedido. Validado com um clone limpo real (`git clone` local para `/tmp`, não só
leitura do arquivo): `docker compose up --build` funcionou de ponta a ponta (front estático, proxy
`/api`, valores de referência batendo) e a receita de teste do back-end (`npm install`,
`npm run db:prepare`, `npm test`) rodou verbatim com 27/27 testes passando. A receita completa do
front-end (`npm install`, `npm test` — 28/28 —, `npx playwright install chromium`,
`npx playwright test` — 9/9) também foi validada num segundo clone limpo (`/tmp`), verbatim como
documentado no README.

## Review Triage Log

**Desvio deliberado do workflow padrão**: revisão "quick" nesta story — só blind-hunter, sem
edge-case-hunter/verification-gap, para economizar cota de sessão (pedido explícito do usuário).
A rota `oneshot` já usa só blind-hunter por padrão, então nenhum ajuste extra foi necessário.

- **[patch]** Árvore de arquivos do README não listava `docs/` nem
  `teste-tecnico-full-stack-ipmedia.md`, embora o próprio README linke para os dois logo depois —
  blind-hunter. Fix: adicionados à árvore, mais uma nota de pré-requisito (Docker vs. Node 22.x).
- **[patch]** Receita de teste do front-end quebraria num clone genuinamente limpo se alguém
  pulasse a seção do back-end: `playwright.config.ts` sobe o back-end de dev via `webServer`
  (`cwd: '../backend'`), que exige `node_modules` do back-end já instalado — blind-hunter,
  verificado contra o arquivo real. Fix: nota explícita logo após a receita do front-end.
- **[patch]** Faltava `npx playwright install chromium` antes de `npx playwright test` — gotcha
  real de primeira execução (já registrado nas Implementation Notes da Story 2) — blind-hunter.
  Fix: adicionado à receita.
- **[patch]** API sem nenhuma documentação de endpoints/params — blind-hunter. Fix: seção `## API`
  nova, com as 5 rotas e um exemplo de `curl`.
- **[patch]** Sem menção à versão do Node necessária fora do Docker (`better-sqlite3` compila
  binário nativo sensível à versão) — blind-hunter. Fix: nota de pré-requisito.
- **[patch]** `teste-tecnico-full-stack-ipmedia.md` (enunciado original) nunca era mencionado —
  blind-hunter. Fix: link no parágrafo de abertura.
- **[patch]** Seção de testes do back-end não explicava o que `db:prepare` faz nem retomava a
  garantia de que o `censo.sqlite` original nunca é escrito — blind-hunter. Fix: comentário
  ampliado no bloco de comandos.
- **[low, rejeitado]** `censo.sqlite` versionado como binário de ~35MB sem Git LFS, sem nota
  explicando isso como escolha deliberada — blind-hunter. Rejeitado: é exigência explícita do
  próprio enunciado do teste ("deve ser versionado no repositório"), não uma decisão nossa a
  justificar; uma nota defensiva aqui não agregaria valor real ao leitor.
</frozen-after-approval>
