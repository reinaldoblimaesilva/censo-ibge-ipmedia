import { describe, expect, it } from 'vitest';
import { buscarMunicipioPorCodigo, buscarMunicipios } from '../../src/services/municipio.service.js';

describe('municipio.service', () => {
  it('busca "sao paulo" (limite padrão) retorna São Paulo — SP entre outros resultados', () => {
    const resultados = buscarMunicipios('sao paulo');
    const saoPaulo = resultados.find((r) => r.cdMun === '3550308');

    expect(saoPaulo).toBeDefined();
    expect(saoPaulo?.rotulo).toBe('São Paulo — SP');
    expect(resultados.length).toBeGreaterThan(1);
  });

  it('busca "sao domingos" (limite padrão) retorna exatamente 5 resultados em UFs distintas', () => {
    const resultados = buscarMunicipios('sao domingos');

    expect(resultados).toHaveLength(5);
    expect(resultados.every((r) => r.nmMun === 'São Domingos')).toBe(true);
    const ufsDistintas = new Set(resultados.map((r) => r.siglaUf));
    expect(ufsDistintas.size).toBe(5);
  });

  it('busca "sao domingos" com limite maior traz também as variantes com sufixo', () => {
    const resultados = buscarMunicipios('sao domingos', 20);
    expect(resultados).toHaveLength(15);
  });

  it('exclui o registro fantasma cd_mun="." da busca', () => {
    const resultados = buscarMunicipios('a', 5000);
    expect(resultados.some((r) => r.cdMun === '.')).toBe(false);
  });

  it('detalhe de São Paulo/SP (3550308) bate com os valores de referência de data-exploration.md', () => {
    const detalhe = buscarMunicipioPorCodigo('3550308');

    expect(detalhe).not.toBeNull();
    expect(detalhe?.nmMun).toBe('São Paulo');
    expect(detalhe?.siglaUf).toBe('SP');
    expect(detalhe?.populacao).toBe(11_451_999);
    expect(detalhe?.setores).toBe(27_301);
    expect(detalhe?.areaKm2).toBeCloseTo(1521.202, 2);
    expect(detalhe?.densidade).toBeCloseTo(7528.26, 1);
    expect(detalhe?.urbanos).toBe(27_037);
    expect(detalhe?.rurais).toBe(254);
    expect(detalhe?.naoClassificados).toBe(10);
    expect(detalhe?.homens).toBe(5_380_188);
    expect(detalhe?.mulheres).toBe(6_060_887);
    expect(detalhe?.naoInformado).toBe(10_924);
    expect((detalhe?.homens ?? 0) + (detalhe?.mulheres ?? 0) + (detalhe?.naoInformado ?? 0)).toBe(
      detalhe?.populacao,
    );
  });

  it('retorna null para o município fantasma cd_mun="."', () => {
    expect(buscarMunicipioPorCodigo('.')).toBeNull();
  });

  it('retorna null para código de município inexistente', () => {
    expect(buscarMunicipioPorCodigo('0000000')).toBeNull();
  });

  it('trata "_" do termo de busca como caractere literal, não como coringa de 1 posição', () => {
    // Se "_" não fosse escapado, "s_o paulo" casaria com "são paulo" (o "_"
    // do LIKE casa qualquer caractere), trazendo São Paulo/SP no resultado.
    const resultados = buscarMunicipios('s_o paulo');
    expect(resultados.some((r) => r.cdMun === '3550308')).toBe(false);
    expect(resultados).toHaveLength(0);
  });

  it('trata "%" do termo de busca como caractere literal, não como coringa multi-posição', () => {
    // Se "%" não fosse escapado, "sa%o paulo" casaria com "são paulo" (o "%"
    // do LIKE casa qualquer sequência), trazendo São Paulo/SP no resultado.
    const resultados = buscarMunicipios('sa%o paulo');
    expect(resultados.some((r) => r.cdMun === '3550308')).toBe(false);
    expect(resultados).toHaveLength(0);
  });

  it('termo apenas com espaços (normaliza para vazio) retorna lista vazia', () => {
    expect(buscarMunicipios('  ')).toEqual([]);
  });
});
