import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// --------------------------------------------------
// RotaProtegida.jsx - guarda de rotas privadas
// --------------------------------------------------
// 1. aguarda a checagem inicial do token e redireciona para /login se não estiver autenticado;

export function RotaProtegida({ children }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return <div className="auth-container">Carregando sessão...</div>;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RotaProtegida;
