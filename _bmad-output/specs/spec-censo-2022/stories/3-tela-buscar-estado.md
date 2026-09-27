---
title: 'Tela Buscar estado'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '3266a9766db05b3aa4f2a5ac12f8868c07e7929d'
context:
  - '{project-root}/_bmad-output/specs/spec-censo-2022/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/stack.md'
  - '{project-root}/_bmad-output/specs/spec-censo-2022/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Só existe a tela "Buscar cidade" (Story 2); não há como ver os agregados de uma UF nem o ranking de municípios por densidade. `App.tsx` também só renderiza uma tela — a Story 2 deixou a navegação entre as duas para esta story.

**Approach:** Criar a tela "Buscar estado": um seletor de UF (alimentado por `GET /api/ufs`) que, ao escolher uma UF, mostra os agregados dela e o ranking paginado de municípios por densidade decrescente (`GET /api/ufs/:cdUf` e `GET /api/ufs/:cdUf/municipios`). Adicionar uma navegação simples (abas com `useState`, sem router) em `App.tsx` para alternar entre as duas telas. Nenhum agregado é recalculado no front.

## Boundaries & Constraints

**Always:** Mostra população total, área total e densidade da UF; ranking ordenado por densidade decrescente, paginado no servidor (`page`/`pageSize` já existentes); trocar de UF reseta a paginação para a página 1; controles de paginação somem quando `totalPages <= 1` (RR, DF); chamadas usam `/api/...` relativo; erro de rede/API mostra mensagem amigável, tela não quebra (mesmo padrão da Story 2).

