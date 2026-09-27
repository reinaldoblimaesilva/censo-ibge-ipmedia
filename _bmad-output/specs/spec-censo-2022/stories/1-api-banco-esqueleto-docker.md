---
title: 'API + banco + esqueleto Docker'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8c79e81dea971e7121422b44679361575d2a4a0f'
context:
  - '{project-root}/_bmad-output/specs/spec-censo-2022/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/stack.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Não existe back-end nem forma de subir a aplicação; hoje só há o `censo.sqlite` cru na raiz.

**Approach:** Criar o serviço `backend/` (Node.js + TypeScript + Fastify + better-sqlite3, camadas `routes/services/db`) com um script de preparo de banco rodado no build da imagem, as rotas HTTP de município e UF que alimentarão as duas telas, testes de back-end contra os valores de referência do dado, e um Dockerfile + `docker-compose.yml` mínimos para que `docker compose up --build` já suba a API funcionando de ponta a ponta.

## Boundaries & Constraints

**Always:** Banco original `censo.sqlite` na raiz nunca é escrito; toda query é parametrizada; toda rota valida entrada via schema do Fastify; densidade = `SUM(populacao)/SUM(area_km2)`; `cd_mun='.'` fica fora de busca/ranking mas sua área conta nos totais de UF; população vem de `setor.populacao`; sexo mostra "não informado"; `situacao` nula vira "Não classificado".

**Never:** Sem front-end nesta story (Stories 2/3). Sem multi-stage/nginx no Dockerfile (Story 4 — este aqui só precisa funcionar). Sem ORM. Sem autenticação nem escrita no banco.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Busca válida | `GET /api/municipios?q=sao paulo` | Lista com "São Paulo — SP" entre os resultados, `cd_mun` como chave | N/A |
| Busca curta | `q` com 1 caractere | 400, mensagem de validação | Schema Fastify rejeita antes do service |
| Busca de homônimo | `GET /api/municipios?q=sao domingos` | 5 resultados, um por UF distinta | N/A |
| Detalhe de município | `GET /api/municipios/3550308` | Agregados batendo com data-exploration.md (11.451.999 hab, 27.301 setores, 1.521,202 km², densidade 7.528,26) | N/A |
| Município inexistente/fantasma | `GET /api/municipios/{cd_mun invalido}` ou `.` | 404 | Sem vazar erro de SQL |
| UF com poucos municípios | `GET /api/ufs/14/municipios` (RR) | 15 resultados, uma página | N/A |
| UF com muitos municípios | `GET /api/ufs/31/municipios?page=1` (MG, 853) | Página parcial + metadado de total/páginas | N/A |
| UF com lagoas sem nome | `GET /api/ufs/43` (RS) | população 10.882.965, área 281.707,15 km² (inclui as lagoas) | N/A |
| UF inexistente | `GET /api/ufs/99` | 404 | N/A |

</frozen-after-approval>

## Code Map

Greenfield — não há back-end ainda. Estrutura nova:

- `backend/package.json`, `backend/tsconfig.json` -- projeto Node+TS novo (npm, `fastify`, `better-sqlite3`, `typescript`, `tsx`, `vitest`)
- `backend/src/db/prepare.ts` -- script de build: copia `../censo.sqlite` (raiz) para `CENSO_PREPARED_DB` (default `backend/data/censo.prepared.sqlite`, fora do versionamento), cria índice `setor(cd_mun)`, tabelas agregadas `municipio_resumo` e `uf_resumo`, mapa `cd_uf → sigla`, coluna de nome normalizado (minúsculo, sem acento)
- `backend/src/db/connection.ts` -- abre `CENSO_PREPARED_DB` com better-sqlite3 em modo somente leitura (`readonly: true`) para uso em runtime
- `backend/src/services/municipio.service.ts` -- busca por nome normalizado (parametrizada, `cd_mun != '.'`, limite de resultados) e agregados de um município (de `municipio_resumo`)
- `backend/src/services/uf.service.ts` -- lista de UFs, agregados de uma UF (de `uf_resumo`), ranking paginado de municípios por UF (`ORDER BY densidade DESC`, `cd_mun != '.'`)
- `backend/src/routes/municipios.routes.ts` -- `GET /api/municipios` (query `q`, `limit`), `GET /api/municipios/:cdMun`, schemas Fastify
- `backend/src/routes/ufs.routes.ts` -- `GET /api/ufs`, `GET /api/ufs/:cdUf`, `GET /api/ufs/:cdUf/municipios` (query `page`, `pageSize`), schemas Fastify
- `backend/src/app.ts` -- monta a instância Fastify (plugins + rotas) sem dar `listen`, para os testes usarem `app.inject()`
- `backend/src/server.ts` -- importa `app.ts` e chama `.listen()` na porta `PORT` (default 3000)
- `backend/test/services/*.test.ts` -- Vitest rodando `prepare.ts` uma vez (`beforeAll`) contra o `censo.sqlite` real da raiz, depois validando os services contra os valores de referência
- `backend/Dockerfile` -- instala deps, builda TS, roda `db:prepare` no build, `CMD` sobe `server.js`
- `docker-compose.yml` (raiz) -- serviço `api`, `build.context: .`, `build.dockerfile: backend/Dockerfile`, porta exposta

