import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Sem modo `globals` do Vitest: registra a limpeza do DOM entre testes aqui,
// uma única vez, em vez de repetir `afterEach(cleanup)` em cada arquivo.
afterEach(() => {
  cleanup();
});
