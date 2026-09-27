import { useState } from 'react';
import type { MunicipioResultadoBusca } from '../../api/municipios';
import { AgregadosMunicipio } from './AgregadosMunicipio';
import { AutocompleteMunicipio } from './AutocompleteMunicipio';

/**
 * Tela "Buscar cidade": compõe o autocomplete de municípios com a exibição
 * dos agregados do município selecionado. Guarda apenas o `cdMun`
 * selecionado — sem navegação entre telas (fica para a Story 3).
 */
export function BuscarCidade() {
  const [municipioSelecionado, setMunicipioSelecionado] =
    useState<MunicipioResultadoBusca | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Buscar cidade</h1>
      <p className="mt-1 text-sm text-gray-600">
        Digite o nome de um município para ver os dados do Censo 2022.
      </p>

      <div className="mt-6">
        <AutocompleteMunicipio onSelecionar={setMunicipioSelecionado} />
      </div>

      {municipioSelecionado && (
        <AgregadosMunicipio key={municipioSelecionado.cdMun} cdMun={municipioSelecionado.cdMun} />
      )}
    </main>
  );
}
