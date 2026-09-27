/**
 * Roda o preparo do banco (índice + agregados) uma única vez, antes de toda a
 * suíte, contra o `censo.sqlite` real da raiz. Os testes de service/rota abrem
 * a cópia preparada resultante através de `src/db/connection.ts`.
 */
export default async function globalSetup(): Promise<void> {
  const { prepareDatabase } = await import('../src/db/prepare.js');
  prepareDatabase();
}
