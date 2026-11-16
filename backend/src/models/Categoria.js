import { query } from '../config/db.js';

export const Categoria = {
  /**
    Seed para os padrões de categorias:
    1. array de objetos com 'nome' e 'tipo'
    2. Loop foreach para inserir (por objeto) no banco
    3. ON CONFLICT dropa a inserção se for duplicata
    4. A query é contida no foreach, e vai enviando uma
    categoria atrás da outra.. atrelada ao usuarioId
    vindo por param
   */
  async criarPadrao(usuarioId) {
    const padroes = [
      { nome: 'Salário', tipo: 'entrada' },
      { nome: 'Freelance', tipo: 'entrada' },
      { nome: 'Rendimentos', tipo: 'entrada' },
      { nome: 'Moradia', tipo: 'saida' },
      { nome: 'Alimentação', tipo: 'saida' },
      { nome: 'Mobilidade', tipo: 'saida' },
      { nome: 'Saúde', tipo: 'saida' },
      { nome: 'Lazer', tipo: 'saida' },
      { nome: 'Educação', tipo: 'saida' },
      { nome: 'Outros', tipo: 'saida' },
    ];

    for (const cat of padroes) {
      await query(
        `INSERT INTO categorias (usuario_id, nome, tipo)
         VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, nome, tipo) DO NOTHING`,
        [usuarioId, cat.nome, cat.tipo]
      );
    }
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Listar por usuário, recuperar todas as categorias do usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async listarPorUsuario(usuarioId) {
    const { rows } = await query(
      `SELECT id, usuario_id, nome, tipo
       FROM categorias
       WHERE usuario_id = $1
       ORDER BY tipo ASC, nome ASC`,
      [usuarioId]
    );
    return rows;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Buscar por usuário, via id da categoria e id do usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async buscarPorId(id, usuarioId) {
    const { rows } = await query(
      `SELECT id, usuario_id, nome, tipo
       FROM categorias
       WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId]
    );
    return rows[0] || null;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Cria uma categoria por usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async criar({ usuarioId, nome, tipo }) {
    const { rows } = await query(
      `INSERT INTO categorias (usuario_id, nome, tipo)
       VALUES ($1, $2, $3)
       RETURNING id, usuario_id, nome, tipo`,
      [usuarioId, nome.trim(), tipo]
    );
    return rows[0];
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Atualiza categoria
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async atualizar(id, usuarioId, { nome, tipo }) {
    const { rows } = await query(
      `UPDATE categorias
       SET nome = $1, tipo = $2
       WHERE id = $3 AND usuario_id = $4
       RETURNING id, usuario_id, nome, tipo`,
      [nome.trim(), tipo, id, usuarioId]
    );
    return rows[0] || null;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Verifica se categoria tem lançamentos vinculados
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async temLancamentosVinculados(id, usuarioId) {
    const { rows } = await query(
      `SELECT 1 FROM lancamentos
       WHERE categoria_id = $1 AND usuario_id = $2
       LIMIT 1`,
      [id, usuarioId]
    );
    return rows.length > 0;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Excluir categoria por id e usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async excluir(id, usuarioId) {
    const { rowCount } = await query(
      `DELETE FROM categorias
       WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId]
    );
    return rowCount > 0;
  },
};

export default Categoria;
