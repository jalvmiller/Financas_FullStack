// ------------------------------------------
// db.js - conexão e gerenciamento do Pool
// ------------------------------------------
// Atuação na estrutura:
// 1. Ponto único de acesso ao banco de dados para toda a camada 'models/'.
// 2. Configura o pool de conexões (exigência não funcional 10.8) e serialização
//   de tipos do banco para JavaScript
// 3. imports:
// - pkg ("pg"): driver oficial nativo do PostgreSQL (node-postgres).
//   Importado como objeto completo porque o pacote usa padrão
//  CommonJS internamente
// - dotenv: lê o arquivo .env da raiz
import pkg from "pg";
import dotenv from "dotenv";

// variáveis de ambiente
dotenv.config();

// - Pool: gerenciador que mantém várias conexões abertas reutilizáveis,
//  evita o custo de abrir e fechar conexão TCP a cada requisição
// - types: registro interno de parsers que convertem tipos
//  SQL para tipos JavaScript
const { Pool, types } = pkg;

// 2. Type Parsers:
// Por padrão, o node-postgres devolve
// NUMERIC/DECIMAL (OID 1700) e DATE (OID 1082) como strings,
// para evitar que o JS perca precisão ou altere o dia por causa do
// fuso horário
// - OID 1700 (NUMERIC):
//  converte direto com parseFloat para virar 'number'
// - OID 1082 (DATE): manter como string 'AAAA-MM-DD' pura,
// sem passar pelo Date() do JS (converteria para UTC direto)
types.setTypeParser(1700, parseFloat);
types.setTypeParser(1082, (valor) => valor);

// 3. CRIAÇÃO DO POOL:
// Dá preferência para a connection string comum
// Se não houver, monta com os parâmetros
// individuais vindos do .env
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "financas",
      },
);

// Evento disparado por erro
pool.on("error", (err) => {
  console.error("Erro inesperado no pool do PostgreSQL:", err);
});

// 4. FUNÇÕES PARA OS MODELS:
// - query(text, params): consulta simples. O pool empresta uma conexão, executa
//   a consulta parametrizada ($1, $2...) e devolve a conexão ao pool

// - getClient(): usado em Lancamento.js para transações manuais (BEGIN, COMMIT, ROLLBACK),
//   onde várias operações precisam obrigatoriamente rodar na mesma conexão
export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export default pool;
