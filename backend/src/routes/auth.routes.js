import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Usuario.js';
import { Categoria } from '../models/Categoria.js';
import { FonteDestino } from '../models/FonteDestino.js';
import { cpfValido } from '../config/utils.js';
import { autenticar } from '../middlewares/auth.js';

// --------------------------------------------------
// auth.routes.js - cadastro, login e /me (RF1 e RF2)
// --------------------------------------------------
// 1. validarCadastro: middleware local que checa nome, regex de e-mail, cpfValido e senha forte;
// 2. POST /cadastro: gera hash bcrypt, cria usuário + categorias/fonte padrão; 23505 vira 409 no campo;
// 3. POST /login: valida credenciais sem revelar se o e-mail existe (401) e emite JWT;
// 4. GET /me: protegido por JWT, devolve os dados públicos do usuário logado;

const router = Router();

/**
 * Middleware local para validação dos dados de cadastro (RF1).
 */

function validarCadastro(req, res, next) {
  const { nome, email, cpf, senha } = req.body;
  const campos = {};

  //Verifica se o nome não é só espaços em branco
  if (!nome || !nome.trim()) {
    campos.nome = 'O nome é obrigatório.';
  }

  //Verifica se o email é obrigatório e se o formato é válido
  if (!email || !email.trim()) {
    campos.email = 'O e-mail é obrigatório.';
  } else {
    // regex:
    // [^\s@]+: um ou mais caracteres que não são espaço em branco ou @
    // @: o símbolo de arroba
    // \.: o ponto literal
    // [^\s@]+: um ou mais caracteres que não são espaço em branco ou @
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // test é um método de regex que retorna true se o regex
    // for encontrado no texto
    if (!emailRegex.test(email.trim())) {
      campos.email = 'O formato do e-mail é inválido.';
    }
  }

  // Verifica se o cpf e o formato usado por ele é válido
  if (!cpf || !cpf.trim()) {
    campos.cpf = 'O CPF é obrigatório.';
  } else if (!cpfValido(cpf)) {
    campos.cpf = 'CPF inválido. Verifique os dígitos verificadores.';
  }

  if (!senha) {
    campos.senha = 'A senha é obrigatória.';
  } else {
    // Mínimo de 8 caracteres, contendo pelo menos uma letra e um número
    // regex:
    // (?=.*[A-Za-z]): verifica se a senha contém pelo menos uma letra
    // (?=.*\d): verifica se a senha contém pelo menos um número
    // .{8,}: verifica se a senha tem pelo menos 8 caracteres
    const senhaForteRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!senhaForteRegex.test(senha)) {
      campos.senha = 'A senha deve ter no mínimo 8 caracteres, contendo letras e números.';
    }
  }

  // Object.keys retorna um array com as chaves do objeto,
  // se o tamanho do array for maior que 0,
  // significa que há campos inválidos..
  // pois o retorno está condicionado a

  // já que se não houver campos inválidos,
  // o tamanho do array será 0
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos,
    });
  }

  next();
}

/**
 * POST /api/auth/cadastro
 * Cadastra um novo usuário, cria categorias e fontes padrão.
 */
router.post('/cadastro', validarCadastro, async (req, res, next) => {
  const { nome, email, cpf, senha } = req.body;

  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await Usuario.criar({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      cpf: cpf.replace(/\D/g, ''),
      senhaHash,
    });

    // Cria as categorias e fontes padrão (RF1)
    await Categoria.criarPadrao(usuario.id);
    await FonteDestino.criarPadrao(usuario.id);

    return res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    });
  } catch (erro) {
    // Tratamento de conflito de unicidade (código 23505 no PostgreSQL)
    if (erro.code === '23505') {
      const isCpf = erro.constraint?.includes('cpf') || erro.detail?.includes('cpf');
      const campo = isCpf ? 'cpf' : 'email';
      return res.status(409).json({
        // Retorno de conflito
        // O erro original do sequelize é:
        // "SequelizeUniqueConstraintError: Validation error"
        // campos é um objeto que retorna a propriedade específica que deu conflito.
        // [campo] é uma sintaxe para criar uma propriedade com o valor da variável campo
        // 'cpf', 'CPF', 'e-mail', ficam no retorno condicional
        // que define se o retorno vai usar 'cpf' ou 'e-mail'
        erro: 'Usuário já cadastrado.',
        campos: {
          [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.`,
        },
      });
    }
    return next(erro);
  }
});

/**
 * POST /api/auth/login
 * Realiza o login, verifica credenciais e devolve JWT (RF2).
 */
router.post('/login', async (req, res, next) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      campos: {
        // spread operator para adicionar propriedades ao objeto
        // como funciona:
        // !email é true se o email for null, undefined, '', 0, false
        // então se for true, adiciona a propriedade email
        // se for false, não adiciona a propriedade email
        // o mesmo vale para senha
        ...(!email ? { email: 'E-mail não informado.' } : {}),
        ...(!senha ? { senha: 'Senha não informada.' } : {}),
      },
    });
  }

  try {
    const usuario = await Usuario.buscarPorEmail(email);

    // Mensagem genérica para não revelar a existência do e-mail
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign(
      // Assinatura: cria o token com os dados do usuário
      // { sub: usuario.id, nome: usuario.nome, email: usuario.email } é o payload,
      // que é o conteúdo que será criptografado
      // process.env.JWT_SECRET é a chave secreta que será usada para criptografar o payload.
      // expiresIn: é expiração do token
      { sub: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (erro) {
    return next(erro);
  }
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado a partir do token.
 */
router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;
