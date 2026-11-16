import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Campo } from '../ui/Campo';

// --------------------------------------------------
// Login.jsx - tela de autenticação (RF2)
// --------------------------------------------------
// 1. recebe e-mail e senha, chama login() do AuthContext e redireciona para '/';
// 2. exibe a mensagem genérica da API quando as credenciais falham (401);

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErroGeral('');

    if (!email || !senha) {
      setErroGeral('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setCarregando(true);
      await login(email, senha);
      navigate('/');
    } catch (erro) {
      setErroGeral(erro.message || 'Falha ao autenticar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Controle Financeiro</h1>
          <p>Entre com suas credenciais para acessar sua conta</p>
        </div>

        {erroGeral && <div className="alert-danger">{erroGeral}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <Campo label="E-mail" htmlFor="email">
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Campo>

          <Campo label="Senha" htmlFor="senha">
            <input
              id="senha"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Campo>

          <button type="submit" className="btn-primary" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
