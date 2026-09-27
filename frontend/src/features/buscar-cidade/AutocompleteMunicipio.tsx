import { useEffect, useRef, useState } from 'react';
import {
  buscarMunicipios,
  MunicipioApiError,
  type MunicipioResultadoBusca,
} from '../../api/municipios';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const TAMANHO_MINIMO_BUSCA = 2;
const ATRASO_DEBOUNCE_MS = 300;

interface AutocompleteMunicipioProps {
  onSelecionar: (municipio: MunicipioResultadoBusca) => void;
}

/**
 * Campo de busca com autocomplete debounced. Só dispara a chamada à API com
 * 2+ caracteres (a API rejeita menos com 400) e usa o `rotulo` já formatado
 * "Nome — UF" devolvido pela API — nunca monta o rótulo aqui.
 */
export function AutocompleteMunicipio({ onSelecionar }: AutocompleteMunicipioProps) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<MunicipioResultadoBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscaConcluida, setBuscaConcluida] = useState(false);

  const termoDebounced = useDebouncedValue(termo, ATRASO_DEBOUNCE_MS);
  const idBuscaAtual = useRef(0);
  // Guarda o rótulo que `selecionar()` acabou de colocar em `termo`, para que
  // o eco desse valor (~300ms depois, via debounce) não realimente esta
  // busca — sem isso, selecionar um resultado reabre a lista ou mostra
  // "nenhum município encontrado" por baixo dos agregados recém-abertos.
  const termoSelecionadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (termoSelecionadoRef.current !== null && termoDebounced === termoSelecionadoRef.current) {
      termoSelecionadoRef.current = null;
      return;
    }

    const termoLimpo = termoDebounced.trim();

    if (termoLimpo.length < TAMANHO_MINIMO_BUSCA) {
      idBuscaAtual.current += 1;
      setResultados([]);
      setErro(null);
      setBuscaConcluida(false);
      setCarregando(false);
      return;
    }

    const idDestaBusca = ++idBuscaAtual.current;
    setCarregando(true);
    setErro(null);

    buscarMunicipios(termoLimpo)
      .then((lista) => {
        if (idBuscaAtual.current !== idDestaBusca) return;
        setResultados(lista);
        setBuscaConcluida(true);
        setCarregando(false);
      })
      .catch((erroCapturado: unknown) => {
        if (idBuscaAtual.current !== idDestaBusca) return;
        const mensagem =
          erroCapturado instanceof MunicipioApiError
            ? erroCapturado.message
            : 'Não foi possível buscar municípios. Tente novamente.';
        setErro(mensagem);
        setResultados([]);
        setBuscaConcluida(false);
        setCarregando(false);
      });
  }, [termoDebounced]);

  function selecionar(municipio: MunicipioResultadoBusca) {
    idBuscaAtual.current += 1;
    termoSelecionadoRef.current = municipio.rotulo;
    setTermo(municipio.rotulo);
    setResultados([]);
    setBuscaConcluida(false);
    setErro(null);
    onSelecionar(municipio);
  }

  return (
    <div className="w-full max-w-md">
      <label htmlFor="busca-municipio" className="mb-1 block text-sm font-medium text-gray-700">
        Buscar cidade
      </label>
      <input
        id="busca-municipio"
        type="text"
        role="combobox"
        aria-expanded={resultados.length > 0}
        aria-autocomplete="list"
        aria-controls="lista-resultados-municipio"
        autoComplete="off"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        placeholder="Digite o nome de um município (mín. 2 letras)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {carregando && <p className="mt-2 text-sm text-gray-500">Buscando...</p>}

      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      {!carregando && !erro && buscaConcluida && resultados.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">nenhum município encontrado</p>
      )}

      {!carregando && resultados.length > 0 && (
        <ul
          id="lista-resultados-municipio"
          role="listbox"
          aria-label="Resultados da busca"
          className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm"
        >
          {resultados.map((municipio) => (
            <li key={municipio.cdMun}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selecionar(municipio)}
                className="block w-full px-3 py-2 text-left hover:bg-blue-50"
              >
                {municipio.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