## Tasks & Acceptance

**Execution:**
- [x] `backend/package.json` -- criar projeto (scripts `dev`, `build`, `start`, `db:prepare`, `test`) -- base do serviço
- [x] `backend/src/db/prepare.ts` -- índice + agregados + sigla + nome normalizado -- resolve achado 1/2/3/7 de data-exploration.md
- [x] `backend/src/db/connection.ts` -- conexão somente leitura -- garante que o arquivo versionado nunca é escrito
- [x] `backend/src/services/municipio.service.ts` + `uf.service.ts` -- regras de agregação -- testáveis sem Fastify (ver architecture.md)
- [x] `backend/src/routes/municipios.routes.ts` + `ufs.routes.ts` -- schemas de validação + status HTTP
- [x] `backend/src/app.ts` + `server.ts` -- monta e sobe a API
- [x] `backend/test/services/*.test.ts` -- cobre os cálculos contra os valores de referência de data-exploration.md
- [x] `backend/Dockerfile` -- build-time prep + start
- [x] `docker-compose.yml` -- sobe o serviço `api`

**Acceptance Criteria:**
- Given o `censo.sqlite` da raiz, when `npm run db:prepare` roda, then `censo.prepared.sqlite` tem os agregados e o `censo.sqlite` original permanece byte-a-byte inalterado.
- Given a API no ar, when `GET /api/municipios/3550308`, then os agregados batem com os valores de referência de data-exploration.md.
- Given `docker compose up --build` numa checkout limpo, when a API sobe, then `GET /api/ufs` responde 200 sem nenhum passo manual.

## Implementation Notes

- Stack instalada na data da implementação (2026-09): `fastify@5.12.5`, `better-sqlite3@13.0.3`,
  `typescript@7.0.2`, `vitest@5.0.2`, `tsx@4.23.15`. Versões mais novas que as usuais no momento
  em que a stack.md/architecture.md foram escritas, mas compatíveis com o desenho da story.
- `GET /api/municipios`: usa `LIKE '%termo%'` sobre `nm_normalizado`, com `ORDER BY` priorizando
  correspondência exata do nome antes de correspondências parciais, e **limite padrão 5**. Essa
  combinação é o que faz `q=sao domingos` devolver exatamente os 5 homônimos exatos (um por UF,
  sem as variantes "São Domingos do/da ...") e `q=sao paulo` devolver São Paulo/SP entre outras
  cidades cujo nome contém o termo -- ambos batendo com o I/O matrix. Um `limit` maior explícito
  (até 50) inclui as variantes parciais também (coberto em teste).
- `uf_resumo` agrega `setor` via `municipio` sem excluir `cd_mun='.'`, então a área/população das
  lagoas do RS entram nos totais de UF/Brasil; `municipio_resumo` inclui a linha `.` também (para
  simplicidade de schema), mas os services (`buscarMunicipioPorCodigo`, busca e ranking) excluem
  esse `cd_mun` explicitamente, então ela nunca aparece em resultado de API.
- Nota de teste: `GET /api/municipios/.` funciona corretamente no servidor real (verificado com
  request HTTP cru via socket TCP, e o router `find-my-way` do Fastify não normaliza esse
  segmento) mas não é reproduzível via `app.inject()` do Vitest, porque a lib `light-my-request`
  constrói a URL com `new URL()`, que colapsa o dot-segment "." antes do roteamento (comportamento
  do WHATWG URL Standard, não um bug da aplicação). Esse teste específico ficou `it.skip` com o
  motivo documentado em `test/app.test.ts`; a regra de negócio em si (`cd_mun='.' -> null -> 404`)
  está coberta em `test/services/municipio.service.test.ts`.
- Dockerfile usa `node:22-bookworm-slim` (glibc) em vez de Alpine, com `python3 make g++`
  instalados para o `node-gyp rebuild` do `better-sqlite3` -- evita depender de prebuilds
  compatíveis com musl.
- Verificado ponta a ponta com `docker compose up --build`: `/api/ufs` (27), `/api/municipios/3550308`,
  `/api/ufs/35` (SP), `/api/ufs/43` (RS), `/api/ufs/14/municipios` (RR) e `/api/ufs/31/municipios`
  (MG) batem exatamente com os valores de `data-exploration.md`.
