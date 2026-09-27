import path from 'node:path';
import Database from 'better-sqlite3';

let instancia: Database.Database | undefined;

function resolvePreparedDbPath(): string {
  const valorEnv = process.env.CENSO_PREPARED_DB;
  const caminhoPadrao = './data/censo.prepared.sqlite';
  const valor = valorEnv && valorEnv.trim() !== '' ? valorEnv : caminhoPadrao;
  return path.resolve(process.cwd(), valor);
}

/**
 * Abre (uma única vez) a cópia preparada do banco em modo somente leitura.
 * O `censo.sqlite` original da raiz nunca é referenciado aqui.
 */
export function getDb(): Database.Database {
  if (!instancia) {
    const dbPath = resolvePreparedDbPath();
    instancia = new Database(dbPath, { readonly: true, fileMustExist: true });
  }
  return instancia;
}

export function fecharDb(): void {
  if (instancia) {
    instancia.close();
    instancia = undefined;
  }
}
