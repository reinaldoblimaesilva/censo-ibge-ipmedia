import type { FastifyInstance } from 'fastify';
import { buscarUfPorCodigo, listarMunicipiosPorUf, listarUfs } from '../services/uf.service.js';

const ufParamSchema = {
  params: {
    type: 'object',
    required: ['cdUf'],
    properties: {
      cdUf: { type: 'string', minLength: 1 },
    },
  },
} as const;

const municipiosPorUfSchema = {
  params: {
    type: 'object',
    required: ['cdUf'],
    properties: {
      cdUf: { type: 'string', minLength: 1 },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
    },
  },
} as const;

export function registrarRotasUfs(app: FastifyInstance): void {
  app.get('/api/ufs', { schema: {} }, async () => listarUfs());

  app.get('/api/ufs/:cdUf', { schema: ufParamSchema }, async (request, reply) => {
    const { cdUf } = request.params as { cdUf: string };
    const uf = buscarUfPorCodigo(cdUf);

    if (!uf) {
      return reply.code(404).send({ message: 'UF não encontrada.' });
    }

    return uf;
  });

  app.get(
    '/api/ufs/:cdUf/municipios',
    { schema: municipiosPorUfSchema },
    async (request, reply) => {
      const { cdUf } = request.params as { cdUf: string };
      const { page, pageSize } = request.query as { page?: number; pageSize?: number };

      const pagina = listarMunicipiosPorUf(cdUf, page ?? 1, pageSize ?? 20);

      if (!pagina) {
        return reply.code(404).send({ message: 'UF não encontrada.' });
      }

      return pagina;
    },
  );
}
