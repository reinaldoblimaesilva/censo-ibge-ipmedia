# Intenção: Consulta Censo 2022 por município

Entrada para o `/bmad-spec`. Achados do dado em [data-exploration.md](./data-exploration.md).

## Por quê
Aplicação web para consultar dados do Censo Demográfico 2022 (IBGE) por município e por UF,
a partir do `censo.sqlite` versionado na raiz. Teste técnico com prazo de 2h30:
entregar completo e simples.

## O que deve existir
1. **Tela "Buscar cidade"**: autocomplete de município pelo nome, sempre exibindo a UF.
   Ao selecionar, mostra: população total, quantidade de setores, área total, densidade,
   setores urbanos/rurais e população por sexo.
2. **Tela "Buscar estado"**: seleção de UF. Mostra população total, área total e densidade da UF,
   e os municípios ranqueados por densidade (decrescente), paginados.
3. API HTTP que alimenta as duas telas.
4. Testes automatizados no back-end e no front-end, mais ao menos um E2E por tela.
5. `docker compose up` sobe tudo numa máquina limpa, sem passo manual.
6. README com instalação e execução, decisões técnicas e "o que faria com mais tempo".

## Stack (decidida)
- Back-end: Node.js + TypeScript, Fastify, better-sqlite3 (SQL explícito e parametrizado, sem ORM).
- Front-end: React + Vite + TypeScript + Tailwind CSS.
- Testes: Vitest (back e front, Testing Library no front) e Playwright (E2E).
- Docker: build multi-stage; front servido por nginx com proxy `/api` para a API (sem CORS).

## Restrições (vindas do dado)
- **Preparo do banco no build da imagem**: copiar `censo.sqlite`, criar índices e tabelas agregadas
  (resumo por município e por UF, sigla da UF, nome normalizado para busca). O arquivo versionado
  não é alterado; a API abre a cópia em modo somente leitura.
- Densidade = `SUM(populacao) / SUM(area_km2)`.
- Excluir o registro `cd_mun = '.'` (lagoas do RS, sem nome, população 0) da busca e do ranking,
  mas manter sua área nos totais da UF.
- População total vem de `setor.populacao`. A distribuição por sexo inclui "não informado"
  (sigilo/ausência em `demografia`).
- `situacao` nula vira "Não classificado".
- Busca insensível a acento e caixa, mínimo de 2 caracteres, limite de resultados. A chave é `cd_mun`.
- Ranking paginado no servidor (MG tem 853 municípios, DF tem 1).
- Validação de entrada em todas as rotas (schema do Fastify) e queries sempre parametrizadas.

## Arquitetura (decidida, e por quê)
Camadas leves no back-end, sem Clean Architecture/DDD completo:
```
src/
  routes/    # Fastify: parsing de query string, validação de schema, status HTTP
  services/  # regras de agregação (densidade, "não informado", exclusão de cd_mun='.')
  db/        # better-sqlite3: queries parametrizadas, preparo/otimização do banco no build
```
Justificativa: é uma API de consulta somente leitura sobre um dataset estático, sem
invariantes de domínio, agregados ou regras de negócio que justifiquem casos de uso
explícitos e entidades ricas — a complexidade de Clean Architecture/DDD não pagaria seu
custo neste escopo e prazo. `services/` fica testável isoladamente sem subir o Fastify,
que é o ganho prático que se busca nessas arquiteturas, sem a ferramentaria completa.
Isso vai para o README como decisão técnica explícita, com a evolução para Clean
Architecture + DDD tático e melhorias de escala (cache, réplica de leitura/CQRS, FTS5
para o autocomplete, paginação por cursor) registrada em "o que faria diferente com
mais tempo".

## Fora de escopo
Autenticação, escrita no banco, mapas e gráficos elaborados, i18n, deploy em nuvem,
Clean Architecture/DDD completo (justificado acima).

## Sinal de sucesso
- Clonar, rodar `docker compose up --build` e usar as duas telas sem nenhum outro passo.
- Os testes batem com os valores de referência de `data-exploration.md`
  (ex.: Brasil = 203.080.756 hab e 8.510.417 km²; São Paulo/SP = 11.451.999 hab).
- Histórico com commits pequenos em Conventional Commits, incluindo os artefatos BMAD.
