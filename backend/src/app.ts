import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { registrarRotasMunicipios } from './routes/municipios.routes.js';
import { registrarRotasUfs } from './routes/ufs.routes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  registrarRotasMunicipios(app);
  registrarRotasUfs(app);

  // Handler genérico: erros de validação viram 400 com a mensagem do schema;
  // qualquer outro erro (incluindo falhas de SQL) vira 500 genérico, sem vazar detalhes internos.
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      reply.code(400).send({ message: 'Parâmetros inválidos.', details: error.validation });
      return;
    }

    app.log.error(error);
    reply.code(500).send({ message: 'Erro interno.' });
  });

  return app;
}
