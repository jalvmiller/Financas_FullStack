import { Router } from 'express';
import { Categoria } from '../models/Categoria.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();
router.use(autenticar);

function validarCategoria(req, res, next) {
  const { nome, tipo } = req.body;
  const campos = {};

  if (!nome || !String(nome).trim()) {
    campos.nome = 'O nome da categoria é obrigatório.';
  } else if (String(nome).trim().length > 60) {
    campos.nome = 'O nome da categoria deve ter no máximo 60 caracteres.';
  }

  if (!tipo || !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}

router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.listarPorUsuario(req.usuarioId);
    return res.json(categorias);
  } catch (erro) {
    return next(erro);
  }
});

router.post('/', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await Categoria.criar({
      usuarioId: req.usuarioId,
      nome: req.body.nome,
      tipo: req.body.tipo,
    });
    return res.status(201).json(categoria);
  } catch (erro) {
    return next(erro);
  }
});

router.put('/:id', validarCategoria, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const atualizada = await Categoria.atualizar(id, req.usuarioId, {
      nome: req.body.nome,
      tipo: req.body.tipo,
    });

    if (!atualizada) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }

    return res.json(atualizada);
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
    const existente = await Categoria.buscarPorId(id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }

    const emUso = await Categoria.temLancamentosVinculados(id, req.usuarioId);
    if (emUso) {
      return res.status(409).json({
        erro: 'Não é possível excluir esta categoria pois existem lançamentos vinculados a ela.',
      });
    }

    await Categoria.excluir(id, req.usuarioId);
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
