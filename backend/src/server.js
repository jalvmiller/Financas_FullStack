import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import fontesDestinosRoutes from './routes/fontesDestinos.routes.js';
import lancamentosRoutes from './routes/lancamentos.routes.js';
import relatoriosRoutes from './routes/relatorios.routes.js';
import saudeFinanceiraRoutes from './routes/saudeFinanceira.routes.js';

// Var. de ambiente
dotenv.config();

// Inicializa servidor Express do backend
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS restrito ao frontend
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Permite o parse de JSON nas reqs
app.use(express.json());

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // limite de 20 requisições por IP
  message: {
    erro: 'Tente em 15 min.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rotas da API; o auth.routes aplica a proteção
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/saude-financeira', saudeFinanceiraRoutes);

// Rota de verificação de status do servidor
// Lembra a Dashboard do Spring Boot
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chamada do middleware de tratamento de erros
app.use(errorHandler);

// Caso não esteja no modo teste, inicia o servidor com modo de desenvolvimento
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} [http://localhost:${PORT}]`);
  });
}

export default app;
