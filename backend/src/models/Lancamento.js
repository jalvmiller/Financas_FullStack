import crypto from 'crypto';
import { query, getClient } from '../config/db.js';

// Colunas devolvidas ao listar/detalhar
// (junta o nome da categoria e da fonte/destino)
const SELECT_LANCAMENTO = `
  SELECT l.id, l.tipo, l.descricao, l.valor, l.data,
         l.categoria_id, c.nome AS categoria_nome,
         l.fonte_destino_id, fd.nome AS fonte_destino_nome,
         l.parcela_atual, l.total_parcelas, l.grupo_parcelamento
  FROM lancamentos l
  JOIN categorias c ON c.id = l.categoria_id
  JOIN fontes_destinos fd ON fd.id = l.fonte_destino_id`;

export const Lancamento = {
  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Lista lançamentos do usuário com filtros, paginação e totais do período.
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  // São três etapas:
  // 1. Totais do período filtrado (entradas, saídas e saldo)
  // 2. Paginação
  // 3. Listar lançamentos
  async listarPorUsuario(
    usuarioId,
    { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina, limite }
  ) {
    const condicoes = ['l.usuario_id = $1'];
    const params = [usuarioId];

    // Adiciona um filtro só se o valor foi informado
    const filtrar = (coluna, operador, valor) => {
      if (!valor) return;

      params.push(valor);
      condicoes.push(`${coluna} ${operador} $${params.length}`);
    };

    // COLUNA , OPERADOR , VALOR - cada chamada de função só
    // adiciona alguma coisa no where se o valor existir
    filtrar('l.data', '>=', inicio);
    filtrar('l.data', '<=', fim);
    filtrar('l.tipo', '=', tipo);
    filtrar('l.categoria_id', '=', categoriaId);
    filtrar('l.fonte_destino_id', '=', fonteDestinoId);

    // Junta todas as condições com "AND" e cria a query WHERE
    const where = condicoes.join(' AND ');

    // 1. Totais do período filtrado (entradas, saídas e saldo)
    const totaisRes = await query(
      `SELECT tipo, SUM(valor) AS total, COUNT(*) AS quantidade
       FROM lancamentos l
       WHERE ${where}
       GROUP BY tipo`,
      params
    );

    // Leitura do totaisRes.rows para calcular
    // entradas, saidas e totalRegistros:
    let entradas = 0;
    let saidas = 0;
    let totalRegistros = 0;
    for (const r of totaisRes.rows) {
      if (r.tipo === 'entrada') entradas = r.total;
      else saidas = r.total;
      totalRegistros += Number(r.quantidade);
    }

    // 2. Paginação
    // 3. LIMIT define quantos registros retornar por página
    // 4. OFFSET define quantos registros pular antes de começar a retornar
    // Pagina 1, OFFSET = (1 - 1) * 10(limite vindo por param) = 0..
    // pula 0 e pega do 1º ao 10º
    // Pagina 2, OFFSET = (2 - 1) * 10(limite vindo por param) = 10..
    // pula 10 e pega do 11º ao 20º
    // 5. Usa o SELECT criado no início do arquivo para obter os dados
    // 6. Ordena por data descendente e id descendente

    // 7.$${params.length + 1} e [...params, limite, offset]:
    //  params já contém os valores dos filtros ($1 até $N) e
    //  foi usado na query anterior de totais..
    //  Para não modificar params, cria um novo array
    //  [...params, limite, offset] onde limite ocupa a posição
    //  params.length + 1 e offset ocupa params.length + 2..
    const offset = (pagina - 1) * limite;
    const listaRes = await query(
      `${SELECT_LANCAMENTO}
       WHERE ${where}
       ORDER BY l.data DESC, l.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limite, offset]
    );

    return {
      lancamentos: listaRes.rows,
      totais: {
        entradas,
        saidas,
        saldo: Number((entradas - saidas).toFixed(2)),
      },
      paginacao: {
        pagina,
        limite,
        total: totalRegistros,
        totalPaginas: Math.max(1, Math.ceil(totalRegistros / limite)),
      },
    };
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Busca um lançamento por id e usuário
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async buscarPorId(id, usuarioId) {
    const { rows } = await query(
      `${SELECT_LANCAMENTO}
       WHERE l.id = $1 AND l.usuario_id = $2`,
      [id, usuarioId]
    );
    return rows[0] || null;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Cria um lançamento (pode ser parcelado)
   * TRANSAÇÃO
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async criar({
    usuarioId,
    tipo,
    descricao,
    valor,
    data,
    categoriaId,
    fonteDestinoId,
    totalParcelas,
  }) {
    // Uso de UUID para identificar grupo de parcelas
    // Se for lançamento único, não gera UUID
    const grupoParcelamento = totalParcelas > 1 ? crypto.randomUUID() : null;

    // Divisão em centavos (inteiros) para não perder precisão
    const totalCentavos = Math.round(valor * 100);
    const centavosPorParcela = Math.floor(totalCentavos / totalParcelas);
    const sobra = totalCentavos % totalParcelas;

    // Instância do cliente
    const client = await getClient();

    try {
      // Início da transação
      await client.query('BEGIN');
      const criados = [];

      for (let parcela = 1; parcela <= totalParcelas; parcela++) {
        // Cálculo dos centavos
        const centavos = parcela === 1 ? centavosPorParcela + sobra : centavosPorParcela;
        const { rows } = await client.query(
          `INSERT INTO lancamentos (
             usuario_id, tipo, descricao, valor, data,
             categoria_id, fonte_destino_id,
             parcela_atual, total_parcelas, grupo_parcelamento
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            usuarioId,
            tipo,
            descricao.trim(),
            centavos / 100,
            data,
            categoriaId,
            fonteDestinoId,
            parcela,
            totalParcelas,
            grupoParcelamento,
          ]
        );
        // Adiciona o lançamento criado ao array
        criados.push(rows[0]);
      }
      await client.query('COMMIT');
      return criados;
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      // Liberar a conexão
      client.release();
    }
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Atualiza um lançamento
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async atualizar(id, usuarioId, { tipo, descricao, valor, data, categoriaId, fonteDestinoId }) {
    const { rows } = await query(
      `UPDATE lancamentos
       SET tipo = $1,
           descricao = $2,
           valor = $3,
           data = $4,
           categoria_id = $5,
           fonte_destino_id = $6
       WHERE id = $7 AND usuario_id = $8
       RETURNING *`,
      [tipo, descricao.trim(), valor, data, categoriaId, fonteDestinoId, id, usuarioId]
    );
    return rows[0] || null;
  },

  /**
   *
   *
   * -------||-----------------------------------------------------||--------
   * ------------------------------------------------------------------------
   * Exclui um lançamento
   * ------------------------------------------------------------------------
   * -------||-----------------------------------------------------||--------
   */
  async excluir(id, usuarioId, todasParcelas = false) {
    const existente = await this.buscarPorId(id, usuarioId);
    if (!existente) return false;

    if (todasParcelas && existente.grupo_parcelamento) {
      await query(
        `DELETE FROM lancamentos
         WHERE grupo_parcelamento = $1 AND usuario_id = $2`,
        [existente.grupo_parcelamento, usuarioId]
      );
    } else {
      await query(
        `DELETE FROM lancamentos
         WHERE id = $1 AND usuario_id = $2`,
        [id, usuarioId]
      );
    }
    return true;
  },
};

export default Lancamento;
