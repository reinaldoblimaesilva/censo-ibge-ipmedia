import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaginaMunicipios } from '../../api/ufs';
import { RankingMunicipios } from './RankingMunicipios';

function respostaJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

function paginaMg(page: number): PaginaMunicipios {
  const inicio = (page - 1) * 20;
  return {
    items: Array.from({ length: 20 }, (_, indice) => ({
      cdMun: String(3100000 + inicio + indice),
      nmMun: `Município ${inicio + indice + 1}`,
      populacao: 10000 - (inicio + indice),
      areaKm2: 100,
      densidade: 100 - (inicio + indice),
    })),
    page,
    pageSize: 20,
    total: 853,
    totalPages: 43,
  };
}

const PAGINA_RR: PaginaMunicipios = {
  items: Array.from({ length: 15 }, (_, indice) => ({
    cdMun: String(1400000 + indice),
    nmMun: `Município RR ${indice + 1}`,
    populacao: 1000 - indice,
    areaKm2: 100,
    densidade: 10 - indice * 0.1,
  })),
  page: 1,
  pageSize: 20,
  total: 15,
  totalPages: 1,
};

const PAGINA_DF: PaginaMunicipios = {
  items: [{ cdMun: '5300108', nmMun: 'Brasília', populacao: 2000, areaKm2: 5760, densidade: 0.35 }],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
};

const PAGINA_VAZIA: PaginaMunicipios = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
};

describe('RankingMunicipios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('UF grande (MG): navega para a página 2 mantendo ordem de densidade decrescente', async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      const page = url.includes('page=2') ? 2 : 1;
      return respostaJson(paginaMg(page));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<RankingMunicipios cdUf="31" />);

    expect(await screen.findByText('Município 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 43')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => expect(screen.getByText('Página 2 de 43')).toBeInTheDocument());
    expect(screen.getByText('Município 21')).toBeInTheDocument();
    expect(screen.queryByText('Município 1')).not.toBeInTheDocument();
  });

  it('UF pequena (RR, 15 municípios): mostra todos numa página, sem controles de paginação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(PAGINA_RR)));

    render(<RankingMunicipios cdUf="14" />);

    expect(await screen.findByText('Município RR 1')).toBeInTheDocument();
    expect(screen.getByText('Município RR 15')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
  });

  it('UF pequena (DF, 1 município): mostra o único município, sem controles de paginação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(PAGINA_DF)));

    render(<RankingMunicipios cdUf="53" />);

    expect(await screen.findByText('Brasília')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
  });

  it('mostra "nenhum município encontrado" quando a página vem vazia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(PAGINA_VAZIA)));

    render(<RankingMunicipios cdUf="00" />);

    expect(await screen.findByText('nenhum município encontrado')).toBeInTheDocument();
  });

  it('mostra mensagem amigável quando a API do ranking falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<RankingMunicipios cdUf="35" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
