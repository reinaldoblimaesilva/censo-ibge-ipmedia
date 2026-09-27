---
title: 'Tela Buscar cidade'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b21a4b74bc45c46f5375ee750c8a12ee428cf783'
context:
  - '{project-root}/_bmad-output/specs/spec-censo-2022/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/stack.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Não existe front-end; a Story 1 só entregou a API. Não há como um usuário buscar um município e ver seus agregados.

**Approach:** Criar o projeto `frontend/` (React + Vite + TypeScript + Tailwind CSS) com a tela "Buscar cidade": um campo de busca com autocomplete debounced que consome `GET /api/municipios`, e uma área de agregados que consome `GET /api/municipios/:cdMun` ao selecionar um resultado. O front nunca recalcula agregado nenhum — só exibe o que a API já devolve pronto.

## Boundaries & Constraints

**Always:** Exibição do autocomplete usa o campo `rotulo` já formatado "Nome — UF" que a API devolve; busca só dispara com 2+ caracteres (a API rejeita menos com 400); chamadas usam caminho relativo `/api/...` (compatível com o proxy de dev do Vite e, mais tarde, com o proxy do nginx da Story 4 — sem CORS); erro de rede/API mostra mensagem amigável em vez de quebrar a tela.

**Never:** Sem tela "Buscar estado" nem navegação entre telas (Story 3). Sem Docker/nginx (Story 4 — dev roda via Vite). Sem recalcular densidade/agregados no front. Sem gerenciador de estado externo (Redux/Zustand) — `useState`/`useEffect` bastam para uma tela.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Busca válida | Usuário digita "sao paulo" | Após debounce, lista mostra "São Paulo — SP" entre os resultados | N/A |
| Seleção de resultado | Usuário clica em "São Paulo — SP" | Mostra: população 11.451.999, 27.301 setores, área 1.521,202 km², densidade 7.528,26 hab/km², urbanos 27.037 / rurais 254 / não classificados 10, homens 5.380.188 / mulheres 6.060.887 / não informado 10.924 | N/A |
| Busca de homônimo | Usuário digita "sao domingos" | Lista com 5 resultados, um por UF distinta, distinguíveis pelo rótulo "São Domingos — <UF>" | N/A |
| Texto curto | Usuário digita 1 caractere | Nenhuma chamada à API é disparada | N/A |
| Sem resultado | Termo sem município correspondente | Lista vazia com mensagem "nenhum município encontrado" | N/A |
| Falha da API | `GET /api/municipios` ou `/api/municipios/:cdMun` falha (rede ou 5xx) | Mensagem de erro amigável no lugar da lista/agregados, tela não quebra | Captura o erro, não deixa promise rejeitada sem tratamento |

</frozen-after-approval>

## Code Map

Greenfield — não há front-end ainda. Back-end (Story 1, já testado) fica intocado:

- `backend/src/routes/municipios.routes.ts` -- contrato já pronto: `GET /api/municipios?q=&limit=` devolve `{cdMun,nmMun,siglaUf,rotulo}[]`; `GET /api/municipios/:cdMun` devolve `{cdMun,nmMun,cdUf,siglaUf,populacao,setores,areaKm2,densidade,urbanos,rurais,naoClassificados,homens,mulheres,naoInformado}` ou 404 -- **consumir, não modificar**
- `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js` -- projeto novo (React + Vite + TS + Tailwind + Vitest + Testing Library + Playwright); `vite.config.ts` propõe `/api` para `http://localhost:3000` no dev server (evita CORS em dev, mesmo padrão do proxy do nginx da Story 4)
- `frontend/src/api/municipios.ts` -- `buscarMunicipios(q, limit)` e `buscarMunicipioDetalhe(cdMun)`, wrappers finos de `fetch('/api/...')`
- `frontend/src/hooks/useDebouncedValue.ts` -- hook genérico de debounce para o campo de busca
- `frontend/src/features/buscar-cidade/AutocompleteMunicipio.tsx` -- input + lista de sugestões (usa `rotulo` da API, dispara só com 2+ chars)
- `frontend/src/features/buscar-cidade/AgregadosMunicipio.tsx` -- exibe os agregados de um município selecionado
- `frontend/src/features/buscar-cidade/BuscarCidade.tsx` -- tela que compõe os dois acima, guarda o `cdMun` selecionado
- `frontend/src/App.tsx` -- renderiza `<BuscarCidade />` diretamente (Story 3 adiciona navegação entre as duas telas)
- `frontend/src/**/*.test.tsx` -- Vitest + Testing Library, mocking `global.fetch`
- `frontend/e2e/buscar-cidade.spec.ts` + `frontend/playwright.config.ts` -- E2E real, subindo back-end (`db:prepare` + `dev`) e front-end (`vite dev`) via `webServer` do Playwright

## Tasks & Acceptance

