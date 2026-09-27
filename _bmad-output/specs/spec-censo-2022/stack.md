# Stack decidida

## Back-end

- Node.js + TypeScript.
- Fastify como framework HTTP.
- `better-sqlite3` como driver, sem ORM: SQL explícito e sempre parametrizado.
- Validação de entrada em toda rota via schema do Fastify.

## Front-end

- React + Vite + TypeScript.
- Tailwind CSS para estilo.

## Testes

- Vitest no back-end e no front-end.
- Testing Library no front-end (componentes das telas "Buscar cidade" e "Buscar estado").
- Playwright para os testes E2E — ao menos um por tela.

## Docker

- Build multi-stage (uma stage compila back e front, imagem final só roda).
- Front servido por nginx.
- nginx faz proxy de `/api` para a API do back-end — evita CORS, um único host exposto.
- `docker compose up --build` sobe front + back numa máquina limpa, sem passo manual.

## Schema original de `censo.sqlite`

Arquivo cru (35,2 MB), fora as PKs sem índice, coluna derivada, tabela agregada ou view:

```sql
CREATE TABLE uf(
  cd_uf TEXT PRIMARY KEY,
  nm_uf TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE municipio(
  cd_mun TEXT PRIMARY KEY,
  nm_mun TEXT NOT NULL,
  cd_uf  TEXT NOT NULL REFERENCES uf(cd_uf)
) WITHOUT ROWID;

CREATE TABLE setor(
  cd_setor  TEXT PRIMARY KEY,   -- setor censitario, 15 digitos
  cd_mun    TEXT NOT NULL REFERENCES municipio(cd_mun),
  situacao  TEXT,               -- 'Urbana', 'Rural' ou nulo
  area_km2  REAL,               -- area do setor em km2
  populacao INTEGER             -- populacao residente no setor
) WITHOUT ROWID;

CREATE TABLE demografia(
  cd_setor  TEXT PRIMARY KEY REFERENCES setor(cd_setor),
  moradores INTEGER,
  homens    INTEGER,
  mulheres  INTEGER
) WITHOUT ROWID;
```

| Tabela | Linhas |
| --- | --- |
| `uf` | 27 |
| `municipio` | 5.571 |
| `setor` | 468.099 |
| `demografia` | 458.772 |

## Preparo do banco (parte do build da imagem)

Executado uma vez, no build, não em runtime:

1. Copiar `censo.sqlite` (o arquivo versionado na raiz permanece intacto).
2. Criar índice em `setor(cd_mun)` — sem ele, o join `setor × municipio` não termina em tempo
   viável (ver achado 1 de `data-exploration.md`).
3. Criar tabelas agregadas: resumo por município (população, setores, área, densidade,
   urbanos/rurais/não classificados, sexo) e resumo por UF (população, área, densidade).
4. Materializar o mapa estático `cd_uf → sigla` (a tabela `uf` não tem sigla).
5. Adicionar coluna/tabela de nome normalizado (minúsculas, sem acento) para a busca por
   município.

A API abre a cópia preparada em modo somente leitura.
