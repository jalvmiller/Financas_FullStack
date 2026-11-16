import React from 'react';
import { formatarMoeda } from '../../services/formatters';
import { Modal } from '../ui/Modal';

// --------------------------------------------------
// ModalExcluirLancamento.jsx - confirmação de exclusão (RF6)
// --------------------------------------------------
// 1. pede confirmação antes do DELETE;
// 2. se for compra parcelada, oferece excluir só a parcela atual ou o grupo inteiro (?todasParcelas=true);

export function ModalExcluirLancamento({ item, onConfirmar, onFechar }) {
  const parcelado = item?.total_parcelas > 1;

  return (
    <Modal aberto={Boolean(item)} titulo="Confirmar Exclusão" onFechar={onFechar} maxWidth="420px">
      {item && (
        <>
          <p style={{ marginBottom: '1rem' }}>
            Deseja excluir o lançamento <strong>{item.descricao}</strong> (
            {formatarMoeda(item.valor)})?
          </p>
          {parcelado && (
            <p className="alert-info">
              Este lançamento faz parte de uma compra parcelada ({item.parcela_atual}/
              {item.total_parcelas}).
            </p>
          )}
          <div className="modal-footer flex-gap">
            <button className="btn btn-secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={() => onConfirmar(false)}>
              {parcelado ? 'Excluir apenas esta parcela' : 'Excluir'}
            </button>
            {parcelado && (
              <button className="btn btn-danger" onClick={() => onConfirmar(true)}>
                Excluir todas as parcelas
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
