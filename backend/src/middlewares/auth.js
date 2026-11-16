import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  /**
    Faz a interceptação de tokens JWT em rotas protegidas.
    1. Espera o formato 'Bearer <token>'
    2. Separa o token
    3. Verifica se o token é válido
    4. Se for válido, injeta o id do usuário na req
    5. Se for inválido, retorna erro 401
   */
  // esquema é a palavra Bearer
  // token é o token em si
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.sub; // id do usuário dono do token
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