- Revisão (orquestrador): o `it.skip` de `GET /api/municipios/.` violava a auditoria de matriz
  (teste que não roda conta como cobertura ausente). Substituído por um teste que sobe o servidor
  real numa porta efêmera (`app.listen({ port: 0 })`) e faz a requisição com `http.request({ path })`
  do Node — que não passa por `new URL()` e preserva o segmento "." literal — em vez de pular o
  cenário. Suíte agora fecha em 23/23, sem skips.

## Spec Change Log

## Review Triage Log

Camadas rodadas: blind-hunter, edge-case-hunter, verification-gap (todas ativas, nenhuma pulada).

- **[patch/low]** `normalizarNome` (`db/prepare.ts`) e `normalizar` (`services/municipio.service.ts`) são funções de remoção de acento byte-a-byte idênticas, duplicadas em dois arquivos — blind-hunter e verification-gap (achado convergente). Real: se uma cópia mudar sem a outra, a normalização de build-time para de bater com a de query-time e a busca passa a não encontrar nomes que deveria. Fix: extrair para `backend/src/util/normalizar-nome.ts` e importar dos dois lugares.
- **[patch/medium]** `prepare.ts` copia `censo.sqlite` para `CENSO_PREPARED_DB` sem checar se os dois caminhos resolvidos são diferentes — edge-case-hunter (claim, confiança média). Se as env vars fossem configuradas iguais, `copyFileSync` sobrescreveria o próprio `censo.sqlite` da raiz, violando o "Always" da story. Improvável na config atual (compose não sobrescreve as env vars), mas a consequência é catastrófica (perde o dataset de referência) e o guard custa uma linha. Fix: `throw` se `path.resolve(source) === path.resolve(prepared)`.
- **[patch/low]** Sem `.dockerignore` na raiz — blind-hunter. `docker-compose.yml` usa `context: .`, então todo `docker compose up --build` envia `.git`, `_bmad-output/`, `docs/` etc. ao daemon Docker. Não vaza nada pro build (só o `COPY` explícito entra na imagem), mas deixa o build mais lento/pesado à toa. Fix: `.dockerignore` na raiz.
- **[patch/low]** Comentário `// eslint-disable-next-line no-console` em `prepare.ts` referenciando uma ferramenta (ESLint) que não está instalada no projeto — blind-hunter. Cosmético, mas confunde quem ler o arquivo depois. Fix: remover o comentário morto.
- **[patch/low]** `@types/node` fixado em `^26.6.3` no `package.json`, mas o Dockerfile roda `node:22-bookworm-slim` — blind-hunter. `tsc --noEmit` passou limpo hoje (nada do código usa API exclusiva de v24+), mas é um descompasso barato de fechar. Fix: fixar `@types/node` em `^22`.
- **[patch/low]** `GET /api/ufs` é a única rota sem `{ schema }`, embora a story diga "toda rota valida entrada via schema do Fastify" — edge-case-hunter (claim, confiança alta). A rota não recebe nenhum parâmetro, então não há o que validar hoje; ainda assim, um schema vazio explícito documenta a intenção e fecha a inconsistência literal com o "Always". Fix: adicionar `{ schema: {} }`.
- **[patch/low]** `buscarMunicipios`: `q` só-espaço (ex. `"  "`) passa no `minLength: 2` do schema, normaliza para string vazia e vira `LIKE '%%'` — casa com qualquer linha, devolvendo `limite` municípios arbitrários em vez de nada — edge-case-hunter. Reproduzível por qualquer usuário digitando espaços no autocomplete; consequência é branda (resultado inútil, não corrompe nada) mas real e barata de fechar. Fix: retornar `[]` cedo quando o termo normalizado for vazio.
- **[patch/medium]** Nenhum teste força o branch genérico (não-validação) do `setErrorHandler` de `app.ts` — verification-gap (achado de gap, pré-verificado). O comentário do próprio código promete "sem vazar detalhes internos" nesse branch, mas nenhum teste hoje o alcança; uma regressão que vazasse SQL/stack no 500 passaria despercebida. Fix: teste que força uma exceção real (DB indisponível) e verifica 500 com a mensagem genérica, sem termos de SQL/stack no corpo.
- **[patch/low]** Escape de curingas de `LIKE` (`%`/`_`) na busca de município não tem nenhum teste com esses caracteres no termo — verification-gap (achado de gap, disposição registrada como defer pela própria camada, mas o fix é tão barato quanto o gap é real; decido manter como patch em vez de deferir). Fix: teste que confirma que `_`/`%` no termo são tratados como caracteres literais.
- **[low, rejeitado]** `SIGLA_POR_UF[cd_uf] ?? '??'` grava `'??'` silenciosamente para um `cd_uf` fora do mapa estático — blind-hunter e edge-case-hunter (achado convergente). Verificado: as 27 linhas de `uf` no `censo.sqlite` batem exatamente com as 27 chaves do mapa; inatingível com este dataset versionado e estático. Fix seria adicionar um guard/throw — mais que uma correção direta. Ambas as condições de rejeição de `low` se aplicam (improvável de ser encontrado + fix adiciona branch); não acionado.
- **[low, rejeitado]** `fecharDb()` exportado mas nunca chamado; sem handler de SIGTERM fechando a conexão — blind-hunter. Para uma API somente-leitura de curta duração em container, o processo sendo derrubado não perde dado nem trava recurso; sem consequência prática demonstrável. Fix exigiria adicionar handler de sinal — mais que correção direta. Rejeitado pela mesma regra.
- **[false]** Contexto do frontmatter da story não lista `docs/data-exploration.md`, só `SPEC.md`/`stack.md`/`architecture.md` — blind-hunter. Verificado claim-a-claim: todo achado do dado citado no Code Map (índice, `cd_mun='.'`, sigla, sexo, `situacao`, homônimos, listas longas) já está duplicado em `SPEC.md`/`stack.md` como constraint, e todo valor numérico usado nos testes já está inline no próprio bloco frozen da story ou em `SPEC.md`. A implementação terminou correta sem nunca abrir `data-exploration.md`. Reivindicação refutada — nada que a story dependa está faltando no `context:`.
- **[false]** `prepare.ts` copia o `censo.sqlite` de origem antes de checar seu `journal_mode` — blind-hunter (WAL não-checkpointado seria perdido na cópia crua). Verificado no arquivo real: `PRAGMA journal_mode` retorna `delete`, sem `-wal`/`-shm` ao lado dele no repositório. Um arquivo versionado no git, estático, nunca esteve em modo WAL. Inatingível para este dataset.
- **[false]** `listarMunicipiosPorUf` devolve `200` com `items: []` para uma página além do total, sem validar contra `totalPages` — blind-hunter. Verificado: `total`/`totalPages` continuam corretos na resposta, permitindo o cliente detectar a página fora do intervalo; página vazia com `200` é o comportamento padrão e correto de paginação REST, não um defeito. Fora do I/O matrix porque não é um caso de erro.
- **[false]** Registro do `review_loop_iteration`/Review Triage Log vazio apesar da nota de implementação descrever uma correção feita durante a auditoria de matriz do step-03 — blind-hunter. Artefato temporal do próprio processo do workflow: o Review Triage Log só existe a partir do step-04 (este passo), que é exatamente quando está sendo populado agora. Nenhuma inconsistência real.
- **[false]** `situacao` fora de `{Urbana, Rural, NULL}` contaria em `setores`/população mas ficaria fora de urbanos+rurais+não classificados — edge-case-hunter. Verificado contra `data-exploration.md` achado 5: as 468.099 linhas de `setor` têm só essas três categorias (`GROUP BY situacao` já rodado sobre a tabela inteira). Inatingível para este dataset estático e versionado.
- **[false]** `naoInformado = populacao - homens - mulheres` poderia ficar negativo se `homens+mulheres > populacao` — edge-case-hunter. Verificado: `demografia.cd_setor` é PK (join 1:1, sem fan-out), e o achado 4 confirma que, quando presente, `homens+mulheres = moradores = populacao` no nível de setor; setores sem linha em `demografia` só subtraem (via `COALESCE` a 0), nunca somam a mais. Soma por município nunca ultrapassa a população.