**Execution:**
- [x] `frontend/package.json` + configs (`vite.config.ts` com proxy, `tsconfig.json`, `tailwind.config.js`) -- scaffold do projeto
- [x] `frontend/src/api/municipios.ts` -- chamadas tipadas à API da Story 1
- [x] `frontend/src/hooks/useDebouncedValue.ts` -- debounce do termo de busca
- [x] `frontend/src/features/buscar-cidade/AutocompleteMunicipio.tsx` -- input + lista, usa `rotulo`
- [x] `frontend/src/features/buscar-cidade/AgregadosMunicipio.tsx` -- exibição dos agregados
- [x] `frontend/src/features/buscar-cidade/BuscarCidade.tsx` + `App.tsx` -- compõe a tela
- [x] `frontend/src/features/buscar-cidade/*.test.tsx` -- cobre os cenários da matriz (busca, seleção, homônimo, erro)
- [x] `frontend/e2e/buscar-cidade.spec.ts` + `playwright.config.ts` -- E2E ponta a ponta contra front+back reais

**Acceptance Criteria:**
- Given a tela carregada, when o usuário digita "sao paulo" e seleciona "São Paulo — SP", then os agregados exibidos batem com os valores de referência do I/O matrix.
- Given a API fora do ar, when a busca ou o detalhe falham, then a tela mostra uma mensagem de erro em vez de travar ou quebrar.
- Given `npm run dev` no backend e no frontend, when o E2E roda, then ele passa contra a aplicação real (sem mocks).

## Implementation Notes

- Stack instalada na data da implementação (2026-09): `react@19.2.8` + `vite@8.3.1` +
  `typescript@6.0.2` (scaffold `create-vite@9` react-ts). `tailwindcss@3.4.19` foi escolhido em vez
  do v4 que o scaffold traria por padrão -- v3 usa `tailwind.config.js` + `postcss.config.js`
  clássicos, batendo literalmente com o Code Map, sem a plumbing extra de `@config` que o CSS-first
  do v4 exigiria para o mesmo arquivo ter efeito. Testes: `vitest@5.0.2` + `@testing-library/react@16`
  + `@testing-library/jest-dom@7` + `@testing-library/user-event@14` + `@playwright/test@1.63`.
- `vite.config.ts` não usa o modo `globals` do Vitest -- os testes importam `describe/it/expect/vi`
  explicitamente de `'vitest'`. A limpeza do DOM entre testes (`cleanup()` do Testing Library) e os
  matchers do `jest-dom` ficam centralizados em `src/test/setup.ts`, que registra `afterEach(cleanup)`
  ele mesmo em vez de exigir isso em cada arquivo de teste.
- Debounce testado com fake timers do Vitest (`vi.advanceTimersByTimeAsync`), como o Design Notes da
  story pede. Achado durante a implementação: `findBy*`/`waitFor` do Testing Library fazem polling
  com `setTimeout`, que também fica "congelado" enquanto os fake timers estão ativos -- por isso, no
  teste de integração (`BuscarCidade.test.tsx`) que seleciona um resultado e espera os agregados
  chegarem por uma promise sem temporizador, o teste chama `vi.useRealTimers()` logo após o clique,
  antes de usar `findByText`. Cliques nos testes usam `fireEvent.click` (não `userEvent.click`)
  pelo mesmo motivo: o `userEvent` agenda os próprios timers internos mesmo com `delay: null`, o que
  trava sob fake timers.
- `MunicipioApiError` (em `src/api/municipios.ts`) uniformiza qualquer falha -- rede, 5xx, ou
  qualquer resposta não-2xx -- numa mensagem amigável única; `buscarMunicipioDetalhe` trata 404
  separadamente, devolvendo `null` (distinto de erro de rede/servidor), e `AgregadosMunicipio` exibe
  "Município não encontrado." nesse caso.
- Ambiente de execução sem acesso a `sudo`: `npx playwright install --with-deps` falhou (pede root
  para instalar dependências de sistema do Chromium); `npx playwright install chromium` (sem
  `--with-deps`) funcionou e a suíte E2E rodou normalmente contra o Chromium baixado.
- Verificado ponta a ponta: `npm test` (13/13), `npm run build` (`tsc -b` nos três projetos --
  app/node/e2e -- sem erro de tipo, depois `vite build`), e `npx playwright test` (4/4) contra o
  backend real (`db:prepare` + `dev`) e o front real (`vite dev`) subidos pelo `webServer` do
  Playwright -- os agregados de São Paulo/SP e os 5 homônimos de "São Domingos" batem exatamente com
  os valores de referência do I/O matrix.
- Não implementado: nada da tela "Buscar estado" nem navegação entre telas (fora do escopo desta
  story, por `Boundaries & Constraints`); Docker/nginx para o front (Story 4).

## Spec Change Log

## Review Triage Log

Camadas rodadas: blind-hunter, edge-case-hunter, verification-gap (todas ativas, nenhuma pulada).

