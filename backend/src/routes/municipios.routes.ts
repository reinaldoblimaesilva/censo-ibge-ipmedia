import type { FastifyInstance } from 'fastify';
import { buscarMunicipioPorCodigo, buscarMunicipios } from '../services/municipio.service.js';

const buscaSchema = {
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', minLength: 2 },
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
    },
  },
} as const;

const detalheSchema = {
  params: {
    type: 'object',
    required: ['cdMun'],
    properties: {
      cdMun: { type: 'string', minLength: 1 },
    },
  },
} as const;

export function registrarRotasMunicipios(app: FastifyInstance): void {
  app.get('/api/municipios', { schema: buscaSchema }, async (request) => {
    const { q, limit } = request.query as { q: string; limit?: number };
    return buscarMunicipios(q, limit ?? 5);
  });

  app.get('/api/municipios/:cdMun', { schema: detalheSchema }, async (request, reply) => {
    const { cdMun } = request.params as { cdMun: string };
    const municipio = buscarMunicipioPorCodigo(cdMun);

    if (!municipio) {
      return reply.code(404).send({ message: 'Município não encontrado.' });
    }

    return municipio;
  });
}
