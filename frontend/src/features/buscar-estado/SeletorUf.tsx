import { useEffect, useState } from 'react';
import { listarUfs, UfApiError, type UfResumo } from '../../api/ufs';

interface SeletorUfProps {
  onSelecionar: (uf: UfResumo) => void;
}

const MENSAGEM_ERRO_PADRAO = 'Não foi possível carregar a lista de UFs. Tente novamente.';

/**
 * `<select>` alimentado por `listarUfs()`. Carrega a lista uma vez ao montar
 * e avisa o pai (via `onSelecionar`) com a UF completa já escolhida, sem
 * recalcular nem guardar agregados aqui.
 */
export function SeletorUf({ onSelecionar }: SeletorUfProps) {
  const [ufs, setUfs] = useState<UfResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cdUfSelecionado, setCdUfSelecionado] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    listarUfs()
      .then((lista) => {
        if (cancelado) return;
        setUfs(lista);
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
  }, []);

  function selecionar(cdUf: string) {
    setCdUfSelecionado(cdUf);
    const uf = ufs.find((item) => item.cdUf === cdUf);
    if (uf) {
      onSelecionar(uf);
    }
  }

  if (carregando) {
    return <p className="text-sm text-gray-500">Carregando UFs...</p>;
  }

  if (erro) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {erro}
      </p>
    );
  }

  return (
    <div className="w-full max-w-md">
      <label htmlFor="seletor-uf" className="mb-1 block text-sm font-medium text-gray-700">
        Estado (UF)
      </label>
      <select
        id="seletor-uf"
        value={cdUfSelecionado}
        onChange={(evento) => selecionar(evento.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="" disabled>
          Selecione uma UF
        </option>
        {ufs.map((uf) => (
          <option key={uf.cdUf} value={uf.cdUf}>
            {uf.nmUf} ({uf.sigla})
          </option>
        ))}
      </select>
    </div>
  );
}
