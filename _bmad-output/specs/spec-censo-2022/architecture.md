# Arquitetura do back-end

Camadas leves, sem Clean Architecture/DDD completo:

```
src/
  routes/    # Fastify: parsing de query string, validação de schema, status HTTP
  services/  # regras de agregação (densidade, "não informado", exclusão de cd_mun='.')
  db/        # better-sqlite3: queries parametrizadas, preparo/otimização do banco no build
```

## Por que não Clean Architecture/DDD completo

É uma API de consulta somente leitura sobre um dataset estático, sem invariantes de domínio,
agregados que mudam em runtime, ou regras de negócio que justifiquem casos de uso explícitos e
entidades ricas. A complexidade de Clean Architecture/DDD não pagaria seu custo neste escopo e
prazo (2h30).

`services/` já fica testável isoladamente sem subir o Fastify — esse é o ganho prático que se
busca nessas arquiteturas, obtido aqui sem a ferramentaria completa.

Esta decisão e sua justificativa vão para o README como decisão técnica explícita.

## O que faria diferente com mais tempo

- Evoluir para Clean Architecture + DDD tático se o domínio crescer (novas regras de negócio,
  múltiplas fontes de dado, agregados que mudam em runtime).
- Cache de leitura para os resumos por UF/município (dataset estático, alta taxa de acerto).
- Réplica de leitura / CQRS se o volume de consultas crescer.
- FTS5 (SQLite full-text search) para o autocomplete, em vez de `LIKE` sobre nome normalizado.
- Paginação por cursor no ranking de municípios, em vez de offset/limit.
