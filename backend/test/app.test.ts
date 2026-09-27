import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

/**
 * Faz uma requisição HTTP crua contra um servidor já escutando, usando a API
 * de `path` do módulo `http` do Node (não `new URL()`), que não colapsa o
 * segmento "." — ao contrário de `app.inject()` (light-my-request), que
 * constrói a URL via `new URL()` e normaliza dot-segments antes do roteamento.
 * É assim que reproduzimos de forma automatizada o `GET /api/municipios/.`
 * real, sem depender de verificação manual.
 */
function requisitarCaminhoCru(port: number, path: string): Promise<{ statusCode: number }> {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, path, method: 'GET' }, (response) => {
      response.resume();
      response.on('end', () => resolve({ statusCode: response.statusCode ?? 0 }));
    });
    request.on('error', reject);
    request.end();
  });
}

describe('rotas HTTP', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/municipios?q=sao paulo responde 200 com São Paulo — SP', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/municipios?q=sao%20paulo' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { cdMun: string; rotulo: string }[];
    expect(body.some((item) => item.cdMun === '3550308' && item.rotulo === 'São Paulo — SP')).toBe(
      true,
    );
  });

  it('GET /api/municipios?q=a (1 caractere) responde 400', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/municipios?q=a' });
    expect(response.statusCode).toBe(400);
  });

  it('GET /api/municipios/3550308 bate com os agregados de referência', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/municipios/3550308' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { populacao: number; densidade: number };
    expect(body.populacao).toBe(11_451_999);
    expect(body.densidade).toBeCloseTo(7528.26, 1);
  });

  it('GET /api/municipios/:cdMun inexistente responde 404 sem vazar erro de SQL', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/municipios/0000000' });

    expect(response.statusCode).toBe(404);
    expect(JSON.stringify(response.json()).toLowerCase()).not.toMatch(/sql|sqlite|error:/);
  });

  // `app.inject()` (light-my-request) constrói a URL internamente via `new
  // URL()`, que colapsa o segmento de path "." antes mesmo de chegar ao
  // router, então esse cenário não é reproduzível por `inject`. Em vez de
  // pular o teste, sobe o servidor de verdade numa porta efêmera e faz uma
  // requisição HTTP crua (path literal, sem normalização) — o mesmo caminho
  // que o `find-my-way` do Fastify recebe em produção.
  it('GET /api/municipios/. (fantasma) responde 404 num servidor real', async () => {
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Falha ao obter a porta efêmera do servidor de teste.');
    }

    const { statusCode } = await requisitarCaminhoCru(address.port, '/api/municipios/.');
    expect(statusCode).toBe(404);
  });

  it('GET /api/ufs responde 200 com as 27 UFs', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/ufs' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(27);
  });

  it('GET /api/ufs/99 (inexistente) responde 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/ufs/99' });
    expect(response.statusCode).toBe(404);
  });

  it('GET /api/ufs/14/municipios (RR) responde com 15 resultados em uma página', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/ufs/14/municipios' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { items: unknown[]; total: number; totalPages: number };
    expect(body.items).toHaveLength(15);
    expect(body.total).toBe(15);
    expect(body.totalPages).toBe(1);
  });

  it('GET /api/ufs/31/municipios?page=1 (MG, 853) responde página parcial com metadados', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/ufs/31/municipios?page=1' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { items: unknown[]; total: number; totalPages: number };
    expect(body.total).toBe(853);
    expect(body.items.length).toBeLessThan(853);
    expect(body.totalPages).toBeGreaterThan(1);
  });
});
