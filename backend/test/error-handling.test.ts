import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

/**
 * Cobre o ramo genérico (não-validação) de `setErrorHandler` em `src/app.ts`,
 * que promete responder 500 "sem vazar detalhes internos". Para forçar uma
 * exceção real (em vez de erro de validação de schema), aponta
 * `CENSO_PREPARED_DB` para um arquivo inexistente antes de importar uma
 * instância nova do app: `vi.resetModules()` garante que `src/db/connection.ts`
 * seja recarregado do zero, para que seu singleton de conexão (cacheado a
 * partir de outros testes) não "vaze" e mascare o erro que este teste precisa
 * provocar.
 */
describe('setErrorHandler - erro genérico', () => {
  const caminhoOriginal = process.env.CENSO_PREPARED_DB;

  afterEach(() => {
    if (caminhoOriginal === undefined) {
      delete process.env.CENSO_PREPARED_DB;
    } else {
      process.env.CENSO_PREPARED_DB = caminhoOriginal;
    }
  });

  it('GET /api/ufs com banco preparado ausente responde 500 com mensagem genérica', async () => {
    process.env.CENSO_PREPARED_DB = './data/arquivo-que-nao-existe.sqlite';
    vi.resetModules();

    const { buildApp } = await import('../src/app.js');
    const app: FastifyInstance = buildApp();

    try {
      const response = await app.inject({ method: 'GET', url: '/api/ufs' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ message: 'Erro interno.' });

      const corpoBruto = response.body.toLowerCase();
      expect(corpoBruto).not.toMatch(/sql|sqlite|errno|stack|node_modules|\.ts:|\.js:/);
    } finally {
      await app.close();
    }
  });
});
