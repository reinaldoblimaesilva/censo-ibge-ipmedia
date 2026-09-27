---
id: SPEC-censo-2022
companions: [stack.md, architecture.md, ../../../docs/data-exploration.md]
sources: [../../../teste-tecnico-full-stack-ipmedia.md]
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Consulta Censo 2022 por Município e UF

## Why

Teste técnico de desenvolvedor(a) full stack, com prazo de 2h30: construir uma aplicação web
que consulta dados do Censo Demográfico 2022 (IBGE) por município e por unidade federativa, a
partir do arquivo `censo.sqlite` versionado na raiz do repositório. O mandato do teste é entregar
um escopo pequeno de forma **completa** — duas telas, API, testes, subida via Docker sem passo
manual — em vez de um escopo maior incompleto. A avaliação olha tanto o resultado quanto a
condução do framework de spec driven development.

## Capabilities

- **CAP-1**
  - **intent:** Usuário busca um município pelo nome (autocomplete, sempre exibindo a UF) e,
    ao selecionar, vê população total, quantidade de setores, área total, densidade
    demográfica, divisão de setores urbanos/rurais/não classificados, e distribuição da
    população por sexo (homens/mulheres/não informado).
  - **success:** Buscar "sao paulo" retorna São Paulo/SP entre outros resultados; ao selecionar
    `cd_mun 3550308` os agregados batem com os valores de referência de `data-exploration.md`
    (população 11.451.999; 27.301 setores; 1.521,202 km²; densidade 7.528,26 hab/km²; 27.037
    urbanos / 254 rurais / 10 não classificados; 5.380.188 homens / 6.060.887 mulheres / 10.924
    não informado).
  - **success:** Buscar "São Domingos" retorna 5 resultados em UFs distintas.
- **CAP-2**
  - **intent:** Usuário escolhe uma UF e vê população total, área total e densidade da UF, mais
    os municípios dela ranqueados por densidade decrescente, paginados.
  - **success:** UF de código 35 (SP) mostra 645 municípios, população 44.411.238, área
    248.219,49 km², com Taboão da Serra em 1º lugar do ranking (13.416,96 hab/km², também 1º do
    Brasil); UF 43 (RS) mostra população 10.882.965 e área 281.707,15 km² (incluindo a área das
    lagoas sem nome); UF de Roraima lista 15 municípios.
- **CAP-3**
  - **intent:** Uma API HTTP expõe os dados agregados e paginados que alimentam as duas telas.
  - **success:** Cada rota tem schema de validação de entrada no Fastify e retorna erro 4xx
    claro para parâmetros inválidos (ex.: termo de busca com 1 caractere, UF inexistente).
- **CAP-4**
  - **intent:** Cobertura de testes automatizados garante que os agregados e o comportamento das
    duas telas continuam corretos.
  - **success:** Testes de back-end (Vitest) cobrem os cálculos de agregação (densidade,
    exclusão de `cd_mun='.'`, "não informado", "Não classificado"); testes de front-end
    (Vitest + Testing Library) cobrem os componentes das duas telas; há ao menos um teste E2E
    (Playwright) por tela, rodando contra a aplicação de verdade.
- **CAP-5**
  - **intent:** A aplicação inteira sobe em uma máquina limpa com Docker, sem passo manual.
  - **success:** Em uma máquina só com Docker instalado, `git clone` seguido de
    `docker compose up --build` deixa as duas telas funcionando com dado real, sem instalar
    dependência, rodar migration ou qualquer outro passo à parte.
- **CAP-6**
  - **intent:** Um README documenta instalação, execução, as decisões técnicas tomadas e o que
    seria feito com mais tempo.
  - **success:** README contém passo a passo de instalação/execução, a justificativa da
    arquitetura em camadas leves (ver `architecture.md`) e uma seção "o que faria diferente com
    mais tempo" cobrindo a evolução para Clean Architecture/DDD tático e melhorias de escala.

## Constraints

- Banco preparado no build da imagem Docker: copiar `censo.sqlite`, criar índices e tabelas
  agregadas (resumo por município, resumo por UF, mapa `cd_uf → sigla`, nome normalizado para
  busca). O arquivo versionado na raiz não é alterado; a API abre a cópia otimizada em modo
  somente leitura.
- Densidade = `SUM(populacao) / SUM(area_km2)`, nunca média das densidades de setor. Vale para
  município, UF e Brasil.
- Excluir o registro `cd_mun = '.'` (lagoas do RS, sem nome, população 0) da busca e do ranking,
  mas manter sua área nos totais de UF e Brasil — sem ela a área do Brasil não fecha em
  8.510.417 km².
- População total sempre de `setor.populacao`. Distribuição por sexo mostra homens, mulheres e
  "não informado" (= população − homens − mulheres), pois `demografia` tem setores ausentes ou
  com sigilo estatístico.
- `situacao` nula em `setor` é exibida como "Não classificado".
- Busca de município insensível a acento e caixa, mínimo de 2 caracteres, limite de resultados,
  chave é `cd_mun`, exibição no formato "Nome — UF" (há 232 nomes duplicados no Brasil, ex. "São
  Domingos" em 5 UFs, e nomes com apóstrofo como "Alta Floresta D'Oeste").
- Ranking de municípios por UF paginado no servidor (MG tem 853 municípios, SP 645, RR 15).
- Todas as rotas validam entrada via schema do Fastify; toda query SQL é parametrizada, nunca
  concatenada.
- Stack, camadas de back-end e decisões de Docker são fixas — ver `stack.md` e
  `architecture.md`.

## Non-goals

- Autenticação e autorização de usuários.
- Escrita no banco (a aplicação é somente leitura sobre o Censo).
- Mapas ou gráficos elaborados (visualização geográfica, dashboards).
- Internacionalização (i18n).
- Deploy em nuvem ou infraestrutura além do `docker compose` local.
- Clean Architecture / DDD tático completo — justificado em `architecture.md`; fica registrado
  como evolução futura, não como entrega deste teste.

## Success signal

Clonar o repositório e rodar `docker compose up --build` deixa as duas telas usáveis com dado
real, sem nenhum passo manual adicional. Os testes automatizados batem com os valores de
referência de `data-exploration.md` (Brasil: 203.080.756 habitantes e 8.510.417 km²; São
Paulo/SP: 11.451.999 habitantes). O histórico de commits é pequeno e em Conventional Commits,
incluindo os artefatos BMAD gerados durante o teste.

## Assumptions

- Números exatos de limite de resultados no autocomplete e tamanho de página no ranking ficam a
  critério de quem implementa (WHAT, não HOW); nenhum valor foi exigido pelo enunciado ou pelos
  achados do dado.

## Open Questions

- Nenhuma pendente — o dado já foi explorado (`data-exploration.md`) e o enunciado
  (`teste-tecnico-full-stack-ipmedia.md`) foi totalmente absorvido neste SPEC e nos companions.
