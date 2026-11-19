import { Router } from 'express';
import { FonteDestino } from '../models/FonteDestino.js';
import { Relatorio } from '../models/Relatorio.js';
import { calcularFatura, arredondar, lerPeriodo } from '../config/utils.js';
import { autenticar } from '../middlewares/auth.js';

// --------------------------------------------------
// relatorios.routes.js - relatórios e faturas (RF7, RF8 e RF9)
// --------------------------------------------------
// 1. busca as agregações prontas em Relatorio.js (GROUP BY/SUM no banco) sem SQL direto na rota;
// 2. GET /categorias (RF7): saídas por categoria, % e comparação com período anterior de mesmo tamanho;
// 3. GET /fontes-destinos (RF8): entradas, saídas e saldo por conta/cartão/renda;
// 4. GET /faturas (RF9): aplica calcularFatura para montar fatura atual + próximas N e limite disponível;

const router = Router();
// Protege todas as rotas de relatórios com JWT
router.use(autenticar);

// Período anterior com o mesmo tamanho (ex.: outubro × setembro)
function periodoAnterior(inicioISO, fimISO) {
  const DIA = 86400000; // milissegundos em um dia
  const inicio = new Date(`${inicioISO}T00:00:00Z`);
  const fim = new Date(`${fimISO}T00:00:00Z`);
  // Soma +1 porque início e fim são inclusivos (ex: 01/10 a 31/10 = 31 dias)
  const dias = Math.round((fim - inicio) / DIA) + 1;

  // Retrocede 1 dia do início atual para achar o fim do período anterior, e volta (dias - 1) para o início
  const antFim = new Date(inicio.getTime() - DIA);
  const antInicio = new Date(antFim.getTime() - (dias - 1) * DIA);

  return {
    inicio: antInicio.toISOString().slice(0, 10),
    fim: antFim.toISOString().slice(0, 10),
  };
}

// Soma o campo "total" de uma lista de categorias
function somarTotais(lista) {
  return arredondar(lista.reduce((soma, item) => soma + item.total, 0));
}

/**
 * GET /api/relatorios/categorias?inicio=&fim=
 * RF7 - Gastos e entradas por categoria, percentuais e comparação com período anterior.
 */
router.get('/categorias', async (req, res, next) => {
  try {
    const periodo = lerPeriodo(req.query);
    if (!periodo) {
      return res.status(400).json({ erro: 'Parâmetros de data inválidos.' });
    }
    const { inicio, fim } = periodo;
    const anterior = periodoAnterior(inicio, fim);

    // Saídas no período atual e no período anterior, agrupadas por categoria
    const saidas = await Relatorio.totalPorCategoria(req.usuarioId, 'saida', inicio, fim);
    const saidasAnteriores = await Relatorio.totalPorCategoria(
      req.usuarioId,
      'saida',
      anterior.inicio,
      anterior.fim
    );

    // Entradas no período atual agrupadas por categoria
    const entradas = await Relatorio.totalPorCategoria(req.usuarioId, 'entrada', inicio, fim);

    const totalSaidas = somarTotais(saidas);

    const categorias = saidas.map((c) => {
      // Se a categoria não teve gasto no período anterior, considera 0 para calcular a variação
      const anteriorDaCategoria = saidasAnteriores.find((a) => a.id === c.id)?.total || 0;
      return {
        id: c.id,
        nome: c.nome,
        total: c.total,
        // Participação percentual da categoria sobre o total de saídas do período
        percentual: arredondar((c.total / totalSaidas) * 100),
        periodoAnterior: anteriorDaCategoria,
        // Positivo = aumento de gasto; negativo = redução em relação ao período anterior
        variacao: arredondar(c.total - anteriorDaCategoria),
      };
    });

    return res.json({
      periodo: { inicio, fim },
      periodoAnterior: anterior,
      totalSaidas,
      totalEntradas: somarTotais(entradas),
      categorias,
      entradas,
    });
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/relatorios/fontes-destinos?inicio=&fim=
 * RF8 - Movimentação por fonte/destino (entradas, saídas e saldo).
 */
router.get('/fontes-destinos', async (req, res, next) => {
  try {
    const periodo = lerPeriodo(req.query);
    if (!periodo) {
      return res.status(400).json({ erro: 'Parâmetros de data inválidos.' });
    }
    const { inicio, fim } = periodo;

    const fontes = await FonteDestino.listarPorUsuario(req.usuarioId);
    const totais = await Relatorio.totalPorFonteDestino(req.usuarioId, inicio, fim);

    const fontesDestinos = fontes.map((f) => {
      let entradas = 0;
      let saidas = 0;
      for (const t of totais) {
        if (t.fonte_destino_id !== f.id) continue;
        if (t.tipo === 'entrada') entradas = t.total;
        else saidas = t.total;
      }
      return {
        id: f.id,
        nome: f.nome,
        tipo: f.tipo,
        entradas,
        saidas,
        saldo: arredondar(entradas - saidas),
      };
    });

    return res.json({ periodo: { inicio, fim }, fontesDestinos });
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/relatorios/faturas?meses=3
 * RF9 - Previsão das faturas dos cartões de crédito e limite comprometido.
 */
router.get('/faturas', async (req, res, next) => {
  try {
    // Limita a previsão entre 3 (mínimo do RF9) e 12 meses
    const meses = Math.max(3, Math.min(12, Number(req.query.meses) || 3));
    const hojeISO = new Date().toISOString().slice(0, 10);

    const fontes = await FonteDestino.listarPorUsuario(req.usuarioId);
    // Filtra apenas as fontes que são cartões de crédito
    const cartoes = fontes.filter((f) => f.tipo === 'cartao_credito');

    const resultado = [];

    for (const cartao of cartoes) {
      const dadosCartao = {
        diaFechamento: cartao.dia_fechamento,
        diaVencimento: cartao.dia_vencimento,
      };

      // Uma compra feita hoje cai na fatura aberta; a parcela k+1 cai k meses depois dela
      const faturas = [];
      for (let k = 0; k <= meses; k++) {
        faturas.push({
          ...calcularFatura(hojeISO, dadosCartao, k + 1),
          total: 0,
          lancamentos: [],
        });
      }

      const lancamentos = await Relatorio.lancamentosDoCartao(req.usuarioId, cartao.id);
      let limiteUtilizado = 0;

      for (const l of lancamentos) {
        const dataFatura = calcularFatura(l.data, dadosCartao, l.parcela_atual);

        // Limite comprometido: soma de todas as parcelas cuja fatura ainda não venceu
        if (dataFatura.vencimento >= hojeISO) {
          limiteUtilizado += l.valor;
        }

        const fatura = faturas.find((f) => f.referencia === dataFatura.referencia);
        if (fatura) {
          fatura.total = arredondar(fatura.total + l.valor);
          fatura.lancamentos.push({
            id: l.id,
            descricao: l.descricao,
            valor: l.valor,
            dataCompra: l.data,
            parcelaAtual: l.parcela_atual,
            totalParcelas: l.total_parcelas,
            categoria: l.categoria_nome,
          });
        }
      }

      limiteUtilizado = arredondar(limiteUtilizado);

      resultado.push({
        cartao: {
          id: cartao.id,
          nome: cartao.nome,
          diaFechamento: cartao.dia_fechamento,
          diaVencimento: cartao.dia_vencimento,
          limite: cartao.limite,
          limiteUtilizado,
          limiteDisponivel: arredondar(cartao.limite - limiteUtilizado),
        },
        faturas,
      });
    }

    return res.json({ cartoes: resultado });
  } catch (erro) {
    return next(erro);
  }
});

export default router;
