import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Campo } from '../ui/Campo';

// --------------------------------------------------
// Cadastro.jsx - registro de novo usuário (RF1)
// --------------------------------------------------
// 1. aplica máscara no CPF, confere a confirmação de senha no cliente e envia para /auth/cadastro;
// 2. exibe erros 400/409 devolvidos pela API direto no campo correspondente (ex: email ou cpf repetido);
// 3. após cadastrar, já autentica e entra no sistema;

export function Cadastro() {
  const navigate = useNavigate();
  const { cadastrar, login } = useAuth();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmacaoSenha: '',
  });

  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  function formatarCpf(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const novoValor = name === 'cpf' ? formatarCpf(value) : value;

    setFormData((prev) => ({ ...prev, [name]: novoValor }));
    if (erros[name]) {
      setErros((prev) => ({ ...prev, [name]: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErros({});
    setErroGeral('');

    if (formData.senha !== formData.confirmacaoSenha) {
      setErros({
        confirmacaoSenha: 'A confirmação de senha não coincide com a senha digitada.',
      });
      return;
    }

    try {
      setCarregando(true);
      await cadastrar(formData);
      await login(formData.email, formData.senha);
      navigate('/');
    } catch (erro) {
      if (erro.campos && Object.keys(erro.campos).length > 0) {
        setErros(erro.campos);
      } else {
        setErroGeral(erro.message || 'Falha ao realizar cadastro.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Crie sua Conta</h1>
          <p>Cadastre-se para gerenciar suas finanças com segurança</p>
        </div>

        {erroGeral && <div className="alert-danger">{erroGeral}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <Campo label="Nome Completo" htmlFor="nome" erro={erros.nome}>
            <input
              id="nome"
              name="nome"
              type="text"
              className={`form-control ${erros.nome ? 'is-invalid' : ''}`}
              placeholder="Ex: João da Silva"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </Campo>

          <Campo label="E-mail" htmlFor="email" erro={erros.email}>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-control ${erros.email ? 'is-invalid' : ''}`}
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </Campo>

          <Campo label="CPF" htmlFor="cpf" erro={erros.cpf}>
            <input
              id="cpf"
              name="cpf"
              type="text"
              className={`form-control ${erros.cpf ? 'is-invalid' : ''}`}
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={handleChange}
              maxLength={14}
              required
            />
          </Campo>

          <Campo label="Senha" htmlFor="senha" erro={erros.senha}>
            <input
              id="senha"
              name="senha"
              type="password"
              className={`form-control ${erros.senha ? 'is-invalid' : ''}`}
              placeholder="Mínimo 8 caracteres (letras e números)"
              value={formData.senha}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </Campo>

          <Campo label="Confirmar Senha" htmlFor="confirmacaoSenha" erro={erros.confirmacaoSenha}>
            <input
              id="confirmacaoSenha"
              name="confirmacaoSenha"
              type="password"
              className={`form-control ${erros.confirmacaoSenha ? 'is-invalid' : ''}`}
              placeholder="Repita sua senha"
              value={formData.confirmacaoSenha}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </Campo>

          <button type="submit" className="btn-primary" disabled={carregando}>
            {carregando ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>

        <div className="auth-footer">
          Já possui conta? <Link to="/login">Faça Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Cadastro;
