import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaginaMunicipios, UfResumo } from '../../api/ufs';
import { BuscarEstado } from './BuscarEstado';

const UF_SP: UfResumo = {
  cdUf: '35',
  nmUf: 'São Paulo',
  sigla: 'SP',
  populacao: 44411238,
  areaKm2: 248219.49,
  densidade: 178.94,
  municipios: 645,
};

const UF_MG: UfResumo = {
  cdUf: '31',
  nmUf: 'Minas Gerais',
  sigla: 'MG',
  populacao: 20538718,
  areaKm2: 586528.29,
  densidade: 35.02,
  municipios: 853,
};

const LISTA_UFS: UfResumo[] = [UF_MG, UF_SP];

function respostaJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

function paginaGenerica(page: number, total: number, prefixo: string): PaginaMunicipios {
  const pageSize = 20;
  const inicio = (page - 1) * pageSize;
  const tamanho = Math.min(pageSize, total - inicio);
  return {
    items: Array.from({ length: Math.max(tamanho, 0) }, (_, indice) => ({
      cdMun: `${prefixo}${inicio + indice}`,
      nmMun: `${prefixo} Município ${inicio + indice + 1}`,
      populacao: 10000 - (inicio + indice),
      areaKm2: 10,
      densidade: 1000 - (inicio + indice),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

const PAGINA_SP_1: PaginaMunicipios = {
  items: [
    { cdMun: '3552403', nmMun: 'Taboão da Serra', populacao: 297555, areaKm2: 22.18, densidade: 13416.96 },
  ],
  page: 1,
  pageSize: 20,
  total: 645,
  totalPages: 33,
};

function montarFetchMock() {
  return vi.fn(async (input: unknown) => {
    const url = String(input);

    if (url.endsWith('/api/ufs')) {
      return respostaJson(LISTA_UFS);
    }
    if (url.includes('/api/ufs/35/municipios')) {
      return respostaJson(PAGINA_SP_1);
    }
    if (url.includes('/api/ufs/31/municipios')) {
      const parametros = new URL(url, 'http://localhost');
      const page = Number(parametros.searchParams.get('page') ?? '1');
      return respostaJson(paginaGenerica(page, 853, 'mg-'));
    }
    if (url.includes('/api/ufs/35')) {
      return respostaJson(UF_SP);
    }
    if (url.includes('/api/ufs/31')) {
      return respostaJson(UF_MG);
    }
    return respostaJson({ message: 'not found' }, { ok: false, status: 404 });
  });
}

describe('BuscarEstado (integração)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('seleciona SP e mostra os agregados e o 1º colocado do ranking (Taboão da Serra)', async () => {
    vi.stubGlobal('fetch', montarFetchMock());

    render(<BuscarEstado />);

    const seletor = await screen.findByLabelText('Estado (UF)');
    fireEvent.change(seletor, { target: { value: '35' } });

    expect(await screen.findByText('São Paulo — SP')).toBeInTheDocument();
    expect(screen.getByText('44.411.238')).toBeInTheDocument();
    expect(screen.getByText('248.219,49 km²')).toBeInTheDocument();
    expect(await screen.findByText('Taboão da Serra')).toBeInTheDocument();
    expect(screen.getByText(/13\.416,96 hab\/km²/)).toBeInTheDocument();
  });

  it('troca de UF (estava na página 3 de MG) reseta o ranking para a página 1 de SP', async () => {
    vi.stubGlobal('fetch', montarFetchMock());

    render(<BuscarEstado />);

    const seletor = await screen.findByLabelText('Estado (UF)');
    fireEvent.change(seletor, { target: { value: '31' } });

    await screen.findByText('mg- Município 1');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(screen.getByText('Página 2 de 43')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(screen.getByText('Página 3 de 43')).toBeInTheDocument());

    fireEvent.change(seletor, { target: { value: '35' } });

    expect(await screen.findByText('Taboão da Serra')).toBeInTheDocument();
    expect(screen.getByText('São Paulo — SP')).toBeInTheDocument();
  });

  it('mostra mensagem de erro amigável quando a API de UFs falha, sem quebrar a tela', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<BuscarEstado />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Buscar estado' })).toBeInTheDocument();
  });
});
