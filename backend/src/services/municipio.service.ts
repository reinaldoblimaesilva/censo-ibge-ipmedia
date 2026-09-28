import { getDb } from '../db/connection.js';
import { normalizarNome } from '../util/normalizar-nome.js';

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

/**
 * Busca municípios por nome (insensível a acento/caixa), excluindo o registro
 * fantasma `cd_mun = '.'`. Chave de retorno é `cd_mun`; exibição "Nome — UF".
 *
 * Ordena por relevância: nomes que COMEÇAM com o termo vêm antes dos que
 * apenas o CONTÊM, cada grupo em ordem alfabética — assim "ub" traz Ubatuba
 * entre os primeiros resultados em vez de ficar atrás de Abaetetuba,
 * Anajatuba etc. (que só contêm "ub"). Correspondências exatas (ex.: "São
 * Domingos") caem no grupo "começa com" e, por serem sempre mais curtas que
 * variantes com sufixo (ex.: "São Domingos do Prata"), a ordenação
 * alfabética já as posiciona antes dentro do próprio grupo. O limite padrão
 * é pequeno (5) — o mesmo comportamento de autocomplete que faz "sao
 * domingos" devolver os 5 homônimos exatos (um por UF) sem que as variantes
 * com sufixo entrem na página, e "sao paulo" devolver São Paulo/SP entre
 * outras cidades cujo nome também contém o termo.
 */
export function buscarMunicipios(termo: string, limite = 5): MunicipioResultadoBusca[] {
  const termoNormalizado = normalizarNome(termo.trim());

  if (termoNormalizado === '') {
    return [];
  }

  const db = getDb();
  const padraoEscapado = termoNormalizado.replace(/[\\%_]/g, (c) => `\\${c}`);

  const linhas = db
    .prepare(
      `
      SELECT cd_mun AS cdMun, nm_mun AS nmMun, sigla_uf AS siglaUf
      FROM municipio_resumo
      WHERE cd_mun != '.' AND nm_normalizado LIKE @padrao ESCAPE '\\'
      ORDER BY
        CASE WHEN nm_normalizado LIKE @padraoInicio ESCAPE '\\' THEN 0 ELSE 1 END ASC,
        nm_mun ASC,
        sigla_uf ASC
      LIMIT @limite
    `,
    )
    .all({
      padrao: `%${padraoEscapado}%`,
      padraoInicio: `${padraoEscapado}%`,
      limite,
    }) as { cdMun: string; nmMun: string; siglaUf: string }[];

  return linhas.map((linha) => ({
    ...linha,
    rotulo: `${linha.nmMun} — ${linha.siglaUf}`,
  }));
}

/**
 * Agregados de um município a partir de `municipio_resumo`.
 * Retorna `null` para o registro fantasma `.` ou código inexistente (404 na rota).
 */
export function buscarMunicipioPorCodigo(cdMun: string): MunicipioDetalhe | null {
  if (cdMun === '.') {
    return null;
  }

  const db = getDb();
  const linha = db
    .prepare(
      `
      SELECT
        cd_mun AS cdMun, nm_mun AS nmMun, cd_uf AS cdUf, sigla_uf AS siglaUf,
        populacao, setores, area_km2 AS areaKm2, densidade,
        urbanos, rurais, nao_classificados AS naoClassificados,
        homens, mulheres, nao_informado AS naoInformado
      FROM municipio_resumo
      WHERE cd_mun = @cdMun
    `,
    )
    .get({ cdMun }) as MunicipioDetalhe | undefined;

  return linha ?? null;
}
