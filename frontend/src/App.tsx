import { useState } from 'react';
import { BuscarCidade } from './features/buscar-cidade/BuscarCidade';
import { BuscarEstado } from './features/buscar-estado/BuscarEstado';

type Aba = 'cidade' | 'estado';

/**
 * Navegação simples entre as duas telas via `useState` (sem router — fora
 * do escopo, ver SPEC). Só a tela ativa é montada: trocar de aba desmonta a
 * outra e reseta o estado local dela (ver Design Notes da Story 3).
 */
function App() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('cidade');

  return (
    <div>
      <nav
        role="tablist"
        aria-label="Navegação"
        className="mx-auto flex max-w-2xl gap-2 px-4 pt-4"
      >
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'cidade'}
          onClick={() => setAbaAtiva('cidade')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            abaAtiva === 'cidade' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Buscar cidade
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'estado'}
          onClick={() => setAbaAtiva('estado')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            abaAtiva === 'estado' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Buscar estado
        </button>
      </nav>

      {abaAtiva === 'cidade' ? <BuscarCidade /> : <BuscarEstado />}
    </div>
  );
}

export default App;