**Deferidos** (não são problema desta story, registrados em `deferred-work.md`): `docker-compose.yml` sem healthcheck/restart/environment (enrijecimento pertence à Story 4, que a própria story já exclui deste escopo); falta de nota sobre ordem de `db:prepare` antes de rodar localmente sem Docker (não afeta `docker compose up --build`; Story 5 já é dona do README).

## Design Notes

Separar `app.ts` (Fastify sem `listen`) de `server.ts` é o padrão que permite os testes usarem `app.inject()` direto, sem abrir porta de rede.

`prepare.ts` recebe `CENSO_SOURCE_DB` (default `../censo.sqlite`) e `CENSO_PREPARED_DB` (default `./data/censo.prepared.sqlite`) por env var, para o mesmo script rodar igual local, em teste e no build da imagem Docker.

## Verification

**Commands:**
- `cd backend && npm run db:prepare` -- expected: gera `data/censo.prepared.sqlite` sem erro, `censo.sqlite` da raiz inalterado (`git status` limpo)
- `cd backend && npm test` -- expected: todos os testes passam, incluindo os que conferem os valores de referência de São Paulo/SP, UF 35, UF 43
- `docker compose up --build` -- expected: serviço `api` sobe; `curl localhost:3000/api/ufs` responde 200 com 27 UFs
