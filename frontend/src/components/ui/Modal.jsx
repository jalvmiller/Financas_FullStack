import React from 'react';
import { X } from 'lucide-react';

// --------------------------------------------------
// Modal.jsx - janela sobreposta reutilizável
// --------------------------------------------------
// 1. só renderiza quando 'aberto' for true; usada nos formulários e confirmações das telas;

export function Modal({ aberto, titulo, onFechar, maxWidth, children }) {
  if (!aberto) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onFechar}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
