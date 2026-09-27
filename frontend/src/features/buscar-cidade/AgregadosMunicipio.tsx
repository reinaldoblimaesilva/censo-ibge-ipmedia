import { useEffect, useState } from 'react';
import {
  buscarMunicipioDetalhe,
  MunicipioApiError,
  type MunicipioDetalhe,
} from '../../api/municipios';

interface AgregadosMunicipioProps {
  cdMun: string;
}

const formatadorInteiro = new Intl.NumberFormat('pt-BR');
const formatadorArea = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const formatadorDensidade = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MENSAGEM_NAO_ENCONTRADO = 'Município não encontrado.';

/**
 * Exibe os agregados de um município já prontos, devolvidos por
 * `GET /api/municipios/:cdMun`. Nunca recalcula densidade nem nenhum outro
 * agregado — só formata o que a API já entrega pronto.
 */
export function AgregadosMunicipio({ cdMun }: AgregadosMunicipioProps) {
  const [detalhe, setDetalhe] = useState<MunicipioDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setDetalhe(null);

    buscarMunicipioDetalhe(cdMun)
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
        const mensagem =
          erroCapturado instanceof MunicipioApiError
            ? erroCapturado.message
            : 'Não foi possível carregar os agregados do município. Tente novamente.';
        setErro(mensagem);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [cdMun]);

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
      aria-label={`Agregados de ${detalhe.nmMun}`}
      className="mt-6 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {detalhe.nmMun} — {detalhe.siglaUf}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metrica rotulo="População" valor={formatadorInteiro.format(detalhe.populacao)} />
        <Metrica rotulo="Setores censitários" valor={formatadorInteiro.format(detalhe.setores)} />
        <Metrica rotulo="Área" valor={`${formatadorArea.format(detalhe.areaKm2)} km²`} />
        <Metrica
          rotulo="Densidade demográfica"
          valor={`${formatadorDensidade.format(detalhe.densidade)} hab/km²`}
        />
        <Metrica rotulo="Setores urbanos" valor={formatadorInteiro.format(detalhe.urbanos)} />
        <Metrica rotulo="Setores rurais" valor={formatadorInteiro.format(detalhe.rurais)} />
        <Metrica
          rotulo="Setores não classificados"
          valor={formatadorInteiro.format(detalhe.naoClassificados)}
        />
        <Metrica rotulo="Homens" valor={formatadorInteiro.format(detalhe.homens)} />
        <Metrica rotulo="Mulheres" valor={formatadorInteiro.format(detalhe.mulheres)} />
        <Metrica rotulo="Não informado" valor={formatadorInteiro.format(detalhe.naoInformado)} />
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
