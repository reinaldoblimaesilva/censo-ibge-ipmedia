import { useEffect, useState } from 'react';
import { buscarUfDetalhe, UfApiError, type UfResumo } from '../../api/ufs';
import { formatadorArea, formatadorDensidade, formatadorInteiro } from './formatadores';

interface AgregadosUfProps {
  cdUf: string;
}

const MENSAGEM_NAO_ENCONTRADO = 'UF não encontrada.';
const MENSAGEM_ERRO_PADRAO = 'Não foi possível carregar os agregados da UF. Tente novamente.';

/**
 * Exibe os agregados de uma UF já prontos, devolvidos por
 * `GET /api/ufs/:cdUf`. Nunca recalcula densidade nem nenhum outro
 * agregado — só formata o que a API já entrega pronto.
 */
export function AgregadosUf({ cdUf }: AgregadosUfProps) {
  const [detalhe, setDetalhe] = useState<UfResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setDetalhe(null);

    buscarUfDetalhe(cdUf)
      .then((resultado) => {
        if (cancelado) return;
        if (resultado === null) {
          setErro(MENSAGEM_NAO_ENCONTRADO);
          return;
        }
        setDetalhe(resultado);
      })
      .catch((erroCapturado: unknown) => {
        if (cancelado) return;
        const mensagem = erroCapturado instanceof UfApiError ? erroCapturado.message : MENSAGEM_ERRO_PADRAO;
        setErro(mensagem);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cdUf]);

  if (carregando) {
    return <p className="mt-4 text-sm text-gray-500">Carregando agregados...</p>;
  }

  if (erro) {
    return (
      <p role="alert" className="mt-4 text-sm text-red-600">
        {erro}
      </p>
    );
  }

  if (!detalhe) {
    return null;
  }

  return (
    <section
      aria-label={`Agregados de ${detalhe.nmUf}`}
      className="mt-6 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {detalhe.nmUf} — {detalhe.sigla}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metrica rotulo="População" valor={formatadorInteiro.format(detalhe.populacao)} />
        <Metrica rotulo="Área" valor={`${formatadorArea.format(detalhe.areaKm2)} km²`} />
        <Metrica
          rotulo="Densidade demográfica"
          valor={`${formatadorDensidade.format(detalhe.densidade)} hab/km²`}
        />
        <Metrica rotulo="Municípios" valor={formatadorInteiro.format(detalhe.municipios)} />
      </dl>
    </section>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</dt>
      <dd className="text-base font-medium text-gray-900">{valor}</dd>
    </div>
  );
}
