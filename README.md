# Projeto - Aplicação Full Stack de Controle Financeiro Pessoal

**Disciplina:** Programação Web Full Stack
**Tipo:** Projeto Avaliativo

---

## 📌 Visão Geral

Aplicação Full Stack completa para gestão e controle financeiro pessoal. O sistema permite o cadastro seguro de usuários com autenticação JWT, controle de lançamentos de entradas e saídas, gestão de categorias e fontes/destinos (contas bancárias e cartões de crédito), parcelamento inteligente de compras com divisão em centavos, previsão dinâmica de faturas de cartão de crédito e relatórios analíticos com gráficos interativos.

## 📊 Alertas de Saúde Financeira

Os indicadores e dicas de `GET /api/saude-financeira` são calculados no back-end, seguindo os limites abaixo:

- **Taxa de poupança do mês** `(entradas - saídas) / entradas`: alerta se `< 10%`; elogio se `>= 10%`.
- **Comprometimento com cartões** `(faturas dos próximos 3 meses) / (renda média dos últimos 3 meses × 3)`: alerta se `> 30%`.
- **Reserva de emergência** `(saldo das contas com reserva = TRUE) / despesa média dos últimos 3 meses`: alerta se `< 3 meses`; elogio se `>= 3 meses`.
- **Projeção de saldo (próximos 6 meses):** soma a média líquida dos últimos 3 meses às parcelas futuras de cartão; gera alerta de perigo se qualquer mês ficar `< 0`.

---

## 🛠️ Tecnologias Utilizadas

### Back-end

- **Node.js** (v18+) com **Express**
- **PostgreSQL** com driver nativo `pg` (Pool de conexões e consultas parametrizadas)
- **Autenticação:** JSON Web Token (`jsonwebtoken`) e Hash seguro com Salt via `bcryptjs`
- **Segurança:** CORS restrito, sanitização, variáveis de ambiente com `dotenv` e proteção contra força bruta com `express-rate-limit`

### Front-end

- **React.js** com **Vite**
- **React Router DOM** (roteamento declarativo e rotas protegidas)
- **Context API** (`AuthContext`) para gestão de sessão e autenticação
- **Recharts** para renderização de gráficos analíticos (rosca, barras e linhas)
- **Lucide React** para iconografia

### IA

- **Antigravity** Utilizado na aproximação review-driven:
  - estrutura base backend-frontend;
  - implementação das funções de regras de negócio (operações com porcentagem, lógica de saúde financeira);
  - implementação do jwt e validação de rotas protegidas;
  - implementação dos relacionamentos do banco de dados e seeder;
  - implementação dos relacionamentos entre componentes do frontend.

---

## 📁 Estrutura do Projeto

```text
projeto2-financas/
├── backend/
│   ├── .env.example              # Modelo das variáveis de ambiente
│   ├── package.json
│   ├── database/
│   │   ├── schema.sql            # DDL com tabelas, chaves estrangeiras, UNIQUE e CHECKs
│   │   └── seed.sql              # Carga inicial com 2 usuários e > 3 meses de lançamentos
│   └── src/
│       ├── config/               # Pool de conexão pg, setup do banco de dados e utilitários puros
│       ├── middlewares/          # Autenticação JWT e middleware de erro centralizado
│       ├── models/               # Camada de acesso ao banco e regras de persistência
│       ├── routes/               # Rotas e controladores (sem pasta controllers)
│       └── server.js             # Entrada do servidor Express
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/           # Componentes e páginas (auth/, cadastros/, lancamentos/, relatorios/, ui/)
│       ├── contexts/             # AuthContext e gerenciamento global de estado
│       └── services/             # Wrapper de fetch (envio do JWT e logout no 401) e formatadores BRL/data
└── README.md
```

> **Decisões arquiteturais:**
>
> - Funções utilitárias puras de regras de negócio (`cpfValido` e `calcularFatura`) ficam em `backend/src/config/utils.js` para reaproveitamento.
> - **Parcelamento e Faturas (RF9):** cada parcela é gravada com a data original da compra (`data`) e o seu número (`parcela_atual`), e a fatura correspondente é calculada dinamicamente por `calcularFatura(data, cartao, parcela_atual)`.

---

## ⚙️ Configuração e Execução

### 1. Pré-requisitos

- Node.js instalado (v18+)
- PostgreSQL instalado e em execução (porta 5432)

### 2. Configurar o Back-end

1. Acesse a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` baseado no `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Ajuste as credenciais do seu PostgreSQL (`DB_USER`, `DB_PASSWORD`, `DB_PORT`) se necessário.

4. Setup do BD

   ```bash
   npm run db:setup
   ```

5. Subir server do Back-end

```bash
   npm run dev
```

backend disponível em `http://localhost:3000`.

---

### 3. Configurar o Front-end

1. Instalar dependências

```bash
   npm install
```

2. Subir front-end

```bash
   npm run dev
```

frontend disponível em `http://localhost:5173`.

---

## 🔑 Usuários Pré-cadastrados (Seed)

Para facilidade de testes e apresentação, o banco já inclui:

| Usuário         | E-mail            | CPF           | Senha       | Cenário de Teste                                                        |
| --------------- | ----------------- | ------------- | ----------- | ----------------------------------------------------------------------- |
| **Ana Silva**   | `ana@email.com`   | `52998224725` | `Senha123!` | Usuário completo com 3 meses de histórico, cartões e compras parceladas |
| **Bruno Souza** | `bruno@email.com` | `10000000019` | `Senha123!` | Usuário independente para validação de isolamento de dados (RF3)        |

---

## 🛣️ Rotas da API REST

Todas as rotas sob `/api/*` (exceto `/auth/cadastro` e `/auth/login`) exigem o header `Authorization: Bearer <token>`.

| Método                 | Rota                              | Descrição                                                        |
| ---------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `POST`                 | `/api/auth/cadastro`              | Cadastro de usuário com validação de CPF e unicidade             |
| `POST`                 | `/api/auth/login`                 | Login com rate limiting e emissão de JWT                         |
| `GET`                  | `/api/auth/me`                    | Dados do usuário logado                                          |
| `GET`, `POST`          | `/api/categorias`                 | Lista ou cria categorias do usuário                              |
| `PUT`, `DELETE`        | `/api/categorias/:id`             | Edita ou remove categoria (com proteção de vínculo)              |
| `GET`, `POST`          | `/api/fontes-destinos`            | Lista ou cria contas e cartões de crédito                        |
| `PUT`, `DELETE`        | `/api/fontes-destinos/:id`        | Edita ou remove fonte/destino                                    |
| `GET`                  | `/api/lancamentos`                | Lista com filtros (período, tipo, categoria, fonte) e paginação  |
| `POST`                 | `/api/lancamentos`                | Cria lançamento (suporte a parcelamento automático em transação) |
| `GET`, `PUT`, `DELETE` | `/api/lancamentos/:id`            | Detalhes, atualização ou exclusão de lançamentos                 |
| `GET`                  | `/api/relatorios/categorias`      | Gastos/receitas por categoria e comparação anterior              |
| `GET`                  | `/api/relatorios/fontes-destinos` | Entradas/saídas por conta e saldo                                |
| `GET`                  | `/api/relatorios/faturas`         | Previsão e detalhamento de faturas de cartão de crédito          |
| `GET`                  | `/api/saude-financeira`           | Indicadores, projeções e dicas financeiras (Desafio)             |
