import React from 'react';

// --------------------------------------------------
// Campo.jsx - wrapper padrão de campo de formulário
// --------------------------------------------------
// 1. agrupa label, input/select (children) e mensagem de erro devolvida pela API;

export function Campo({ label, htmlFor, erro, children }) {
  return (
    <div className="form-group">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {erro && <span className="error-message">{erro}</span>}
    </div>
  );
}

export default Campo;
