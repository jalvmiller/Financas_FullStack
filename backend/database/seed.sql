-- Projeto 2 - Aplicação Full Stack de Controle Financeiro
-- Script de Carga Inicial (Seed) para Apresentação
-- Usuários cadastrados com senha: Senha123!

-- Limpa dados prévios
TRUNCATE TABLE lancamentos, fontes_destinos, categorias, usuarios RESTART IDENTITY CASCADE;

-- 1. Inserção de Usuários
-- Ana Silva (User 1) e Bruno Souza (User 2)
INSERT INTO usuarios (id, nome, email, cpf, senha_hash) VALUES
(1, 'Ana Silva', 'ana@email.com', '52998224725', '$2a$10$ody5t5EykNBahKwF/ncTXu0J4DF661TElz.kk15HbYKXTj6j3JAhC'),
(2, 'Bruno Souza', 'bruno@email.com', '10000000019', '$2a$10$ody5t5EykNBahKwF/ncTXu0J4DF661TElz.kk15HbYKXTj6j3JAhC');

ALTER SEQUENCE usuarios_id_seq RESTART WITH 3;

-- 2. Categorias de Ana Silva (User 1)
INSERT INTO categorias (id, usuario_id, nome, tipo) VALUES
(1, 1, 'Salário', 'entrada'),
(2, 1, 'Freelance', 'entrada'),
(3, 1, 'Rendimentos', 'entrada'),
(4, 1, 'Moradia', 'saida'),
(5, 1, 'Alimentação', 'saida'),
(6, 1, 'Mobilidade', 'saida'),
(7, 1, 'Saúde', 'saida'),
(8, 1, 'Lazer', 'saida'),
(9, 1, 'Educação', 'saida'),
(10, 1, 'Outros', 'saida');

-- Categorias de Bruno Souza (User 2)
INSERT INTO categorias (id, usuario_id, nome, tipo) VALUES
(11, 2, 'Salário', 'entrada'),
(12, 2, 'Rendimentos', 'entrada'),
(13, 2, 'Moradia', 'saida'),
(14, 2, 'Alimentação', 'saida'),
(15, 2, 'Mobilidade', 'saida'),
(16, 2, 'Lazer', 'saida');

ALTER SEQUENCE categorias_id_seq RESTART WITH 17;

-- 3. Fontes / Destinos de Ana Silva (User 1)
INSERT INTO fontes_destinos (id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva) VALUES
(1, 1, 'Conta Corrente', 'conta', NULL, NULL, NULL, FALSE),
(2, 1, 'Poupança / Reserva', 'conta', NULL, NULL, NULL, TRUE),
(3, 1, 'Cartão Nubank', 'cartao_credito', 3, 10, 5000.00, FALSE),
(4, 1, 'Visa Crédito', 'cartao_credito', 25, 5, 3500.00, FALSE);

-- Fontes / Destinos de Bruno Souza (User 2)
INSERT INTO fontes_destinos (id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva) VALUES
(5, 2, 'Conta Corrente Inter', 'conta', NULL, NULL, NULL, FALSE),
(6, 2, 'Cartão Inter Black', 'cartao_credito', 15, 22, 10000.00, FALSE);

ALTER SEQUENCE fontes_destinos_id_seq RESTART WITH 7;

-- 4. Lançamentos de Ana Silva (User 1) cobrindo mais de 3 meses (Setembro, Outubro, Novembro 2026)
-- Setembro 2026
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id) VALUES
(1, 'entrada', 'Salário Mensal', 5500.00, '2026-09-05', 1, 1),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-09-10', 4, 1),
(1, 'saida', 'Supermercado Mensal', 870.00, '2026-09-12', 5, 1),
(1, 'saida', 'Combustível e Transporte', 812.30, '2026-09-18', 6, 1),
(1, 'saida', 'Farmácia e Consulta', 250.00, '2026-09-22', 7, 1),
(1, 'saida', 'Jantar com Amigos', 180.00, '2026-09-27', 8, 3);

-- Outubro 2026 (Período de referência para comparação do RF7)
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id) VALUES
(1, 'entrada', 'Salário Mensal', 5500.00, '2026-10-05', 1, 1),
(1, 'entrada', 'Freelance Landing Page', 1200.00, '2026-10-15', 2, 1),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-10-10', 4, 1),
(1, 'saida', 'Supermercado e Feira', 980.50, '2026-10-14', 5, 1),
(1, 'saida', 'Posto de Gasolina e Uber', 769.50, '2026-10-20', 6, 1),
(1, 'saida', 'Cinema e Lanches', 210.00, '2026-10-26', 8, 3);

-- Novembro 2026 (Mês atual de referência)
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id) VALUES
(1, 'entrada', 'Salário Mensal', 5500.00, '2026-11-05', 1, 1),
(1, 'saida', 'Aluguel do Apartamento', 1500.00, '2026-11-10', 4, 1),
(1, 'saida', 'Supermercado Semana 1', 340.00, '2026-11-07', 5, 1);

-- Compra parcelada de Notebook no Cartão Nubank (fecha dia 3, vence dia 10)
-- Compra realizada em 2026-11-02 (antes do fechamento do dia 03/11):
-- 3 parcelas de R$ 100,00 no total (R$ 33,34 + R$ 33,33 + R$ 33,33)
-- UUID fixo para demonstração de grupo_parcelamento: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento) VALUES
(1, 'saida', 'Notebook Trabalho - 1/3', 33.34, '2026-11-02', 10, 3, 1, 3, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'),
(1, 'saida', 'Notebook Trabalho - 2/3', 33.33, '2026-11-02', 10, 3, 2, 3, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'),
(1, 'saida', 'Notebook Trabalho - 3/3', 33.33, '2026-11-02', 10, 3, 3, 3, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');

-- Lançamentos de Bruno Souza (User 2) para validação de isolamento de dados (RF3)
INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id) VALUES
(2, 'entrada', 'Salário Bruno', 7000.00, '2026-10-05', 11, 5),
(2, 'saida', 'Condomínio Bruno', 1200.00, '2026-10-08', 13, 5),
(2, 'saida', 'Restaurante Bruno', 450.00, '2026-10-15', 14, 6);
