import { describe, expect, it } from 'vitest';
import { buscarUfPorCodigo, listarMunicipiosPorUf, listarUfs } from '../../src/services/uf.service.js';

describe('uf.service', () => {
  it('lista as 27 UFs', () => {
    expect(listarUfs()).toHaveLength(27);
  });

  it('SP (35): 645 municípios, população e área de referência', () => {
    const sp = buscarUfPorCodigo('35');

    expect(sp).not.toBeNull();
    expect(sp?.sigla).toBe('SP');
    expect(sp?.municipios).toBe(645);
    expect(sp?.populacao).toBe(44_411_238);
    expect(sp?.areaKm2).toBeCloseTo(248_219.49, 1);
  });

  it('Taboão da Serra é o 1º no ranking de densidade de SP', () => {
    const pagina = listarMunicipiosPorUf('35', 1, 5);

    expect(pagina).not.toBeNull();
    expect(pagina?.items[0]?.nmMun).toBe('Taboão da Serra');
    expect(pagina?.items[0]?.densidade).toBeCloseTo(13_416.96, 1);
  });

  it('RS (43): população e área incluem as lagoas sem nome (cd_mun=".")', () => {
    const rs = buscarUfPorCodigo('43');

    expect(rs).not.toBeNull();
    expect(rs?.populacao).toBe(10_882_965);
    expect(rs?.areaKm2).toBeCloseTo(281_707.15, 1);
  });

  it('RR (14): 15 municípios em uma única página', () => {
    const pagina = listarMunicipiosPorUf('14', 1, 20);

    expect(pagina).not.toBeNull();
    expect(pagina?.total).toBe(15);
    expect(pagina?.items).toHaveLength(15);
    expect(pagina?.totalPages).toBe(1);
  });

  it('MG (31): 853 municípios, página parcial com metadados de total/páginas', () => {
    const pagina = listarMunicipiosPorUf('31', 1, 20);

    expect(pagina).not.toBeNull();
    expect(pagina?.total).toBe(853);
    expect(pagina?.items).toHaveLength(20);
    expect(pagina?.totalPages).toBe(43);
  });

  it('UF inexistente retorna null (404 na rota)', () => {
    expect(buscarUfPorCodigo('99')).toBeNull();
    expect(listarMunicipiosPorUf('99', 1, 20)).toBeNull();
  });
});
