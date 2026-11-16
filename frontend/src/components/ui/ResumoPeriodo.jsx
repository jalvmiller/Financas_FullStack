import React from 'react';
import { formatarMoeda } from '../../services/formatters';

// --------------------------------------------------
// ResumoPeriodo.jsx - cards de totais (entradas, saídas e saldo)
// --------------------------------------------------
// 1. componente compartilhado entre Dashboard e Lancamentos para exibir o resumo formatado em reais;

export function ResumoPeriodo({ entradas, saidas, saldo, sufixo = '' }) {
  const classeSaldo = saldo >= 0 ? 'text-primary' : 'text-danger';

  return (
    <div className="grid-cards">
      <div className="summary-card">
        <div className="label">Entradas{sufixo}</div>
        <div className="value text-success">{formatarMoeda(entradas)}</div>
      </div>

      <div className="summary-card">
        <div className="label">Saídas{sufixo}</div>
        <div className="value text-danger">{formatarMoeda(saidas)}</div>
      </div>

      <div className="summary-card">
        <div className="label">Saldo{sufixo}</div>
        <div className={`value ${classeSaldo}`}>{formatarMoeda(saldo)}</div>
      </div>
    </div>
  );
}

export default ResumoPeriodo;
