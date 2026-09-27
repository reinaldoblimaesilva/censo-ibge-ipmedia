import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MunicipioDetalhe, MunicipioResultadoBusca } from '../../api/municipios';
import { BuscarCidade } from './BuscarCidade';

const RESULTADO_BUSCA: MunicipioResultadoBusca[] = [
  { cdMun: '3550308', nmMun: 'São Paulo', siglaUf: 'SP', rotulo: 'São Paulo — SP' },
];

const DETALHE_SAO_PAULO: MunicipioDetalhe = {
  cdMun: '3550308',
  nmMun: 'São Paulo',
  cdUf: '35',
  siglaUf: 'SP',
  populacao: 11451999,
  setores: 27301,
  areaKm2: 1521.202,
  densidade: 7528.26,
  urbanos: 27037,
  rurais: 254,
  naoClassificados: 10,
  homens: 5380188,
  mulheres: 6060887,
  naoInformado: 10924,
};

function respostaJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

describe('BuscarCidade (integração)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('busca "sao paulo", seleciona o resultado e exibe os agregados de referência', async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('/api/municipios/')) {
        return respostaJson(DETALHE_SAO_PAULO);
      }
      return respostaJson(RESULTADO_BUSCA);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<BuscarCidade />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sao paulo' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    fireEvent.click(screen.getByRole('option', { name: 'São Paulo — SP' }));

    // O agregado do município selecionado chega por uma promise sem
    // temporizador — volta a timers reais para que `findBy` (que faz
    // polling com `setTimeout`) funcione normalmente.
    vi.useRealTimers();

    expect(await screen.findByText('11.451.999')).toBeInTheDocument();
    expect(screen.getByText('27.301')).toBeInTheDocument();
    expect(screen.getByText('1.521,202 km²')).toBeInTheDocument();
    expect(screen.getByText('7.528,26 hab/km²')).toBeInTheDocument();
    expect(screen.getByText('27.037')).toBeInTheDocument();
    expect(screen.getByText('254')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5.380.188')).toBeInTheDocument();
    expect(screen.getByText('6.060.887')).toBeInTheDocument();
    expect(screen.getByText('10.924')).toBeInTheDocument();
  });

  it('mostra erro amigável e não quebra a tela quando a busca falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<BuscarCidade />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sao paulo' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buscar cidade' })).toBeInTheDocument();
  });
});
