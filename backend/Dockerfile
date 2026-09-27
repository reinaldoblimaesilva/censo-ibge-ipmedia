# Story 1: esqueleto Docker, sem multi-stage/nginx (fica para a Story 4).
# Este estágio único instala dependências, builda o TS, prepara o banco no
# build da imagem e sobe a API.
FROM node:22-bookworm-slim

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

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
