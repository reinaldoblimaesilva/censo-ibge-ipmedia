/**
 * Formatadores compartilhados por `AgregadosUf` e `RankingMunicipios` — só
 * formatação de exibição, nenhum cálculo sobre os valores que a API já
 * devolve prontos.
 */
export const formatadorInteiro = new Intl.NumberFormat('pt-BR');

export const formatadorArea = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatadorDensidade = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
