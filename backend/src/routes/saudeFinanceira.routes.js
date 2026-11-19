import { Router } from 'express';
import { Relatorio } from '../models/Relatorio.js';
import { calcularFatura, arredondar, mesAtualRange } from '../config/utils.js';
import { autenticar } from '../middlewares/auth.js';

// --------------------------------------------------
// saudeFinanceira.routes.js - desafio extra (10.5.10)
// --------------------------------------------------
// 1. calcula no servidor taxa de poupança, média dos últimos 3 meses, reserva de emergência e comprometimento com cartões;
// 2. projeta o saldo dos próximos 6 meses somando média mensal + parcelas futuras já lançadas;
// 3. gera dicas por regras (if/else com limites documentados no README) e devolve avisoEducativo obrigatório;

const router = Router();
// Protege a rota com autenticação JWT
router.use(autenticar);

/**
 * GET /api/saude-financeira
 * Desafio (10.5.10): Calcula indicadores, projeções de saldo e gera dicas educativas no back-end
 */
router.get('/', async (req, res, next) => {
  try {
    const hoje = new Date();
    const hojeISO = hoje.toISOString().slice(0, 10);
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    // Referência 'AAAA-MM' do mês atual + i meses (usado como chave para agrupar faturas e projeção)
    const mesRef = (i) => new Date(Date.UTC(ano, mes + i, 1)).toISOString().slice(0, 7);

    const { inicio: inicioMesAtual, fim: fimMesAtual } = mesAtualRange();

    // Últimos 3 meses completos até o fim do mês atual (mes - 2, mes - 1 e mes atual)
    const inicio3Meses = new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 10);

    // 1. Entradas e saídas do mês atual
    const mesAtual = await Relatorio.totaisPorTipo(req.usuarioId, inicioMesAtual, fimMesAtual);
    // Taxa de poupança: percentual que sobrou das entradas do mês (evita divisão por zero se entrada === 0)
    const taxaPoupanca =
      mesAtual.entrada > 0
        ? arredondar(((mesAtual.entrada - mesAtual.saida) / mesAtual.entrada) * 100)
        : 0;

    // 2. Médias mensais dos últimos 3 meses (entradas e saídas)
    const tresMeses = await Relatorio.totaisPorTipo(req.usuarioId, inicio3Meses, fimMesAtual);
    const rendaMediaMensal = arredondar(tresMeses.entrada / 3);
    const despesaMediaMensal = arredondar(tresMeses.saida / 3);

    // 3. Reserva de emergência (saldo das contas marcadas como reserva = TRUE)
    const reserva = await Relatorio.totaisReserva(req.usuarioId);
    // Math.max(0, ...) evita exibir reserva negativa caso tenham saído mais recursos do que entraram
    const valorReserva = Math.max(0, arredondar(reserva.entrada - reserva.saida));
    // Quantos meses de despesa média a reserva atual consegue cobrir
    const mesesReserva =
      despesaMediaMensal > 0 ? Number((valorReserva / despesaMediaMensal).toFixed(1)) : 0;

    // 4. Parcelas futuras de cartão de crédito e comprometimento
    const lancamentosCartao = await Relatorio.lancamentosDeCartoes(req.usuarioId);

    let totalParcelasFuturas = 0;
    const faturasPorMes = {}; // { 'AAAA-MM': valor }

    for (const l of lancamentosCartao) {
      const cartao = {
        diaFechamento: l.dia_fechamento,
        diaVencimento: l.dia_vencimento,
      };
      const fatura = calcularFatura(l.data, cartao, l.parcela_atual);

      // Considera apenas parcelas cuja fatura ainda não venceu
      if (fatura.vencimento >= hojeISO) {
        totalParcelasFuturas += l.valor;
        faturasPorMes[fatura.referencia] = (faturasPorMes[fatura.referencia] || 0) + l.valor;
      }
    }
    totalParcelasFuturas = arredondar(totalParcelasFuturas);

    // Comprometimento dos próximos 3 meses com cartão (faturas de mes+0, mes+1 e mes+2 sobre 3x a renda média)
    const faturasProximos3Meses =
      (faturasPorMes[mesRef(0)] || 0) +
      (faturasPorMes[mesRef(1)] || 0) +
      (faturasPorMes[mesRef(2)] || 0);
    const comprometimentoCartao =
      rendaMediaMensal > 0 ? arredondar((faturasProximos3Meses / (rendaMediaMensal * 3)) * 100) : 0;

    // 5. Projeção de saldo para os próximos 6 meses
    // Parte do saldo geral histórico (todas as entradas - todas as saídas)
    const geral = await Relatorio.totaisPorTipo(req.usuarioId);
    let saldoAcumulado = geral.entrada - geral.saida;
    const projecao = [];

    for (let i = 1; i <= 6; i++) {
      const parcelasDoMes = faturasPorMes[mesRef(i)] || 0;
      // A cada mês futuro, soma o fluxo médio (renda - despesa) e desconta as parcelas já conhecidas
      saldoAcumulado += rendaMediaMensal - despesaMediaMensal - parcelasDoMes;
      projecao.push({
        mes: mesRef(i),
        saldoProjetado: arredondar(saldoAcumulado),
      });
    }

    // 6. Geração de dicas baseadas nos dados calculados (limites documentados no README)
    const dicas = [];

    if (mesAtual.entrada > 0) {
      if (taxaPoupanca < 10) {
        dicas.push({
          tipo: 'alerta',
          titulo: 'Taxa de poupança abaixo de 10%',
          mensagem: `Você guardou ${taxaPoupanca}% da sua renda neste mês. Uma meta saudável é poupar pelo menos 10% das entradas.`,
        });
      } else {
        dicas.push({
          tipo: 'sucesso',
          titulo: 'Boa capacidade de poupança',
          mensagem: `Neste mês você economizou ${taxaPoupanca}% da sua renda.`,
        });
      }
    }

    if (comprometimentoCartao > 30) {
      dicas.push({
        tipo: 'alerta',
        titulo: 'Atenção ao uso do cartão',
        mensagem: `Suas faturas dos próximos 3 meses comprometem ${comprometimentoCartao}% da sua renda média. Tente manter abaixo de 30%.`,
      });
    }

    if (mesesReserva < 3) {
      dicas.push({
        tipo: 'alerta',
        titulo: 'Reforce sua reserva de emergência',
        mensagem: `Sua reserva cobre ${mesesReserva} meses de despesas. A referência comum é de 3 a 6 meses.`,
      });
    } else {
      dicas.push({
        tipo: 'sucesso',
        titulo: 'Reserva de emergência sólida',
        mensagem: `Sua reserva cobre ${mesesReserva} meses de despesas, dentro da referência de 3 a 6 meses.`,
      });
    }

    if (projecao.some((p) => p.saldoProjetado < 0)) {
      dicas.push({
        tipo: 'perigo',
        titulo: 'Alerta na projeção de saldo',
        mensagem:
          'Com base na média dos últimos 3 meses e nas parcelas futuras, seu saldo pode ficar negativo nos próximos 6 meses.',
      });
    }

    return res.json({
      indicadores: {
        taxaPoupanca,
        rendaMediaMensal,
        despesaMediaMensal,
        comprometimentoCartao,
        totalParcelasFuturas,
        valorReserva,
        mesesReserva,
      },
      projecao,
      dicas,
      avisoEducativo:
        'As análises, projeções e dicas apresentadas têm caráter exclusivamente educativo e não constituem recomendação financeira profissional.',
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;
