# Story 4: multi-stage — stage `builder` roda `vite build` (estáticos);
# stage `runtime` é nginx servindo os estáticos e fazendo proxy de `/api`.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