- **[patch/high]** Selecionar um resultado dispara uma rebusca fantasma ~300ms depois — as três camadas convergiram no mesmo achado (`AutocompleteMunicipio.tsx`). `selecionar()` faz `setTermo(municipio.rotulo)` (ex. "São Paulo — SP"), que realimenta `useDebouncedValue`; quando o debounce de 300ms termina, o `useEffect` principal dispara de novo com esse rótulo como termo de busca, mostrando "nenhum município encontrado" (ou reabrindo a lista) bem embaixo do agregado que acabou de aparecer. 100% reprodutível em toda seleção bem-sucedida — justamente o fluxo central da story — e nenhum teste avança tempo suficiente depois do clique para pegar isso. Fix: guardar que a próxima mudança de `termoDebounced` veio de uma seleção programática (não de digitação do usuário) e pular a rebusca nesse caso; adicionar teste que avança 300ms+ após a seleção e confirma que a lista/mensagem de "não encontrado" continuam ausentes.
- **[patch/low]** Nenhum teste verifica o debounce em si — blind-hunter. Todo teste avança direto 500ms antes de checar; nenhum confirma que `fetch` não é chamado imediatamente após a tecla, antes do debounce terminar. Uma regressão que removesse o debounce por completo não seria pega. Fix: teste que digita e checa `fetch` não chamado antes de avançar o tempo.
- **[patch/low]** Guard de corrida `idBuscaAtual` (evita que uma resposta antiga sobrescreva uma mais nova) não tem teste direto — blind-hunter. Fix: teste com duas buscas em sequência onde a mais antiga resolve depois da mais nova, confirmando que o resultado final é o da busca mais nova.
- **[patch/low]** `@vitest/ui` instalado como devDependency mas nunca usado (nenhum script `--ui`, nenhuma referência no código) — blind-hunter, verificado. Fix: remover a dependência não usada.
- **[low, rejeitado]** Sem navegação por teclado no combobox (setas, `aria-activedescendant`, Enter, Escape) — blind-hunter. Real, mas não prometido em nenhum Always/Never da story; fix exigiria bem mais que correção direta (gestão de foco completa). Fora do escopo desta story dado o prazo; registrado como polish futuro, não acionado.
- **[low, rejeitado]** Sem fechar a lista ao clicar fora / perder foco — blind-hunter. Mesma razão do item de teclado: real, mas fix não-trivial e não coberto por nenhum Always/Never; não acionado.
- **[false]** Todas as falhas caem na mesma mensagem genérica, sem `console.error` — blind-hunter. Verificado: bate exatamente com o Always da story ("erro de rede/API mostra mensagem amigável", no singular) — é o design pedido, não um desvio. Sem log de debug é uma omissão opcional, não um defeito.
- **[low, rejeitado]** Sem `AbortController`/timeout — uma requisição travada deixa "Buscando..."/"Carregando agregados..." para sempre — blind-hunter. Real, mas improvável no contexto avaliado (Docker local, backend já comprovadamente rápido) e o fix é substancial (cancelamento + timeout + retry). Registrado como melhoria futura de robustez, não acionado agora.
- **[low, rejeitado]** Proxy do Vite hardcoded para `http://localhost:3000`, sem override por env var — blind-hunter. Sem impacto no caminho avaliado (Docker/nginx da Story 4 assume o proxy em produção); fix adicionaria plumbing de configuração sem necessidade demonstrada. Não acionado.
- **[low, rejeitado]** Acessibilidade do listbox incompleta (`<li>` sem `role="presentation"`, `aria-selected` fixo em `"false"`) — blind-hunter. Mesma linha do item de teclado: real, mas correção completa é bem mais que direta e não exigida pela story. Não acionado.
- **[low, rejeitado]** E2E usa `page.waitForTimeout(500)` em vez de sinal determinístico — blind-hunter. Padrão pragmático aceitável para afirmar "nada aconteceu" quando não há requisição para interceptar; reescrever exigiria reestruturar a asserção do teste. Não acionado.
- **[false]** Versões de dependência "longe demais do esperado", lockfile poderia não reproduzir — blind-hunter. Refutado: já rodei de forma independente `npm test`, `npm run build` e `npx playwright test` contra o `package-lock.json` real committed, todos verdes — o lockfile reproduz normalmente.
- **[nota, não é finding de nenhuma camada]** Ao investigar o achado de dependência não usada, rodei `npm run lint` (nenhuma camada tinha rodado isso) e encontrei 2 warnings `react(set-state-in-effect)` em `AutocompleteMunicipio.tsx`/`AgregadosMunicipio.tsx` — padrão legítimo de fetch-em-effect, não um defeito real; não vale reestruturar os componentes por causa disso. Adicionado `npm run lint` à seção `## Verification` da story para não passar batido de novo.

## Design Notes

`App.tsx` renderiza só `<BuscarCidade />` por enquanto — a Story 3 decide como as duas telas convivem (abas, rotas, etc.), não esta story.

Testes de componente mockam `global.fetch` diretamente (sem MSW) para manter a dependência mínima; usam fake timers do Vitest para controlar o debounce de forma determinística.

## Verification

**Commands:**
- `cd frontend && npm test` -- expected: todos os testes de componente passam, cobrindo a matriz de I/O
- `cd frontend && npx playwright test` -- expected: E2E passa contra back-end (`npm run db:prepare && npm run dev` em `backend/`) e front-end reais
- `cd frontend && npm run build` -- expected: build de produção sem erro de tipo
- `cd frontend && npm run lint` -- expected: sem warnings/erros (`oxlint`)
