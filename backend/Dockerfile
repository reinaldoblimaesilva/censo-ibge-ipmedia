# Story 4: multi-stage — stage `builder` compila e prepara o banco (com
# ferramentas de build); stage `runtime` só copia os artefatos finais, sem
# ferramentas de build nem devDependencies.
FROM node:22-bookworm-slim AS builder

# Ferramentas de build exigidas pelo node-gyp do better-sqlite3 (binário nativo).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src

# `censo.sqlite` original vai para fora de /app (WORKDIR), então o default
# relativo "../censo.sqlite" de CENSO_SOURCE_DB resolve para /censo.sqlite.
COPY censo.sqlite /censo.sqlite

RUN npm run build
RUN npm run db:prepare

# Remove devDependencies (typescript, tsx, vitest, @types/*), mantendo só o
# necessário para rodar `dist/server.js` em produção (fastify, better-sqlite3).
RUN npm prune --omit=dev
# `npm prune` deixa para trás diretórios de escopo vazios (@types, @vitest, ...).
RUN find node_modules -maxdepth 1 -type d -empty -delete

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# Só os artefatos finais: build compilado, dependências de produção (com o
# binário nativo do better-sqlite3 já compilado) e o banco preparado.
# Nenhuma ferramenta de build (python3/make/g++) nem devDependency chega aqui.
# --chown para o usuário não-root `node` (já existe na imagem base) ser dono
# dos artefatos antes de trocar de usuário abaixo.
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/data ./data

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
