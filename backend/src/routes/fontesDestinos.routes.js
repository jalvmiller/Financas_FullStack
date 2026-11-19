import { Router } from 'express';
import { FonteDestino } from '../models/FonteDestino.js';
import { autenticar } from '../middlewares/auth.js';

// --------------------------------------------------
// fontesDestinos.routes.js - CRUD de fontes/destinos (RF5)
// --------------------------------------------------
// 1. gerencia contas, rendas e cartões do usuário logado (RF3);
// 2. se tipo === 'cartao_credito', exige fechamento/vencimento (1-31) e limite > 0;
// 3. se tipo === 'conta', aceita reserva (usada na reserva de emergência); barra DELETE se em uso (409);

const router = Router();
// Protege todas as rotas deste arquivo com autenticação JWT
router.use(autenticar);

// Middleware local de validação antes do POST e PUT (RF5)
function validarFonteDestino(req, res, next) {
  const { nome, tipo, dia_fechamento, dia_vencimento, limite } = req.body;
  const campos = {};

  if (!nome || !String(nome).trim()) {
    campos.nome = 'O nome é obrigatório.';
  } else if (String(nome).trim().length > 60) {
    campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  }

  if (!tipo || !['renda', 'conta', 'cartao_credito'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  }

  // Campos de faturamento são obrigatórios somente quando o tipo for cartão de crédito
  if (tipo === 'cartao_credito') {
    const fech = Number(dia_fechamento);
    const venc = Number(dia_vencimento);
    const lim = Number(limite);

    if (!Number.isInteger(fech) || fech < 1 || fech > 31) {
      campos.dia_fechamento = 'O dia de fechamento deve ser um número inteiro entre 1 e 31.';
    }
    if (!Number.isInteger(venc) || venc < 1 || venc > 31) {
      campos.dia_vencimento = 'O dia de vencimento deve ser um número inteiro entre 1 e 31.';
    }
    if (limite === undefined || limite === null || Number.isNaN(lim) || lim <= 0) {
      campos.limite = 'O limite do cartão deve ser maior que zero.';
    }
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}

// GET /api/fontes-destinos -> lista contas, rendas e cartões do usuário
router.get('/', async (req, res, next) => {
  try {
    const lista = await FonteDestino.listarPorUsuario(req.usuarioId);
    return res.json(lista);
  } catch (erro) {
    return next(erro);
  }
});

// POST /api/fontes-destinos -> cria fonte/destino limpando campos específicos de outros tipos
router.post('/', validarFonteDestino, async (req, res, next) => {
  try {
    const { nome, tipo, dia_fechamento, dia_vencimento, limite, reserva } = req.body;
    const criada = await FonteDestino.criar({
      usuarioId: req.usuarioId,
      nome,
      tipo,
      // Se for cartão de crédito, converte os valores, caso contrário, define como null
      diaFechamento: tipo === 'cartao_credito' ? Number(dia_fechamento) : null,
      diaVencimento: tipo === 'cartao_credito' ? Number(dia_vencimento) : null,
      limite: tipo === 'cartao_credito' ? Number(limite) : null,
      reserva: tipo === 'conta' ? Boolean(reserva) : false,
    });
    return res.status(201).json(criada);
  } catch (erro) {
    return next(erro);
  }
});

// PUT /api/fontes-destinos/:id -> atualiza registro pertencente ao usuário
router.put('/:id', validarFonteDestino, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const { nome, tipo, dia_fechamento, dia_vencimento, limite, reserva } = req.body;
    const atualizada = await FonteDestino.atualizar(id, req.usuarioId, {
      nome,
      tipo,
      diaFechamento: tipo === 'cartao_credito' ? Number(dia_fechamento) : null,
      diaVencimento: tipo === 'cartao_credito' ? Number(dia_vencimento) : null,
      limite: tipo === 'cartao_credito' ? Number(limite) : null,
      reserva: tipo === 'conta' ? Boolean(reserva) : false,
    });

    if (!atualizada) {
      return res.status(404).json({ erro: 'Fonte/Destino não encontrado.' });
    }

    return res.json(atualizada);
  } catch (erro) {
    return next(erro);
  }
});

// DELETE /api/fontes-destinos/:id -> barra com 409 se houver lançamentos usando essa fonte/destino
router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const existente = await FonteDestino.buscarPorId(id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Fonte/Destino não encontrado.' });
    }

    // Regra RF5: impede exclusão enquanto houver vínculo na tabela lancamentos
    const emUso = await FonteDestino.temLancamentosVinculados(id, req.usuarioId);
    if (emUso) {
      return res.status(409).json({
        erro: 'Não é possível excluir esta fonte/destino pois existem lançamentos vinculados.',
      });
    }

    await FonteDestino.excluir(id, req.usuarioId);
    // 204 No Content: remoção concluída sem corpo
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
