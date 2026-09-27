import { getDb } from '../db/connection.js';

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

export function listarUfs(): UfResumo[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT cd_uf AS cdUf, nm_uf AS nmUf, sigla, populacao, area_km2 AS areaKm2, densidade, municipios
      FROM uf_resumo
      ORDER BY nm_uf ASC
    `,
    )
    .all() as UfResumo[];
}

export function buscarUfPorCodigo(cdUf: string): UfResumo | null {
  const db = getDb();
  const linha = db
    .prepare(
      `
      SELECT cd_uf AS cdUf, nm_uf AS nmUf, sigla, populacao, area_km2 AS areaKm2, densidade, municipios
      FROM uf_resumo
      WHERE cd_uf = @cdUf
    `,
    )
    .get({ cdUf }) as UfResumo | undefined;

  return linha ?? null;
}

/**
 * Ranking paginado de municípios de uma UF por densidade decrescente.
 * `cd_mun = '.'` fica fora do ranking (sem nome, densidade 0).
 */
export function listarMunicipiosPorUf(
  cdUf: string,
  page = 1,
  pageSize = 20,
): PaginaMunicipios | null {
  const db = getDb();
  const uf = buscarUfPorCodigo(cdUf);
  if (!uf) {
    return null;
  }

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM municipio_resumo WHERE cd_uf = @cdUf AND cd_mun != '.'`)
    .get({ cdUf }) as { total: number };

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const items = db
    .prepare(
      `
      SELECT cd_mun AS cdMun, nm_mun AS nmMun, populacao, area_km2 AS areaKm2, densidade
      FROM municipio_resumo
      WHERE cd_uf = @cdUf AND cd_mun != '.'
      ORDER BY densidade DESC
      LIMIT @pageSize OFFSET @offset
    `,
    )
    .all({ cdUf, pageSize, offset }) as MunicipioRanking[];

  return { items, page, pageSize, total, totalPages };
}
