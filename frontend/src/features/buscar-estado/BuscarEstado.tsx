import { useState } from 'react';
import type { UfResumo } from '../../api/ufs';
import { AgregadosUf } from './AgregadosUf';
import { RankingMunicipios } from './RankingMunicipios';
import { SeletorUf } from './SeletorUf';

/**
 * Tela "Buscar estado": compõe o seletor de UF com os agregados da UF
 * escolhida e o ranking paginado dos municípios dela por densidade
 * decrescente. Guarda apenas a UF selecionada — trocar de UF remonta
 * `AgregadosUf` e `RankingMunicipios` (via `key={cdUf}`), o que reseta a
 * paginação do ranking para a página 1.
 */
export function BuscarEstado() {
  const [ufSelecionada, setUfSelecionada] = useState<UfResumo | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Buscar estado</h1>
      <p className="mt-1 text-sm text-gray-600">
        Escolha uma UF para ver os agregados e o ranking de municípios por densidade.
      </p>

      <div className="mt-6">
        <SeletorUf onSelecionar={setUfSelecionada} />
      </div>

      {ufSelecionada && (
        <div key={ufSelecionada.cdUf}>
          <AgregadosUf cdUf={ufSelecionada.cdUf} />
          <RankingMunicipios cdUf={ufSelecionada.cdUf} />
        </div>
      )}
    </main>
  );
}
