// ----------------------------------------
// Trigger do script: "npm run db:setup"
// ----------------------------------------

// 1. imports:
// - fs: módulo nativo do Node.js para ler arquivos do sistema
//  de arquivos (ler schema.sql e seed.sql)
// - path: utilitário para construir caminhos de
//  arquivos independentes de SO (Windows usa \, Linux usa /)
// - fileURLToPath: converte URLs de módulos ES (import.meta.url)
//  no caminho do arquivo em disco,
//  necessário para recriar as variáveis __filename e
//  __dirname ausentes nativamente no ESM ("type": "module")
// - Client: diferente do Pool de db.js, usar Client porque é uma
//  conexão única, direta e temporária
// - dotenv: carrega as variáveis do .env
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  const dbName = process.env.DB_NAME || "financas";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "postgres";
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT) || 5432;

  console.log(
    `Conectando ao PostgreSQL em ${host}:${port} como usuário "${user}"...`,
  );

  // 2. ETAPA 1: Garantir que o banco de dados 'financas' exista,
  // conectar ao banco de sistema padrão 'postgres'
  // (que sempre existe em qualquer instalação)
  // para verificar se o banco
  // ('financas') já foi criado
  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: "postgres",
  });

  try {
    await adminClient.connect();
    // Consulta no catálogo do Postgres se o banco já existe
    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (res.rowCount === 0) {
      console.log(`Banco "${dbName}" não encontrado. Criando...`);
      // No PostgreSQL, CREATE DATABASE não aceita parâmetros preparados ($1),
      // por isso, usar interpolação direta com
      // aspas duplas de identificador SQL
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Banco "${dbName}" criado com sucesso!`);
    } else {
      console.log(`Banco "${dbName}" já existe.`);
    }
  } catch (err) {
    console.error(
      "Aviso ao verificar/criar banco no postgres admin:",
      err.message,
    );
  } finally {
    // Sempre encerra a conexão temporária
    await adminClient.end();
  }

  // 3. ETAPA 2: Executar DDL (schema.sql) e Carga Inicial (seed.sql)
  // Agora conectar diretamente no banco de dados da
  // aplicação ('financas')
  const appClient = new Client({
    host,
    port,
    user,
    password,
    database: dbName,
  });

  try {
    // Conectar diretamente ao banco de dados
    await appClient.connect();
    console.log(`Conectado ao banco "${dbName}".`);

    // Resolve o caminho absoluto até a pasta backend/database/
    const schemaPath = path.resolve(__dirname, "../../database/schema.sql");
    const seedPath = path.resolve(__dirname, "../../database/seed.sql");

    // Executa o schema.sql (DDL com tabelas, chaves estrangeiras, checks e índices)
    console.log("Executando schema.sql...");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await appClient.query(schemaSql);
    console.log("Tabelas e índices criados");

    // Executa o seed.sql
    // (2 usuários com senhas hash bcrypt e > 3 meses de lançamentos)
    console.log("Executando seed.sql...");
    const seedSql = fs.readFileSync(seedPath, "utf8");
    await appClient.query(seedSql);
    console.log("Dados iniciais inseridos com sucesso!");

    console.log("\nConfiguração do banco de dados concluída com sucesso!");
  } catch (err) {
    console.error("Erro ao executar scripts do banco:", err);
    process.exit(1);
  } finally {
    await appClient.end();
  }
}

// Chamada do setup
setup();
