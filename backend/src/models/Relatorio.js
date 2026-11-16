import { query } from '../config/db.js';

// Período usado quando queremos somar "tudo" (sem filtro de datas)
const INICIO_GERAL = '1900-01-01';
const FIM_GERAL = '2999-12-31';

// Transforma as linhas { tipo, total } em { entrada, saida } (0 quando não há lançamentos)
function somarPorTipo(rows) {
  const totais = { entrada: 0, saida: 0 };
  for (const r of rows) totais[r.tipo] = r.total;
  return totais;
}

export const Relatorio = {
  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca entradas e saídas do usuário no período.
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // Soma de entradas e saídas do usuário no período (agregação feita no banco)
  async totaisPorTipo(usuarioId, inicio = INICIO_GERAL, fim = FIM_GERAL) {
    const { rows } = await query(
      `SELECT tipo, SUM(valor) AS total
       FROM lancamentos
       WHERE usuario_id = $1 AND data BETWEEN $2 AND $3
       GROUP BY tipo`,
      [usuarioId, inicio, fim]
    );
    return somarPorTipo(rows);
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca entradas e saídas das contas marcadas como reserva de emergência
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // Entradas e saídas das contas marcadas como reserva de emergência
  async totaisReserva(usuarioId) {
    const { rows } = await query(
      `SELECT l.tipo, SUM(l.valor) AS total
       FROM lancamentos l
       JOIN fontes_destinos fd ON fd.id = l.fonte_destino_id
       WHERE l.usuario_id = $1 AND fd.reserva = TRUE
       GROUP BY l.tipo`,
      [usuarioId]
    );
    return somarPorTipo(rows);
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Total por categoria (tipo = 'entrada' ou 'saida'), do maior para o menor
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async totalPorCategoria(usuarioId, tipo, inicio, fim) {
    const { rows } = await query(
      `SELECT c.id, c.nome, SUM(l.valor) AS total
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
       WHERE l.usuario_id = $1 AND l.tipo = $2 AND l.data BETWEEN $3 AND $4
       GROUP BY c.id, c.nome
       ORDER BY total DESC`,
      [usuarioId, tipo, inicio, fim]
    );
    return rows;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca entradas e saídas por fonte/destino
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // Total de entradas/saídas por fonte/destino (uma linha por fonte e tipo)
  async totalPorFonteDestino(usuarioId, inicio, fim) {
    const { rows } = await query(
      `SELECT fonte_destino_id, tipo, SUM(valor) AS total
       FROM lancamentos
       WHERE usuario_id = $1 AND data BETWEEN $2 AND $3
       GROUP BY fonte_destino_id, tipo`,
      [usuarioId, inicio, fim]
    );
    return rows;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Lista lançamentos do usuário com filtros, paginação e totais do período.
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // Saídas de um cartão (com o nome da categoria), da mais antiga para a mais nova
  async lancamentosDoCartao(usuarioId, cartaoId) {
    const { rows } = await query(
      `SELECT l.id, l.descricao, l.valor, l.data, l.parcela_atual, l.total_parcelas,
              c.nome AS categoria_nome
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
       WHERE l.usuario_id = $1 AND l.fonte_destino_id = $2 AND l.tipo = 'saida'
       ORDER BY l.data, l.parcela_atual`,
      [usuarioId, cartaoId]
    );
    return rows;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca lançamentos de todos os cartões, junto com os dias de fechamento/vencimento de cada um
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async lancamentosDeCartoes(usuarioId) {
    const { rows } = await query(
      `SELECT l.valor, l.data, l.parcela_atual, fd.dia_fechamento, fd.dia_vencimento
       FROM lancamentos l
       JOIN fontes_destinos fd ON fd.id = l.fonte_destino_id
       WHERE l.usuario_id = $1 AND l.tipo = 'saida' AND fd.tipo = 'cartao_credito'`,
      [usuarioId]
    );
    return rows;
  },
};

export default Relatorio;
