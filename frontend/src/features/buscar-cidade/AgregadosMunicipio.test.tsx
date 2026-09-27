import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MunicipioDetalhe } from '../../api/municipios';
import { AgregadosMunicipio } from './AgregadosMunicipio';

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

describe('AgregadosMunicipio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mostra os agregados batendo com os valores de referência de São Paulo/SP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(DETALHE_SAO_PAULO)));

    render(<AgregadosMunicipio cdMun="3550308" />);

    expect(await screen.findByText('São Paulo — SP')).toBeInTheDocument();
    expect(screen.getByText('11.451.999')).toBeInTheDocument();
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

  it('mostra mensagem amigável quando a API de detalhe falha (5xx)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ message: 'boom' }, { ok: false, status: 500 })),
    );

    render(<AgregadosMunicipio cdMun="3550308" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando a API de detalhe falha (rede)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<AgregadosMunicipio cdMun="3550308" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('mostra mensagem de não encontrado quando a API devolve 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ message: 'not found' }, { ok: false, status: 404 })),
    );

    render(<AgregadosMunicipio cdMun="0000000" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não encontrado/i);
  });
});