**Never:** Sem React Router nem lib de state externa — `useState` chega para abas e paginação. Sem recalcular densidade/população/paginação no front. Sem alterar as rotas do back-end (Story 1, já testadas). Sem Docker/nginx (Story 4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seleção de UF | Usuário escolhe "SP" no seletor | Mostra população 44.411.238, área 248.219,49 km², e página 1 do ranking com Taboão da Serra em 1º (13.416,96 hab/km²) | N/A |
| UF grande, próxima página | UF = MG (853 municípios, 43 páginas de 20), clica "próxima" | Página 2 mostra os próximos 20 municípios, mantendo ordem de densidade decrescente global | N/A |
| UF pequena | UF = RR (15 municípios) ou DF (1 município) | Ranking mostra todos os municípios numa página só, sem nenhum controle de paginação visível | N/A |
| Troca de UF | Usuário estava na página 3 de MG e troca para SP | Ranking de SP recomeça na página 1 | N/A |
| Navegação entre telas | Usuário clica na aba "Buscar estado" (ou volta para "Buscar cidade") | A tela correspondente é exibida; a outra fica oculta | N/A |
| Falha da API | Qualquer chamada de `/api/ufs*` falha (rede ou 5xx) | Mensagem de erro amigável no lugar dos agregados/ranking, tela não quebra | Captura o erro, não deixa promise rejeitada sem tratamento |

</frozen-after-approval>

## Code Map

- `backend/src/routes/ufs.routes.ts` -- contrato já pronto: `GET /api/ufs` → `{cdUf,nmUf,sigla,populacao,areaKm2,densidade,municipios}[]`; `GET /api/ufs/:cdUf` → mesmo shape singular ou 404; `GET /api/ufs/:cdUf/municipios?page=&pageSize=` → `{items:[{cdMun,nmMun,populacao,areaKm2,densidade}],page,pageSize,total,totalPages}` -- **consumir, não modificar**
- `frontend/src/features/buscar-cidade/*` (Story 2) -- padrão já estabelecido de wrapper de API + componente + testes com `fetch` mockado -- replicar a mesma forma para UF
- `frontend/src/App.tsx` -- hoje só renderiza `<BuscarCidade />`; passa a ter duas abas ("Buscar cidade" / "Buscar estado") com `useState`, cada uma renderizando sua tela só quando ativa
- `frontend/src/api/ufs.ts` (novo) -- `listarUfs()`, `buscarUfDetalhe(cdUf)`, `listarMunicipiosPorUf(cdUf, page, pageSize)`, mesmo padrão de erro amigável de `src/api/municipios.ts`
- `frontend/src/features/buscar-estado/SeletorUf.tsx` (novo) -- `<select>` alimentado por `listarUfs()`
- `frontend/src/features/buscar-estado/AgregadosUf.tsx` (novo) -- população/área/densidade da UF selecionada
- `frontend/src/features/buscar-estado/RankingMunicipios.tsx` (novo) -- lista paginada + controles (anterior/próxima), ocultos quando `totalPages <= 1`
- `frontend/src/features/buscar-estado/BuscarEstado.tsx` (novo) -- compõe os três acima; reseta `page` para 1 quando `cdUf` muda
- `frontend/e2e/buscar-estado.spec.ts` + reaproveita `frontend/playwright.config.ts` (Story 2, `webServer` já sobe back+front) -- E2E real

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/api/ufs.ts` -- chamadas tipadas às rotas de UF da Story 1
- [x] `frontend/src/features/buscar-estado/SeletorUf.tsx` -- seletor de UF
- [x] `frontend/src/features/buscar-estado/AgregadosUf.tsx` -- agregados da UF
- [x] `frontend/src/features/buscar-estado/RankingMunicipios.tsx` -- ranking paginado, sem paginação supérflua
- [x] `frontend/src/features/buscar-estado/BuscarEstado.tsx` -- compõe a tela, reseta página ao trocar de UF
- [x] `frontend/src/App.tsx` -- abas simples entre as duas telas
- [x] `frontend/src/features/buscar-estado/*.test.tsx` -- cobre a matriz de I/O (seleção, paginação MG, sem paginação RR/DF, erro)
- [x] `frontend/e2e/buscar-estado.spec.ts` -- E2E ponta a ponta contra front+back reais

**Acceptance Criteria:**
- Given a tela carregada, when o usuário seleciona "SP", then os agregados e o 1º colocado do ranking (Taboão da Serra) batem com os valores de referência.
- Given MG selecionado, when o usuário navega para a página 2, then os municípios mudam mantendo a ordem de densidade.
- Given RR ou DF selecionado, when o ranking carrega, then nenhum controle de paginação aparece.
- Given a API fora do ar, when a tela tenta carregar UFs/ranking, then mostra mensagem de erro em vez de travar.

## Implementation Notes

- `AgregadosUf` busca de novo por `buscarUfDetalhe(cdUf)` em vez de reaproveitar o objeto que
  `SeletorUf`/`listarUfs()` já tinha em mãos -- uma chamada HTTP a mais por seleção de UF, mas
  mantém o componente autocontido e análogo a `AgregadosMunicipio` (Story 2), seguindo o Code Map
  ao pé da letra.
- `BuscarEstado` reseta a paginação ao trocar de UF montando `AgregadosUf`/`RankingMunicipios` com
  `key={cdUf}` -- mesmo padrão de remount-via-key já usado em `BuscarCidade.tsx` (Story 2), em vez
  de um `useEffect` dedicado para zerar a página.
- `App.tsx` passou a ter abas (`role="tab"`) com `useState`; só a aba ativa é montada (confirma o
  Design Notes: trocar de aba desmonta e reseta o estado da outra).
- Lint (`oxlint`) mostra o mesmo warning `react(set-state-in-effect)` já presente desde a Story 2
  (fetch-em-effect), agora também em `AgregadosUf.tsx`, `RankingMunicipios.tsx` e `SeletorUf.tsx` --
  mesma categoria já aceita como não-bloqueante, nenhuma categoria nova de warning.
- Verificado: `cd frontend && npm test` (27/27, 6 arquivos), `cd backend && npm test` (27/27,
  back-end intocado), `npm run build` (sem erro de tipo), `npm run lint` (exit 0), e
  `npx playwright test` (8/8 -- as 4 da Story 2 continuam verdes mais as 4 novas desta story) contra
  back-end e front-end reais.

## Spec Change Log

## Review Triage Log

Camadas rodadas: blind-hunter, edge-case-hunter, verification-gap (todas ativas, nenhuma pulada).

- **[patch/medium]** Nenhum teste clica de volta na aba "Buscar cidade" depois de visitar "Buscar estado" — verification-gap. Todos os 8 E2E e os 6 arquivos de teste de componente nunca exercitam esse clique; uma regressão que quebrasse `onClick={() => setAbaAtiva('cidade')}` (ou trocasse a ternária de render) passaria despercebida por toda a suíte. A própria matriz de I/O desta story lista esse cenário ("ou volta para 'Buscar cidade'"), só o sentido de ida está coberto. Fix: teste E2E que seleciona uma UF, clica na aba "Buscar cidade" e confirma que a tela de busca de cidade volta a aparecer (e a de estado some).
- **[patch/low]** Typo no próprio spec: "trocar de UF **rereseta** a paginação" (Always, linha do frontmatter) — correção direta de digitação, sem mudar o sentido da frase.
- **[patch/low]** Colisão de nome acessível "Buscar estado" usado ao mesmo tempo no botão da aba, no `<h1>` da tela e no `<label>` do `<select>` de UF — blind-hunter. Confunde leitor de tela e torna `getByLabel('Buscar estado')` ambíguo por sorte, não por design. Fix: renomear o label do seletor para algo como "Estado (UF)".
- **[patch/low]** Numeração de posição no ranking nunca aparece visualmente — blind-hunter, verificado por mim. O `<ol start={...}>` depende do marcador nativo do navegador, mas o Preflight do Tailwind zera `list-style` em `ol`/`ul` (confirmado em `node_modules/tailwindcss/src/css/preflight.css`), então a posição "1º/2º/…" nunca é renderizada — só a ordem no DOM é implícita. Fix: adicionar um número de posição explícito por item (`(page-1)*pageSize + índice + 1`).
- **[patch/low]** `Intl.NumberFormat` (inteiro/área/densidade) duplicado byte-a-byte entre `AgregadosUf.tsx` e `RankingMunicipios.tsx` — blind-hunter. Mesmo risco de divergência já corrigido para `normalizarNome` na Story 1. Fix: extrair para um módulo compartilhado.
- **[patch/low]** Botões "Anterior"/"Próxima" continuam habilitados durante o carregamento da próxima página — blind-hunter. Cliques rápidos disparam requisições sobrepostas (o `cancelado` evita só a escrita de estado obsoleta, não a chamada redundante). Fix: desabilitar também quando `carregando` for verdadeiro.
- **[patch/low]** Página de ranking vazia (`items: []`) renderiza uma lista em branco sem nenhuma mensagem — blind-hunter e edge-case-hunter (achado convergente). Fix: mostrar "nenhum município encontrado" quando `items.length === 0`, com teste cobrindo o caso.
- **[low, rejeitado]** Estados de erro dizem "Tente novamente" mas não têm nenhum botão de retry — blind-hunter. Replica exatamente o padrão já aceito na Story 2 (mesmas mensagens, mesma ausência de retry); não é uma regressão desta story, e o fix exigiria mais que correção direta. Não acionado.
- **[low, rejeitado]** Padrão ARIA de abas incompleto em `App.tsx` (sem `role="tabpanel"`, sem `aria-controls`/`aria-labelledby`, sem navegação por seta) — blind-hunter. Mesma linha da rejeição de navegação por teclado da Story 2: real, mas não prometido pela story e o fix é substancial. Não acionado.
- **[false]** `AgregadosUf` refazer a busca por `cdUf` introduziria um modo de falha (404/5xx transitório) fora da matriz de I/O — blind-hunter. Verificado: a linha genérica "Falha da API" da própria matriz ("Qualquer chamada de `/api/ufs*` falha... mensagem de erro amigável") já cobre esse caminho — não é um gap novo, é o mesmo tratamento de erro já especificado se aplicando a mais uma chamada.
- **[low, rejeitado]** Branches `instanceof UfApiError` nos `catch` de `AgregadosUf`/`RankingMunicipios`/`SeletorUf` são código morto, já que `paraErroAmigavel` sempre embrulha em `UfApiError` — blind-hunter. Réplica exata do mesmo padrão já presente (e não acionado) desde a Story 2; inofensivo, não vale tocar agora.
- **[defer]** Sem timeout/`AbortController` nas chamadas de `src/api/ufs.ts` — edge-case-hunter. Mesmo achado já registrado (e rejeitado) na Story 2 para `src/api/municipios.ts`; mesma razão: improvável no contexto avaliado (Docker local), fix substancial. Não acionado, por consistência com a decisão anterior.

## Design Notes

Cada aba (`BuscarCidade`/`BuscarEstado`) só é montada enquanto ativa — trocar de aba desmonta a outra e reseta seu estado local. Simplificação deliberada dado o prazo; sem persistência de estado entre trocas de aba.

## Verification

**Commands:**
- `cd frontend && npm test` -- expected: todos os testes de componente passam, cobrindo a matriz de I/O
- `cd frontend && npx playwright test` -- expected: E2E das duas telas passa contra back-end e front-end reais
- `cd frontend && npm run build && npm run lint` -- expected: build sem erro de tipo, lint sem novos warnings
