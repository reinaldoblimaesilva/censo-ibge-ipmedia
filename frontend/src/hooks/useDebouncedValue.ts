import { useEffect, useState } from 'react';

/**
 * Devolve `valor` com atraso de `atrasoMs`, atualizando somente depois que o
 * valor parar de mudar por esse período. Hook genérico, usado pelo campo de
 * busca da tela "Buscar cidade" para não disparar uma chamada de API a cada
 * tecla digitada.
 */
export function useDebouncedValue<T>(valor: T, atrasoMs: number): T {
  const [valorComAtraso, setValorComAtraso] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setValorComAtraso(valor);
    }, atrasoMs);

    return () => {
      clearTimeout(temporizador);
    };
  }, [valor, atrasoMs]);

  return valorComAtraso;
}
