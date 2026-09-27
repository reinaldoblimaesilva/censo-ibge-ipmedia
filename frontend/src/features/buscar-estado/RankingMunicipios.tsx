import { useEffect, useState } from 'react';
import { listarMunicipiosPorUf, UfApiError, type PaginaMunicipios } from '../../api/ufs';
import { formatadorArea, formatadorDensidade, formatadorInteiro } from './formatadores';

interface RankingMunicipiosProps {
  cdUf: string;
}

const TAMANHO_PAGINA = 20;

const MENSAGEM_ERRO_PADRAO = 'Não foi possível carregar o ranking de municípios. Tente novamente.';
const MENSAGEM_NAO_ENCONTRADO = 'UF não encontrada.';
const MENSAGEM_LISTA_VAZIA = 'nenhum município encontrado';

/**
 * Ranking paginado de municípios de uma UF por densidade decrescente,
 * devolvido pronto por `GET /api/ufs/:cdUf/municipios`. A paginação é do
 * servidor — este componente só guarda a página atual e pede a próxima/
 * anterior; nunca reordena nem recalcula nada localmente. Os controles de
 * paginação somem quando `totalPages <= 1` (UFs como RR ou DF).
 *
 * O reset de página ao trocar de UF é responsabilidade do pai
 * (`BuscarEstado`), que monta este componente com `key={cdUf}` — a troca de
 * `key` remonta o componente e reinicia o estado interno de página em 1.
 */
export function RankingMunicipios({ cdUf }: RankingMunicipiosProps) {
  const [page, setPage] = useState(1);
  const [pagina, setPagina] = useState<PaginaMunicipios | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    listarMunicipiosPorUf(cdUf, page, TAMANHO_PAGINA)
      .then((resultado) => {
        if (cancelado) return;
        if (resultado === null) {
          setErro(MENSAGEM_NAO_ENCONTRADO);
          setPagina(null);
          return;
        }
        setPagina(resultado);
      })
      .catch((erroCapturado: unknown) => {
        if (cancelado) return;
        const mensagem = erroCapturado instanceof UfApiError ? erroCapturado.message : MENSAGEM_ERRO_PADRAO;
        setErro(mensagem);
        setPagina(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cdUf, page]);

  if (carregando && !pagina) {
    return <p className="mt-4 text-sm text-gray-500">Carregando ranking...</p>;
  }

  if (erro) {
    return (
      <p role="alert" className="mt-4 text-sm text-red-600">
        {erro}
      </p>
    );
  }

  if (!pagina) {
    return null;
  }

  const mostrarPaginacao = pagina.totalPages > 1;

  return (
    <section aria-label="Ranking de municípios por densidade" className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Ranking de municípios por densidade</h2>

      {pagina.items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{MENSAGEM_LISTA_VAZIA}</p>
      ) : (
        <ol
          aria-label="Municípios ranqueados por densidade decrescente"
          className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm"
        >
          {pagina.items.map((municipio, indice) => (
            <li key={municipio.cdMun} className="flex flex-wrap justify-between gap-2 px-3 py-2">
              <span className="font-medium text-gray-900">
                <span className="mr-2 text-gray-400">
                  {(pagina.page - 1) * pagina.pageSize + indice + 1}.
                </span>
                {municipio.nmMun}
              </span>
              <span className="text-sm text-gray-600">
                {formatadorInteiro.format(municipio.populacao)} hab · {formatadorArea.format(municipio.areaKm2)}{' '}
                km² · {formatadorDensidade.format(municipio.densidade)} hab/km²
              </span>
            </li>
          ))}
        </ol>
      )}

      {mostrarPaginacao && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((atual) => atual - 1)}
            disabled={page <= 1 || carregando}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {pagina.page} de {pagina.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((atual) => atual + 1)}
            disabled={page >= pagina.totalPages || carregando}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  );
}
