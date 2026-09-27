/**
 * Wrappers finos sobre `fetch` para o contrato já pronto da Story 1
 * (`backend/src/routes/municipios.routes.ts`). Caminhos relativos `/api/...`
 * contam com o proxy de dev do Vite (e, futuramente, com o do nginx da
 * Story 4) para evitar CORS. Nenhum agregado é recalculado aqui — só o que a
 * API já devolve pronto é exibido.
 */

export interface MunicipioResultadoBusca {
  cdMun: string;
  nmMun: string;
  siglaUf: string;
  rotulo: string;
}

export interface MunicipioDetalhe {
  cdMun: string;
  nmMun: string;
  cdUf: string;
  siglaUf: string;
  populacao: number;
  setores: number;
  areaKm2: number;
  densidade: number;
  urbanos: number;
  rurais: number;
  naoClassificados: number;
  homens: number;
  mulheres: number;
  naoInformado: number;
}

/** Erro amigável de rede/API, para a UI exibir em vez de quebrar a tela. */
export class MunicipioApiError extends Error {}

const MENSAGEM_ERRO_PADRAO = 'Não foi possível falar com o servidor. Tente novamente em instantes.';

function paraErroAmigavel(erro: unknown): MunicipioApiError {
  if (erro instanceof MunicipioApiError) {
    return erro;
  }
  return new MunicipioApiError(MENSAGEM_ERRO_PADRAO);
}

export async function buscarMunicipios(
  q: string,
  limit?: number,
): Promise<MunicipioResultadoBusca[]> {
  try {
    const parametros = new URLSearchParams({ q });
    if (limit !== undefined) {
      parametros.set('limit', String(limit));
    }

    const resposta = await fetch(`/api/municipios?${parametros.toString()}`);

    if (!resposta.ok) {
      throw new MunicipioApiError(MENSAGEM_ERRO_PADRAO);
    }

    return (await resposta.json()) as MunicipioResultadoBusca[];
  } catch (erro) {
    throw paraErroAmigavel(erro);
  }
}

export async function buscarMunicipioDetalhe(cdMun: string): Promise<MunicipioDetalhe | null> {
  try {
    const resposta = await fetch(`/api/municipios/${encodeURIComponent(cdMun)}`);

    if (resposta.status === 404) {
      return null;
    }

    if (!resposta.ok) {
      throw new MunicipioApiError(MENSAGEM_ERRO_PADRAO);
    }

    return (await resposta.json()) as MunicipioDetalhe;
  } catch (erro) {
    throw paraErroAmigavel(erro);
  }
}
