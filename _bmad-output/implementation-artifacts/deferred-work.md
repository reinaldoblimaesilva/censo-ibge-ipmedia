- source_spec: `_bmad-output/specs/spec-censo-2022/stories/1-api-banco-esqueleto-docker.md`
  summary: Adicionar healthcheck, restart policy e environment overrides ao docker-compose.yml.
  evidence: Achado do blind-hunter na review da Story 1. A própria Story 1 exclui otimização/enrijecimento de Docker do seu escopo ("Sem multi-stage/nginx no Dockerfile — Story 4 cuida disso"); healthcheck/restart se encaixam no mesmo enrijecimento adiado para a Story 4.
- source_spec: `_bmad-output/specs/spec-censo-2022/stories/1-api-banco-esqueleto-docker.md`
  summary: Documentar no README (ou num backend/README.md) que `npm run db:prepare` precisa rodar antes de `npm run dev`/`npm start` fora do Docker.
  evidence: Achado do blind-hunter — sem essa nota, rodar o back-end localmente sem Docker antes de preparar o banco produz um erro opaco do better-sqlite3 (arquivo inexistente). Não afeta `docker compose up --build` (que já roda db:prepare no build da imagem). A Story 5 já é dona da documentação de instalação/execução do projeto.
