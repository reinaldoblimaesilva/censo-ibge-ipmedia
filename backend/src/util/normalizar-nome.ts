/**
 * Normaliza um nome/termo para comparação insensível a acento/caixa:
 * decompõe (NFD), remove os diacríticos combinantes e passa para minúsculas.
 */
export function normalizarNome(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
