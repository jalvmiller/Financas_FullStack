import { Router } from 'express';
import { Lancamento } from '../models/Lancamento.js';
import { Categoria } from '../models/Categoria.js';
import { FonteDestino } from '../models/FonteDestino.js';
import { autenticar } from '../middlewares/auth.js';
import { dataValidaISO, lerPeriodo } from '../config/utils.js';

const router = Router();
router.use(autenticar);

async function validarPayloadLancamento(req, res, next) {
  const tipo = req.body.tipo;
  const descricao = req.body.descricao;
  const valor = Number(req.body.valor);
  const data = req.body.data;
  const categoriaId = Number(req.body.categoriaId);
  const fonteDestinoId = Number(req.body.fonteDestinoId);
  const totalParcelas = Number(req.body.totalParcelas ?? 1);

  const campos = {};

  if (!tipo || !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }
  if (!descricao || !String(descricao).trim()) {
    campos.descricao = 'A descrição é obrigatória.';
  } else if (String(descricao).trim().length > 120) {
    campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';
  }
  if (Number.isNaN(valor) || valor <= 0) {
    campos.valor = 'O valor deve ser maior que zero.';
  }
  if (!data || !dataValidaISO(data)) {
    campos.data = 'Data inválida. Utilize o formato AAAA-MM-DD.';
  }
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    campos.categoriaId = 'A categoria é obrigatória.';
  }
  if (!Number.isInteger(fonteDestinoId) || fonteDestinoId <= 0) {
    campos.fonteDestinoId = 'A fonte/destino é obrigatória.';
  }
  if (!Number.isInteger(totalParcelas) || totalParcelas < 1 || totalParcelas > 48) {
    campos.totalParcelas = 'O número de parcelas deve estar entre 1 e 48.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    // Verifica posse da categoria e da fonte/destino (RF3)
    const categoria = await Categoria.buscarPorId(categoriaId, req.usuarioId);
    if (!categoria) {
      return res.status(404).json({
        erro: 'Categoria não encontrada.',
        campos: { categoriaId: 'Categoria não encontrada para este usuário.' },
      });
    }

    if (categoria.tipo !== tipo) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: {
          categoriaId: `A categoria informada é de ${categoria.tipo}, mas o lançamento é de ${tipo}.`,
        },
      });
    }

    const fonteDestino = await FonteDestino.buscarPorId(fonteDestinoId, req.usuarioId);
    if (!fonteDestino) {
      return res.status(404).json({
        erro: 'Fonte/Destino não encontrada.',
        campos: {
          fonteDestinoId: 'Fonte/Destino não encontrada para este usuário.',
        },
      });
    }

    if (totalParcelas > 1 && (fonteDestino.tipo !== 'cartao_credito' || tipo !== 'saida')) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: {
          totalParcelas: 'O parcelamento só é permitido em saídas no cartão de crédito.',
        },
      });
    }

    req.lancamentoValidado = {
      tipo,
      descricao,
      valor,
      data,
      categoriaId,
      fonteDestinoId,
      totalParcelas,
    };

    return next();
  } catch (erro) {
    return next(erro);
  }
}

router.get('/', async (req, res, next) => {
  try {
    const periodo = lerPeriodo(req.query);
    if (!periodo) {
      return res.status(400).json({ erro: 'Parâmetros de data inválidos.' });
    }

    const resultado = await Lancamento.listarPorUsuario(req.usuarioId, {
      ...periodo,
      tipo: req.query.tipo,
      categoriaId: req.query.categoriaId,
      fonteDestinoId: req.query.fonteDestinoId,
      pagina: Math.max(1, Number(req.query.pagina) || 1),
      limite: Math.min(100, Number(req.query.limite) || 15),
    });

    return res.json({ periodo, ...resultado });
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', validarPayloadLancamento, async (req, res, next) => {
  try {
    const criados = await Lancamento.criar({
      usuarioId: req.usuarioId,
      ...req.lancamentoValidado,
    });

    return res.status(201).json(criados.length === 1 ? criados[0] : { lancamentos: criados });
  } catch (erro) {
    return next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const lancamento = await Lancamento.buscarPorId(id, req.usuarioId);
    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }
    return res.json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

router.put('/:id', validarPayloadLancamento, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const atualizado = await Lancamento.atualizar(id, req.usuarioId, req.lancamentoValidado);
    if (!atualizado) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }
    return res.json(atualizado);
  } catch (erro) {
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const todasParcelas = req.query.todasParcelas === 'true';
    const excluido = await Lancamento.excluir(id, req.usuarioId, todasParcelas);
    if (!excluido) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
