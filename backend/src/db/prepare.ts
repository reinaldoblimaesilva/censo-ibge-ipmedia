import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { normalizarNome } from '../util/normalizar-nome.js';

/**
 * Mapa estático cd_uf -> sigla (a tabela `uf` original não tem sigla).
 * Ver achado 3 de docs/data-exploration.md.
 */
const SIGLA_POR_UF: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

interface MunicipioAgregadoBruto {
  cd_mun: string;
  nm_mun: string;
  cd_uf: string;
  populacao: number | null;
  setores: number | null;
  area_km2: number | null;
  urbanos: number | null;
  rurais: number | null;
  nao_classificados: number | null;
  homens: number | null;
  mulheres: number | null;
}

interface UfAgregadoBruto {
  cd_uf: string;
  nm_uf: string;
  populacao: number | null;
  area_km2: number | null;
  municipios: number | null;
}

function resolveCaminho(valorEnv: string | undefined, caminhoPadrao: string): string {
  const valor = valorEnv && valorEnv.trim() !== '' ? valorEnv : caminhoPadrao;
  return path.resolve(process.cwd(), valor);
}

export function prepareDatabase(): { municipios: number; ufs: number; preparedPath: string } {
  const sourcePath = resolveCaminho(process.env.CENSO_SOURCE_DB, '../censo.sqlite');
  const preparedPath = resolveCaminho(process.env.CENSO_PREPARED_DB, './data/censo.prepared.sqlite');

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Banco de origem não encontrado em: ${sourcePath}`);
  }

  if (path.resolve(sourcePath) === path.resolve(preparedPath)) {
    throw new Error(
      `CENSO_SOURCE_DB e CENSO_PREPARED_DB apontam para o mesmo arquivo: ${path.resolve(sourcePath)}`,
    );
  }

  fs.mkdirSync(path.dirname(preparedPath), { recursive: true });

  // Remove qualquer preparo anterior (e arquivos auxiliares de journal/wal) antes de recopiar.
  for (const suffixo of ['', '-journal', '-wal', '-shm']) {
    const alvo = `${preparedPath}${suffixo}`;
    if (fs.existsSync(alvo)) {
      fs.rmSync(alvo);
    }
  }

  // Copia o arquivo de origem; o original nunca é aberto em modo de escrita.
  fs.copyFileSync(sourcePath, preparedPath);

  const db = new Database(preparedPath);
  try {
    db.pragma('journal_mode = DELETE');

    db.exec('CREATE INDEX IF NOT EXISTS ix_setor_cd_mun ON setor(cd_mun);');

    db.exec(`
      DROP TABLE IF EXISTS municipio_resumo;
      CREATE TABLE municipio_resumo (
        cd_mun            TEXT PRIMARY KEY,
        nm_mun            TEXT NOT NULL,
        nm_normalizado    TEXT NOT NULL,
        cd_uf             TEXT NOT NULL,
        sigla_uf          TEXT NOT NULL,
        populacao         INTEGER NOT NULL,
        setores           INTEGER NOT NULL,
        area_km2          REAL NOT NULL,
        densidade         REAL NOT NULL,
        urbanos           INTEGER NOT NULL,
        rurais            INTEGER NOT NULL,
        nao_classificados INTEGER NOT NULL,
        homens            INTEGER NOT NULL,
        mulheres          INTEGER NOT NULL,
        nao_informado     INTEGER NOT NULL
      );
      CREATE INDEX ix_municipio_resumo_nome ON municipio_resumo(nm_normalizado);
      CREATE INDEX ix_municipio_resumo_uf_densidade ON municipio_resumo(cd_uf, densidade DESC);

      DROP TABLE IF EXISTS uf_resumo;
      CREATE TABLE uf_resumo (
        cd_uf     TEXT PRIMARY KEY,
        nm_uf     TEXT NOT NULL,
        sigla     TEXT NOT NULL,
        populacao INTEGER NOT NULL,
        area_km2  REAL NOT NULL,
        densidade REAL NOT NULL,
        municipios INTEGER NOT NULL
      );
    `);

    const municipiosBrutos = db
      .prepare(
        `
        SELECT
          m.cd_mun                                                          AS cd_mun,
          m.nm_mun                                                          AS nm_mun,
          m.cd_uf                                                           AS cd_uf,
          COALESCE(SUM(s.populacao), 0)                                     AS populacao,
          COUNT(s.cd_setor)                                                 AS setores,
          COALESCE(SUM(s.area_km2), 0)                                      AS area_km2,
          COALESCE(SUM(CASE WHEN s.situacao = 'Urbana' THEN 1 ELSE 0 END), 0) AS urbanos,
          COALESCE(SUM(CASE WHEN s.situacao = 'Rural' THEN 1 ELSE 0 END), 0)  AS rurais,
          COALESCE(SUM(CASE WHEN s.situacao IS NULL THEN 1 ELSE 0 END), 0)    AS nao_classificados,
          COALESCE(SUM(d.homens), 0)                                        AS homens,
          COALESCE(SUM(d.mulheres), 0)                                      AS mulheres
        FROM municipio m
        LEFT JOIN setor s ON s.cd_mun = m.cd_mun
        LEFT JOIN demografia d ON d.cd_setor = s.cd_setor
        GROUP BY m.cd_mun
      `,
      )
      .all() as MunicipioAgregadoBruto[];

    const insertMunicipio = db.prepare(`
      INSERT INTO municipio_resumo (
        cd_mun, nm_mun, nm_normalizado, cd_uf, sigla_uf,
        populacao, setores, area_km2, densidade,
        urbanos, rurais, nao_classificados,
        homens, mulheres, nao_informado
      ) VALUES (
        @cd_mun, @nm_mun, @nm_normalizado, @cd_uf, @sigla_uf,
        @populacao, @setores, @area_km2, @densidade,
        @urbanos, @rurais, @nao_classificados,
        @homens, @mulheres, @nao_informado
      )
    `);

    const inserirMunicipios = db.transaction((linhas: MunicipioAgregadoBruto[]) => {
      for (const linha of linhas) {
        const populacao = linha.populacao ?? 0;
        const homens = linha.homens ?? 0;
        const mulheres = linha.mulheres ?? 0;
        const naoInformado = populacao - homens - mulheres;
        const areaKm2 = linha.area_km2 ?? 0;
        const densidade = areaKm2 > 0 ? populacao / areaKm2 : 0;

        insertMunicipio.run({
          cd_mun: linha.cd_mun,
          nm_mun: linha.nm_mun,
          nm_normalizado: normalizarNome(linha.nm_mun),
          cd_uf: linha.cd_uf,
          sigla_uf: SIGLA_POR_UF[linha.cd_uf] ?? '??',
          populacao,
          setores: linha.setores ?? 0,
          area_km2: areaKm2,
          densidade,
          urbanos: linha.urbanos ?? 0,
          rurais: linha.rurais ?? 0,
          nao_classificados: linha.nao_classificados ?? 0,
          homens,
          mulheres,
          nao_informado: naoInformado,
        });
      }
    });

    inserirMunicipios(municipiosBrutos);

    // uf_resumo agrega direto de setor x municipio, incluindo cd_mun='.' (lagoas do RS) nos totais.
    const ufsBrutas = db
      .prepare(
        `
        SELECT
          u.cd_uf                                                                   AS cd_uf,
          u.nm_uf                                                                   AS nm_uf,
          COALESCE(SUM(s.populacao), 0)                                             AS populacao,
          COALESCE(SUM(s.area_km2), 0)                                              AS area_km2,
          (SELECT COUNT(*) FROM municipio mm WHERE mm.cd_uf = u.cd_uf AND mm.cd_mun != '.') AS municipios
        FROM uf u
        LEFT JOIN municipio m ON m.cd_uf = u.cd_uf
        LEFT JOIN setor s ON s.cd_mun = m.cd_mun
        GROUP BY u.cd_uf
      `,
      )
      .all() as UfAgregadoBruto[];

    const insertUf = db.prepare(`
      INSERT INTO uf_resumo (cd_uf, nm_uf, sigla, populacao, area_km2, densidade, municipios)
      VALUES (@cd_uf, @nm_uf, @sigla, @populacao, @area_km2, @densidade, @municipios)
    `);

    const inserirUfs = db.transaction((linhas: UfAgregadoBruto[]) => {
      for (const linha of linhas) {
        const populacao = linha.populacao ?? 0;
        const areaKm2 = linha.area_km2 ?? 0;
        const densidade = areaKm2 > 0 ? populacao / areaKm2 : 0;

        insertUf.run({
          cd_uf: linha.cd_uf,
          nm_uf: linha.nm_uf,
          sigla: SIGLA_POR_UF[linha.cd_uf] ?? '??',
          populacao,
          area_km2: areaKm2,
          densidade,
          municipios: linha.municipios ?? 0,
        });
      }
    });

    inserirUfs(ufsBrutas);

    return { municipios: municipiosBrutos.length, ufs: ufsBrutas.length, preparedPath };
  } finally {
    db.close();
  }
}

const executadoDiretamente =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (executadoDiretamente) {
  const resultado = prepareDatabase();
  console.log(
    `Banco preparado em ${resultado.preparedPath} (${resultado.municipios} municípios, ${resultado.ufs} UFs).`,
  );
}
