import { query } from '../config/db.js';

export const Usuario = {
  /*
    Criação de um usuário:
    - nome: string, mínimo 3 caracteres
    - email: string, mínimo 5 caracteres, formato de e-mail válido, obrigatório
    - cpf: string, 11 dígitos, obrigatório
    - senhaHash: string, mínimo 6 caracteres
    1. Marcação com $ serve para receber os parâmetros respectivamente
    2. RETURNING é para retornar os dados do usuário criado..
    criado_em não foi passado como param, pois é gerado no BD
    3. o replace é para remover os caracteres não numéricos do cpf, regEx
    */
  async criar({ nome, email, cpf, senhaHash }) {
    const text = `
      INSERT INTO usuarios (nome, email, cpf, senha_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, cpf, criado_em
    `;
    const params = [nome.trim(), email.trim().toLowerCase(), cpf.replace(/\D/g, ''), senhaHash];
    // retorno é armazenado, destruct consegue retirar o
    // objeto que têm os dados do RETURNING..

    // Contraste com o Categoria.js, onde por ser seed,
    // não há um conjunto de parâmetros contidos em array
    // que assumem valor dinâmico... e sim um array
    // predefinido que assume os valores de 'nome' e
    // 'tipo' em cada instância de cada objeto do array.
    const { rows } = await query(text, params);
    return rows[0];
  },

  /**
    Busca de usuário:
    1. Usa o id, via $1
   */
  async buscarPorEmail(email) {
    const text = `
      SELECT id, nome, email, cpf, senha_hash, criado_em
      FROM usuarios
      WHERE email = $1
    `;
    // Mesmo padrão do anterior, SELECT já retorna sem o RETURNING
    // e existe o || null
    const { rows } = await query(text, [email.trim().toLowerCase()]);
    return rows[0] || null;
  },

  /**
    Busca de usuário pelo cpf:
    1. Usa o CPF, via $1
   */
  async buscarPorCpf(cpf) {
    const text = `
      SELECT id, nome, email, cpf
      FROM usuarios
      WHERE cpf = $1
    `;
    // regex, para remover os caracteres não numéricos
    const { rows } = await query(text, [cpf.replace(/\D/g, '')]);
    return rows[0] || null;
  },

  /**
    Busca de usuário pelo Id
    1. Usa o Id, via $1
   */
  async buscarPorId(id) {
    const text = `
      SELECT id, nome, email, cpf, criado_em
      FROM usuarios
      WHERE id = $1
    `;
    const { rows } = await query(text, [id]);
    return rows[0] || null;
  },
};

export default Usuario;
