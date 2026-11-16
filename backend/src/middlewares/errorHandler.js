/**
 * Middleware de tratamento de erros:
 * Padrão do Express: um middleware de erro
 * TEM que ter 4 parâmetros (err, req, res, next).
 * Sempre que uma rota chama next(erro),
 * o Express pula as demais rotas e cai direto aqui
 */
export function errorHandler(err, req, res, next) {
  console.error('Erro interceptado no middleware:', err);

  // Violação de constraint UNIQUE no PostgreSQL (código 23505)
  if (err.code === '23505') {
    const detail = err.detail || '';
    let campo = 'geral';
    let mensagem = 'Registro já cadastrado.';

    // Diferentes tipos de constraints:
    // 1. (code, constraint, detail)
    // vêm diretamente do PostgreSQL via driver nativo "pg" (node-postgres)
    // Ex: detail vem como "Key (email)=(ana@email.com) already exists."
    // e constraint vem com o nome da regra UNIQUE criada no schema.sql
    if (err.constraint?.includes('email') || detail.includes('email')) {
      campo = 'email';
      mensagem = 'Já existe um usuário com este e-mail.';
    } else if (err.constraint?.includes('cpf') || detail.includes('cpf')) {
      campo = 'cpf';
      mensagem = 'Já existe um usuário com este CPF.';
    } else if (err.constraint?.includes('categorias_usuario_id_nome_tipo_key')) {
      campo = 'nome';
      mensagem = 'Já existe uma categoria com este nome para este tipo.';
    } else if (err.constraint?.includes('fontes_destinos_usuario_id_nome_key')) {
      campo = 'nome';
      mensagem = 'Já existe uma fonte/destino com este nome.';
    }

    // RETORNO
    return res.status(409).json({
      erro: 'Conflito de unicidade.',
      campos: { [campo]: mensagem },
    });
  }

  // Violação de Foreign Key no PostgreSQL (código 23503)
  if (err.code === '23503') {
    // RETORNO
    return res.status(409).json({
      erro: 'Não é possível excluir ou alterar este registro pois existem registros vinculados.',
      campos: { id: 'Registro associado a outros lançamentos ou tabelas.' },
    });
  }

  // RETORNO
  // Status customizado definido na aplicação (ou 500 se for erro inesperado)
  const statusCode = err.status || err.statusCode || 500;
  const resposta = {
    erro: err.message || 'Erro interno no servidor.',
  };

  if (err.campos) {
    resposta.campos = err.campos;
  }

  // RETORNO
  return res.status(statusCode).json(resposta);
}
