# Censo 2022 — Consulta por Município e UF

Aplicação web para consultar dados do Censo Demográfico 2022 (IBGE) por município e por
unidade federativa, a partir do `censo.sqlite` versionado na raiz deste repositório. Resposta ao
teste técnico em [`teste-tecnico-full-stack-ipmedia.md`](teste-tecnico-full-stack-ipmedia.md).

## Como rodar

Único requisito: Docker (com o plugin `docker compose`).

```bash
docker compose up --build
```

Abra **http://localhost** — as duas telas ("Buscar cidade" e "Buscar estado") já funcionam com
dado real, sem nenhum passo manual. O banco é preparado (índices, agregados) no build da imagem
do back-end; o front é servido por nginx, que faz proxy de `/api` para a API.

## Estrutura do projeto

```
.
├── censo.sqlite                            # dado original do Censo 2022 (IBGE) — nunca escrito pela aplicação
├── backend/                                 # API: Node.js + TypeScript + Fastify + better-sqlite3
├── frontend/                                # React + Vite + TypeScript + Tailwind CSS
├── docker-compose.yml                       # orquestra api (interno) + web (nginx, porta 80)
├── docs/data-exploration.md                 # exploração do dado feita antes de codar
├── teste-tecnico-full-stack-ipmedia.md       # enunciado original do teste técnico
└── _bmad-output/specs/spec-censo-2022/      # spec, decisões técnicas e histórico do processo BMAD
```

> Requisito único para `docker compose up --build`: Docker. Para rodar back-end/front-end ou os
> testes fora do Docker: Node.js 22.x (mesma versão usada na imagem — `better-sqlite3` compila um
> binário nativo, sensível à versão do Node).

## Testes

**Back-end** (Vitest, cobrindo os cálculos de agregação contra os valores de referência do dado):

```bash
cd backend
npm install
npm run db:prepare   # gera backend/data/censo.prepared.sqlite a partir de censo.sqlite (a
                      # cópia da raiz nunca é aberta em modo de escrita); os testes usam essa cópia
npm test
```

**Front-end** (Vitest + Testing Library para componentes; Playwright para E2E):

```bash
cd frontend
npm install
npm test
npx playwright install chromium   # só na 1ª vez nesta máquina
npx playwright test               # sobe o back-end e o front-end de dev sozinho
```

> O E2E do front-end sobe o back-end de desenvolvimento automaticamente (`webServer` do
> Playwright), então rode `cd backend && npm install` (seção acima) antes, mesmo que você só
> queira testar o front-end.

## API

- `GET /api/municipios?q=<termo>&limit=<n>` — autocomplete por nome (mín. 2 caracteres)
- `GET /api/municipios/:cdMun` — agregados de um município
- `GET /api/ufs` — lista as 27 UFs
- `GET /api/ufs/:cdUf` — agregados de uma UF
- `GET /api/ufs/:cdUf/municipios?page=<n>&pageSize=<n>` — ranking paginado de municípios por
  densidade decrescente

Exemplo, com a stack no ar (`docker compose up --build`): `curl http://localhost/api/ufs/35`.

## Decisões técnicas

- **Arquitetura em camadas leves** (`routes/services/db`), sem Clean Architecture/DDD completo.
  Justificativa completa em
  [`_bmad-output/specs/spec-censo-2022/architecture.md`](_bmad-output/specs/spec-censo-2022/architecture.md):
  é uma API de consulta somente leitura sobre um dataset estático, sem invariantes de domínio que
  justifiquem casos de uso explícitos e entidades ricas — `services/` já fica testável
  isoladamente sem subir o Fastify, que é o ganho prático buscado nessas arquiteturas, sem a
  ferramentaria completa.
- **Stack** (back: Fastify + better-sqlite3, sem ORM, SQL sempre parametrizado; front:
  React + Vite + Tailwind; testes: Vitest/Testing Library/Playwright; Docker multi-stage + nginx)
  — decisões e motivos completos em
  [`_bmad-output/specs/spec-censo-2022/stack.md`](_bmad-output/specs/spec-censo-2022/stack.md).
- **Constraints vindas diretamente da exploração do dado** — índice necessário para o join
  `setor × municipio` ser viável, exclusão do registro fantasma `cd_mun='.'` da busca/ranking
  (mantendo sua área nos totais de UF), "não informado" na distribuição por sexo, "Não
  classificado" para `situacao` nula, densidade sempre `SUM(populacao)/SUM(area_km2)`, e o
  cuidado com homônimos (232 nomes duplicados, ex. "São Domingos" em 5 UFs). Achados completos em
  [`docs/data-exploration.md`](docs/data-exploration.md).

## O que faria diferente com mais tempo

(Registrado em detalhe em
[`architecture.md`](_bmad-output/specs/spec-censo-2022/architecture.md#o-que-faria-diferente-com-mais-tempo))

- Evoluir para Clean Architecture + DDD tático se o domínio crescer (novas regras de negócio,
  múltiplas fontes de dado, agregados que mudam em runtime).
- Cache de leitura para os resumos por UF/município (dataset estático, alta taxa de acerto).
- Réplica de leitura / CQRS se o volume de consultas crescer.
- FTS5 (SQLite full-text search) para o autocomplete, em vez de `LIKE` sobre nome normalizado.
- Paginação por cursor no ranking de municípios, em vez de offset/limit.

## Processo de desenvolvimento (BMAD)

Este projeto foi conduzido com o framework [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
(spec driven development). Toda a spec, as decisões técnicas e o histórico de cada story estão
versionados em [`_bmad-output/specs/spec-censo-2022/`](_bmad-output/specs/spec-censo-2022/):

- `SPEC.md` — o contrato: capacidades, constraints, non-goals e sinal de sucesso.
- `stack.md`, `architecture.md` — decisões técnicas detalhadas (companions do SPEC).
- `stories.yaml` — quebra do trabalho em 5 stories (API + banco + esqueleto Docker; tela Buscar
  cidade; tela Buscar estado; Docker final + nginx; este README).
- `stories/*.md` — spec de cada story, incluindo o Review Triage Log (achados de revisão, o que
  foi corrigido e o que foi deliberadamente deixado de fora, com justificativa).
- `.memlog.md` — registro cronológico e append-only de toda decisão tomada durante o processo.
