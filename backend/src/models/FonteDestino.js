import { query } from '../config/db.js';

export const FonteDestino = {
  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Cria a fonte padrão (Conta Corrente):
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  /**
    Cria a fonte padrão (Conta Corrente):
    1. O FALSE é valor default para inserir, ou seja, sempre inicia SEM reserva.
   */
  async criarPadrao(usuarioId) {
    await query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, reserva)
       VALUES ($1, 'Conta Corrente', 'conta', FALSE)
       ON CONFLICT (usuario_id, nome) DO NOTHING`,
      [usuarioId]
    );
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Lista fontes/destinos do usuário ordenadas por nome ascendente
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async listarPorUsuario(usuarioId) {
    const { rows } = await query(
      `SELECT id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva
       FROM fontes_destinos
       WHERE usuario_id = $1
       ORDER BY nome ASC`,
      [usuarioId]
    );
    return rows;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca uma fonte/destino por id e usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // Buscar por id (pode vir de lancamentoController.js)
  async buscarPorId(id, usuarioId) {
    const { rows } = await query(
      `SELECT id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva
       FROM fontes_destinos
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
   * Cria qualquer fonte/destino:
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  /**
    Cria qualquer fonte destino:
    1. Operador ternário.. se tipo for cartao_credito,
    diaFechamento, diaVencimento e limite (todos obrigatórios)
   */
  async criar({ usuarioId, nome, tipo, diaFechamento, diaVencimento, limite, reserva = false }) {
    const isCartao = tipo === 'cartao_credito';
    const { rows } = await query(
      `INSERT INTO fontes_destinos (
         usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva`,
      [
        usuarioId,
        nome.trim(),
        tipo,
        isCartao ? diaFechamento : null,
        isCartao ? diaVencimento : null,
        isCartao ? limite : null,
        reserva,
      ]
    );
    // Retorna a fonte destino criada
    return rows[0];
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Atualiza uma fonte destino:
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  /**
    Atualiza uma fonte destino:
    1. Parâmetros diaFechamento, diaVencimento e limite
    são repassados ou são null.. a depender se tipo = "cartão_credito"
   */
  async atualizar(
    id,
    usuarioId,
    { nome, tipo, diaFechamento, diaVencimento, limite, reserva = false }
  ) {
    const isCartao = tipo === 'cartao_credito';
    const { rows } = await query(
      `UPDATE fontes_destinos
       SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5, reserva = $6
       WHERE id = $7 AND usuario_id = $8
       RETURNING id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva`,
      [
        nome.trim(),
        tipo,
        isCartao ? diaFechamento : null,
        isCartao ? diaVencimento : null,
        isCartao ? limite : null,
        reserva,
        id,
        usuarioId,
      ]
    );
    return rows[0] || null;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Verifica se existem lançamentos vinculados à fonte/destino
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  /**
    Verifica se existem lançamentos:
    1. Conta Corrente (tipoconta)
    2. Cartões de Crédito (tipo: cartao_credito)
  */
  async temLancamentosVinculados(id, usuarioId) {
    const { rows } = await query(
      `SELECT 1 FROM lancamentos
       WHERE fonte_destino_id = $1 AND usuario_id = $2
       LIMIT 1`,
      [id, usuarioId]
    );
    // Se existir lancamento retorna TRUE caso contrário FALSE
    return rows.length > 0;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Excluir fonte/destino por id e usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async excluir(id, usuarioId) {
    const { rowCount } = await query(
      `DELETE FROM fontes_destinos
       WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId]
    );
    // Se deletar retorna TRUE caso contrário FALSE..
    // difere do rows.length que usa o retorno do SELECT com FROM
    // o rowsCount conta as linhas afetadas no DELETE.
    return rowCount > 0;
  },
};

export default FonteDestino;
