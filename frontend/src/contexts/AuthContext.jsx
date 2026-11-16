import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('financas_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('financas_token'));
  const [carregando, setCarregando] = useState(true);

  // Valida o token ao iniciar
  useEffect(() => {
    async function verificarToken() {
      if (token) {
        try {
          const dados = await api.get('/auth/me');
          setUsuario(dados);
          localStorage.setItem('financas_usuario', JSON.stringify(dados));
        } catch (erro) {
          console.warn('Sessão expirada ou inválida:', erro.message);
          logout();
        }
      }
      setCarregando(false);
    }

    verificarToken();

    // Escuta evento emitido pelo api.js quando recebe 401
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  async function login(email, senha) {
    const resposta = await api.post('/auth/login', { email, senha });
    const { token: novoToken, usuario: novoUsuario } = resposta;

    setToken(novoToken);
    setUsuario(novoUsuario);

    localStorage.setItem('financas_token', novoToken);
    localStorage.setItem('financas_usuario', JSON.stringify(novoUsuario));

    return novoUsuario;
  }

  async function cadastrar({ nome, email, cpf, senha }) {
    const resposta = await api.post('/auth/cadastro', { nome, email, cpf, senha });
    return resposta;
  }

  function logout() {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem('financas_token');
    localStorage.removeItem('financas_usuario');
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        autenticado: Boolean(usuario && token),
        carregando,
        login,
        cadastrar,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
