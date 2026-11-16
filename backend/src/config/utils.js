// ----------------------------------
// utils.js - funções utilitárias
// ----------------------------------
// Atuação na estrutura:
// 1. centraliza funções matemáticas, cálculos de datas e validações puras
//   (sem dependência de banco de dados nem de objetos de requisição HTTP)
// 2. compartilhado entre as camadas 'models/' e 'routes/'

// 3. VALIDAÇÃO DE CPF (RF1)
export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, ""); // mantém só os dígitos (remove pontos e traço)

  // Rejeita strings que não tenham 11 dígitos ou sejam sequências repetidas 111.111.111-11
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return false;
  }

  // Função interna que calcula a soma ponderada decrescente e extrai o resto da divisão por 11
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  // Confere se o 10º e o 11º dígito batem com o cálculo
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// 4. Arredondar
// Evita dízimas periódicas (retorna number com 2 casas)
export function arredondar(numero) {
  return Number(numero.toFixed(2));
}

// 5. Validação de Data ISO
// Garante que a data enviada pela query string ou body seja válida no calendário real (ex: rejeita 2026-02-30)
export function dataValidaISO(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(str))) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

// 4. INTERVALO DO MÊS ATUAL
// Regra de negócio do RF6: a listagem e os relatórios usam por padrão o primeiro e o último dia do mês corrente
export function mesAtualRange() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth(); // 0 a 11
  return {
    inicio: new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10),
    fim: new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10),
    // AQUI ficava o bug de data: Dia 0 do próximo mês = último dia do mês atual
    // então precisa adicionar 1 ao mes
  };
}

// 5. LEITURA DE PERÍODO DA QUERY STRING
// Lê ?inicio=&fim= da requisição
// Se não vier, usa o mês corrente
// Se vier data inválida, retorna null
export function lerPeriodo(query) {
  const padrao = mesAtualRange();
  const inicio = query.inicio || padrao.inicio;
  const fim = query.fim || padrao.fim;
  if (!dataValidaISO(inicio) || !dataValidaISO(fim)) return null; // se data inválida impossível ler
  return { inicio, fim };
}

// 6. CÁLCULO DE FATURAS DE CARTÃO DE CRÉDITO (RF9)
// Utiliza datas em UTC para evitar distorções
// Devolve o último dia válido de um determinado mês (ex: 28 ou 29 em fev, 30 ou 31 nos demais)
function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate(); // getUTCDate é do Date
}

// Ajusta dias que não existem em meses curtos (ex: dia 31 em fevereiro vira 28 ou 29)
function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

/**
 * Aplica a regra de fechamento:
 * - Compra ANTES do dia de fechamento: entra na fatura
 * - Compra NO DIA de fechamento ou DEPOIS: entra na fatura do mês seguinte
 * - Parcela 'k' cai 'k - 1' meses após a primeira fatura
 * - Vencimento no mesmo mês do fechamento se vencimento > fechamento; caso contrário, mês seguinte
 *
 * @param {string} dataCompra - formato 'AAAA-MM-DD'
 * @param {{ diaFechamento: number, diaVencimento: number }} cartao
 * @param {number} numeroParcela - 1-based (padrão 1)
 * @returns {{ referencia: string, fechamento: string, vencimento: string }}
 */
export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split("-").map(Number);
  const m = mes - 1; // Mês base 0 (0 = Jan, 11 = Dez)
  const fechamentoDoMes = Math.min(
    cartao.diaFechamento,
    ultimoDiaDoMes(ano, m),
  );

  // Se comprou antes do corte, fecha este mês; se comprou no dia do corte ou após, fecha no mês seguinte
  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;
  mesFechamento += numeroParcela - 1; // Parcelas futuras avançam de mês em mês

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);

  // Define se o vencimento é no mesmo mês do fechamento ou no mês seguinte
  const mesVencimento =
    cartao.diaVencimento > cartao.diaFechamento
      ? mesFechamento
      : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  const iso = (d) => d.toISOString().slice(0, 10);
  return {
    referencia: iso(vencimento).slice(0, 7), // Referência contábil da fatura: 'AAAA-MM'
    fechamento: iso(fechamento),
    vencimento: iso(vencimento),
  };
}
