/**
 * Wrappers finos sobre `fetch` para o contrato já pronto da Story 1
 * (`backend/src/routes/ufs.routes.ts`). Caminhos relativos `/api/...` contam
 * com o proxy de dev do Vite (e, futuramente, com o do nginx da Story 4)
 * para evitar CORS. Nenhum agregado é recalculado aqui — só o que a API já
 * devolve pronto é exibido. Mesmo padrão de erro amigável de
 * `src/api/municipios.ts`.
 */

export interface UfResumo {
  cdUf: string;
  nmUf: string;
  sigla: string;
  populacao: number;
  areaKm2: number;
  densidade: number;
  municipios: number;
}

export interface MunicipioRanking {
  cdMun: string;
  nmMun: string;
  populacao: number;
  areaKm2: number;
  densidade: number;
}

export interface PaginaMunicipios {
  items: MunicipioRanking[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Erro amigável de rede/API, para a UI exibir em vez de quebrar a tela. */
export class UfApiError extends Error {}

const MENSAGEM_ERRO_PADRAO = 'Não foi possível falar com o servidor. Tente novamente em instantes.';

function paraErroAmigavel(erro: unknown): UfApiError {
  if (erro instanceof UfApiError) {
    return erro;
  }
  return new UfApiError(MENSAGEM_ERRO_PADRAO);
}

export async function listarUfs(): Promise<UfResumo[]> {
  try {
    const resposta = await fetch('/api/ufs');

    if (!resposta.ok) {
      throw new UfApiError(MENSAGEM_ERRO_PADRAO);
    }

    return (await resposta.json()) as UfResumo[];
  } catch (erro) {
    throw paraErroAmigavel(erro);
  }
}

export async function buscarUfDetalhe(cdUf: string): Promise<UfResumo | null> {
  try {
    const resposta = await fetch(`/api/ufs/${encodeURIComponent(cdUf)}`);

    if (resposta.status === 404) {
      return null;
    }

    if (!resposta.ok) {
      throw new UfApiError(MENSAGEM_ERRO_PADRAO);
    }

    return (await resposta.json()) as UfResumo;
  } catch (erro) {
    throw paraErroAmigavel(erro);
  }
}

export async function listarMunicipiosPorUf(
  cdUf: string,
  page: number,
  pageSize: number,
): Promise<PaginaMunicipios | null> {
  try {
    const parametros = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const resposta = await fetch(
      `/api/ufs/${encodeURIComponent(cdUf)}/municipios?${parametros.toString()}`,
    );

    if (resposta.status === 404) {
      return null;
    }

    if (!resposta.ok) {
      throw new UfApiError(MENSAGEM_ERRO_PADRAO);
    }

    return (await resposta.json()) as PaginaMunicipios;
  } catch (erro) {
    throw paraErroAmigavel(erro);
  }
}
