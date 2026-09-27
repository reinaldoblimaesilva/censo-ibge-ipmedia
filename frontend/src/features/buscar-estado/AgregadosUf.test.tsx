import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UfResumo } from '../../api/ufs';
import { AgregadosUf } from './AgregadosUf';

const UF_SP: UfResumo = {
  cdUf: '35',
  nmUf: 'São Paulo',
  sigla: 'SP',
  populacao: 44411238,
  areaKm2: 248219.49,
  densidade: 178.94,
  municipios: 645,
};

function respostaJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

describe('AgregadosUf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mostra os agregados batendo com os valores de referência de SP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(UF_SP)));

    render(<AgregadosUf cdUf="35" />);

    expect(await screen.findByText('São Paulo — SP')).toBeInTheDocument();
    expect(screen.getByText('44.411.238')).toBeInTheDocument();
    expect(screen.getByText('248.219,49 km²')).toBeInTheDocument();
    expect(screen.getByText('645')).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando a API de detalhe falha (5xx)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ message: 'boom' }, { ok: false, status: 500 })),
    );

    render(<AgregadosUf cdUf="35" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando a API de detalhe falha (rede)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<AgregadosUf cdUf="35" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('mostra mensagem de não encontrado quando a API devolve 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ message: 'not found' }, { ok: false, status: 404 })),
    );

    render(<AgregadosUf cdUf="99" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não encontrada/i);
  });
});
