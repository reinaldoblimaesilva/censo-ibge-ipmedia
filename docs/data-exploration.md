# Exploração do `censo.sqlite`

Exploração feita antes de codar, para que a spec antecipe os problemas reais do dado.
Todas as consultas abaixo são reproduzíveis com `sqlite3 censo.sqlite`.

## Conferência com as referências do enunciado

| Métrica | Esperado (IBGE) | Obtido | Consulta |
|---|---|---|---|
| População | 203.080.756 | 203.080.756 ✅ | `SELECT SUM(populacao) FROM setor;` |
| Área (km²) | 8.510.417 | 8.510.417,25 ✅ | `SELECT SUM(area_km2) FROM setor;` |
| UFs | 27 | 27 ✅ | `SELECT COUNT(*) FROM uf;` |
| Municípios | 5.570 | **5.571** ⚠️ | `SELECT COUNT(*) FROM municipio;` (ver achado 2) |

## Achados

### 1. Sem índices: joins inviáveis sem preparo
`setor` tem 468.099 linhas e só a PK `cd_setor`. Um `LEFT JOIN municipio × setor` passou de
**2 minutos** sem terminar. Após `CREATE INDEX ix_setor_mun ON setor(cd_mun)` (0,24 s para criar),
o ranking dos 645 municípios de SP roda em **0,04 s**.

**Decisão:** preparar o banco no build da imagem Docker (índices + tabelas agregadas).
O `censo.sqlite` versionado permanece intacto; a API lê uma cópia otimizada.

### 2. Município "fantasma" `('.', '', '43')`
```sql
SELECT * FROM municipio WHERE cd_mun NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
-- ('.', '', '43')
SELECT COUNT(*), SUM(populacao), SUM(area_km2) FROM setor WHERE cd_mun = '.';
-- 2 setores, população 0, 13.085,86 km²  (setores 430000100000000 / 430000200000000: lagoas do RS)
```
Explica 5.571 vs 5.570. **Decisão:** excluir do autocomplete e do ranking (sem nome, densidade 0),
mas **manter a área nos totais** de RS e do Brasil. Sem ela, a área do Brasil não fecha em 8.510.417 km².
Área de RS: 281.707,15 km² com as lagoas, 268.621,29 km² sem elas.

### 3. `uf` não tem sigla
A tabela só tem `cd_uf` e `nm_uf`. O autocomplete precisa exibir a UF (achado 7).
**Decisão:** mapa estático `cd_uf → sigla` (11→RO, 12→AC … 53→DF), materializado no preparo do banco.

### 4. Distribuição por sexo incompleta
```sql
SELECT SUM(moradores), SUM(homens), SUM(mulheres) FROM demografia;
-- 202.561.627 | 98.086.826 | 104.474.699   (≠ 203.080.756 de setor.populacao)
SELECT COUNT(*) FROM setor s LEFT JOIN demografia d USING(cd_setor) WHERE d.cd_setor IS NULL;
-- 9.327 setores sem linha em demografia
-- ~8,7 mil setores com homens/mulheres NULL (sigilo estatístico), somando 519.179 pessoas
```
Afeta 2.219 municípios. Quando presentes, `homens + mulheres = moradores` e `moradores = populacao`.
**Decisão:** a população total vem sempre de `setor.populacao`. A distribuição por sexo exibe
homens, mulheres e **"não informado"** (= população − homens − mulheres), de modo que a soma bate.

### 5. `situacao` nula
```sql
SELECT situacao, COUNT(*) FROM setor GROUP BY 1;
-- Urbana 354.965 | Rural 112.031 | NULL 1.103
```
**Decisão:** terceira categoria "Não classificado".

### 6. Densidade: agregado de agregados
**Decisão:** densidade = `SUM(populacao) / SUM(area_km2)`, nunca `AVG` das densidades dos setores.
Vale para município, UF e Brasil.

### 7. Homônimos, acentos e apóstrofos
```sql
SELECT COUNT(*) FROM (SELECT nm_mun FROM municipio GROUP BY 1 HAVING COUNT(*) > 1);  -- 232 nomes
SELECT nm_mun, cd_uf, COUNT(*) FROM municipio GROUP BY 1,2 HAVING COUNT(*) > 1;      -- nenhum
```
"São Domingos" existe em 5 UFs (PB, SE, BA, SC, GO). Nomes com apóstrofo: `Alta Floresta D'Oeste`.
Não há espaços sobrando.
**Decisão:** exibir "Nome — UF", usar `cd_mun` como chave, e buscar por uma coluna normalizada
(minúsculas, sem acento) para que "sao paulo" encontre "São Paulo". Queries sempre parametrizadas.

### 8. Listas longas
```sql
SELECT cd_uf, COUNT(*) FROM municipio GROUP BY 1 ORDER BY 2 DESC LIMIT 1;  -- 31 (MG): 853
SELECT cd_uf, COUNT(*) FROM municipio GROUP BY 1 ORDER BY 2 ASC  LIMIT 1;  -- 53 (DF): 1
```
A maior UF é **MG (853)**, não SP (645), como sugere o enunciado. RR tem 15.
**Decisão:** ranking paginado no servidor. Autocomplete com mínimo de 2 caracteres, debounce e limite de resultados.

## Valores de referência para testes

| Caso | Valor esperado |
|---|---|
| São Paulo/SP (`3550308`): população | 11.451.999 |
| São Paulo/SP: setores / área | 27.301 setores / 1.521,202 km² |
| São Paulo/SP: densidade | 7.528,26 hab/km² |
| São Paulo/SP: urbanos / rurais / não classificados | 27.037 / 254 / 10 |
| São Paulo/SP: homens / mulheres / não informado | 5.380.188 / 6.060.887 / 10.924 |
| SP (UF 35): municípios / população / área | 645 / 44.411.238 / 248.219,49 km² |
| SP: 1º no ranking de densidade | Taboão da Serra (13.416,96 hab/km², também 1º do Brasil) |
| Menor densidade do Brasil | Barcelos/AM (0,1538 hab/km²) |
| RS (UF 43): população / área | 10.882.965 / 281.707,15 km² (com lagoas) |
| RR: municípios | 15 |
| Busca "São Domingos" | 5 resultados, UFs distintas |
