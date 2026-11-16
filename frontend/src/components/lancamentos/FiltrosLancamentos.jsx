import React from 'react';
import { Campo } from '../ui/Campo';

// --------------------------------------------------
// FiltrosLancamentos.jsx - barra de filtros da listagem (RF6)
// --------------------------------------------------
// 1. controla período (início/fim), tipo, categoria e fonte/destino;
// 2. dispara onChange do pai, que atualiza os filtros e reseta para a página 1;

export function FiltrosLancamentos({ filtros, categorias, fontes, onChange }) {
  return (
    <div className="card">
      <div className="grid-filtros">
        <Campo label="Início">
          <input
            type="date"
            className="form-control"
            value={filtros.inicio}
            onChange={(e) => onChange('inicio', e.target.value)}
          />
        </Campo>
        <Campo label="Fim">
          <input
            type="date"
            className="form-control"
            value={filtros.fim}
            onChange={(e) => onChange('fim', e.target.value)}
          />
        </Campo>
        <Campo label="Tipo">
          <select
            className="form-control"
            value={filtros.tipo}
            onChange={(e) => onChange('tipo', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </Campo>
        <Campo label="Categoria">
          <select
            className="form-control"
            value={filtros.categoriaId}
            onChange={(e) => onChange('categoriaId', e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.tipo})
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Fonte / Destino">
          <select
            className="form-control"
            value={filtros.fonteDestinoId}
            onChange={(e) => onChange('fonteDestinoId', e.target.value)}
          >
            <option value="">Todas</option>
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </div>
  );
}
