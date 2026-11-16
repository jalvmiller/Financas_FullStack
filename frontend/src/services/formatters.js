const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatarMoeda(valor) {
  return formatadorBRL.format(Number(valor) || 0);
}

export function formatarDataBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = String(dataISO).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}

export function formatarMesAno(refYYYYMM) {
  if (!refYYYYMM) return '';
  const [ano, mes] = String(refYYYYMM).split('-');
  const meses = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  const idx = Number(mes) - 1;
  return `${meses[idx] || mes}/${ano}`;
}

export function getMesAtualDatas() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const inicio = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
  const fim = new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
  return { inicio, fim };
}
