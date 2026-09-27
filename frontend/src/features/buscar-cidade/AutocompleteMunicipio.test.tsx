import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MunicipioResultadoBusca } from '../../api/municipios';
import { AutocompleteMunicipio } from './AutocompleteMunicipio';

function respostaJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

async function digitarEAvancarDebounce(valor: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: valor } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
}

describe('AutocompleteMunicipio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('não dispara chamada à API com 1 caractere', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('s');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('busca válida mostra "São Paulo — SP" entre os resultados', async () => {
    const resultados: MunicipioResultadoBusca[] = [
      { cdMun: '3550308', nmMun: 'São Paulo', siglaUf: 'SP', rotulo: 'São Paulo — SP' },
      {
        cdMun: '4127700',
        nmMun: 'São José dos Pinhais',
        siglaUf: 'PR',
        rotulo: 'São José dos Pinhais — PR',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson(resultados)),
    );

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('sao paulo');

    expect(screen.getByText('São Paulo — SP')).toBeInTheDocument();
  });

  it('busca de homônimo retorna 5 resultados distinguíveis pela UF', async () => {
    const ufs = ['GO', 'SC', 'BA', 'SE', 'PB'];
    const resultados: MunicipioResultadoBusca[] = ufs.map((uf, indice) => ({
      cdMun: String(1000000 + indice),
      nmMun: 'São Domingos',
      siglaUf: uf,
      rotulo: `São Domingos — ${uf}`,
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson(resultados)),
    );

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('sao domingos');

    const opcoes = screen.getAllByRole('option');
    expect(opcoes).toHaveLength(5);
    for (const uf of ufs) {
      expect(screen.getByText(`São Domingos — ${uf}`)).toBeInTheDocument();
    }
  });

  it('mostra mensagem de "nenhum município encontrado" quando a busca não acha nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson([])));

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('zzzzzzzzzz');

    expect(screen.getByText('nenhum município encontrado')).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando a busca falha (rede/API)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('sao paulo');

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i);
  });

  it('mostra mensagem amigável quando a API responde 5xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ message: 'boom' }, { ok: false, status: 500 })),
    );

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('sao paulo');

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i);
  });

  it('seleção de um resultado chama onSelecionar e fecha a lista', async () => {
    const resultado: MunicipioResultadoBusca = {
      cdMun: '3550308',
      nmMun: 'São Paulo',
      siglaUf: 'SP',
      rotulo: 'São Paulo — SP',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson([resultado])),
    );
    const onSelecionar = vi.fn();

    render(<AutocompleteMunicipio onSelecionar={onSelecionar} />);
    await digitarEAvancarDebounce('sao paulo');

    fireEvent.click(screen.getByRole('option', { name: 'São Paulo — SP' }));

    expect(onSelecionar).toHaveBeenCalledWith(resultado);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('selecionar um resultado não reabre a lista nem mostra erro quando o eco do rótulo passa pelo debounce', async () => {
    const resultado: MunicipioResultadoBusca = {
      cdMun: '3550308',
      nmMun: 'São Paulo',
      siglaUf: 'SP',
      rotulo: 'São Paulo — SP',
    };
    const fetchMock = vi.fn().mockResolvedValue(respostaJson([resultado]));
    vi.stubGlobal('fetch', fetchMock);

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    await digitarEAvancarDebounce('sao paulo');

    fireEvent.click(screen.getByRole('option', { name: 'São Paulo — SP' }));
    const chamadasApósSelecionar = fetchMock.mock.calls.length;

    // `selecionar()` coloca o rótulo "São Paulo — SP" no input; espera o
    // debounce inteiro de novo para garantir que esse eco não dispara uma
    // nova busca (o que reabriria a lista ou mostraria "nenhum encontrado"
    // por baixo dos agregados recém-selecionados).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetchMock.mock.calls.length).toBe(chamadasApósSelecionar);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.queryByText('nenhum município encontrado')).not.toBeInTheDocument();
  });

  it('não chama fetch antes do debounce de 300ms terminar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson([]));
    vi.stubGlobal('fetch', fetchMock);

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sao paulo' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('descarta resposta de busca antiga que resolve depois da mais nova (guarda de corrida)', async () => {
    let resolverBuscaAntiga: (resposta: Response) => void = () => {};
    let resolverBuscaNova: (resposta: Response) => void = () => {};

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolverBuscaAntiga = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolverBuscaNova = resolve;
          }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AutocompleteMunicipio onSelecionar={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sao paulo' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sao domingos' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // A busca mais antiga ("sao paulo", 1ª chamada) fica pendente; a mais
    // nova ("sao domingos", 2ª chamada) resolve primeiro, fora de ordem.
    vi.useRealTimers();

    const resultadoNovo: MunicipioResultadoBusca = {
      cdMun: '1000000',
      nmMun: 'São Domingos',
      siglaUf: 'GO',
      rotulo: 'São Domingos — GO',
    };
    const resultadoAntigo: MunicipioResultadoBusca = {
      cdMun: '3550308',
      nmMun: 'São Paulo',
      siglaUf: 'SP',
      rotulo: 'São Paulo — SP',
    };

    resolverBuscaNova(respostaJson([resultadoNovo]));
    await screen.findByText('São Domingos — GO');

    resolverBuscaAntiga(respostaJson([resultadoAntigo]));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('São Domingos — GO')).toBeInTheDocument();
    expect(screen.queryByText('São Paulo — SP')).not.toBeInTheDocument();
  });
});
