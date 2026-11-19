import { Router } from 'express';
import { Categoria } from '../models/Categoria.js';
import { autenticar } from '../middlewares/auth.js';

// --------------------------------------------------
// categorias.routes.js - CRUD de categorias (RF4)
// --------------------------------------------------
// 1. todas as rotas exigem JWT (router.use(autenticar)) e filtram por req.usuarioId (RF3);
// 2. validarCategoria: garante nome (até 60 chars) e tipo ('entrada' ou 'saida');
// 3. no DELETE, barra exclusão com 409 se houver lançamentos vinculados à categoria;

const router = Router();
// Aplica autenticação JWT em todas as rotas de /api/categorias
router.use(autenticar);

// Middleware local de validação antes do POST e PUT (RF4)
function validarCategoria(req, res, next) {
  const { nome, tipo } = req.body;
  const campos = {};

  if (!nome || !String(nome).trim()) {
    campos.nome = 'O nome da categoria é obrigatório.';
  } else if (String(nome).trim().length > 60) {
    campos.nome = 'O nome da categoria deve ter no máximo 60 caracteres.';
  }

  // Garante que tipo seja apenas um dos dois valores aceitos no CHECK do banco
  if (!tipo || !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}

// GET /api/categorias -> lista todas as categorias do usuário logado
router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.listarPorUsuario(req.usuarioId);
    return res.json(categorias);
  } catch (erro) {
    return next(erro);
  }
});

// POST /api/categorias -> cria nova categoria (se nome+tipo já existir, errorHandler converte 23505 em 409)
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

// PUT /api/categorias/:id -> atualiza categoria pertencente ao usuário logado
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

    // Se for null, o id não existe ou pertence a outro usuário (RF3 -> 404)
    if (!atualizada) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }

    return res.json(atualizada);
  } catch (erro) {
    return next(erro);
  }
});

// DELETE /api/categorias/:id -> exclui apenas se pertencer ao usuário e não tiver lançamentos vinculados
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

    // Regra RF4: impede exclusão com 409 Conflict se a categoria já estiver em uso
    const emUso = await Categoria.temLancamentosVinculados(id, req.usuarioId);
    if (emUso) {
      return res.status(409).json({
        erro: 'Não é possível excluir esta categoria pois existem lançamentos vinculados a ela.',
      });
    }

    await Categoria.excluir(id, req.usuarioId);
    // 204 No Content: remoção concluída sem corpo de resposta
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;
