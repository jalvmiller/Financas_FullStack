import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatarMoeda, formatarDataBR, getMesAtualDatas } from '../../services/formatters';
import { ResumoPeriodo } from '../ui/ResumoPeriodo';
import { PlusCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// --------------------------------------------------
// Dashboard.jsx - tela inicial com resumo do mês (10.7)
// --------------------------------------------------
// 1. busca os 5 últimos lançamentos e o consolidado de categorias do mês corrente;
// 2. exibe ResumoPeriodo (entradas, saídas, saldo), gráfico de rosca das saídas e lista recente;

const CORES = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

export function Dashboard() {
  const [dadosLanc, setDadosLanc] = useState(null);
  const [relCat, setRelCat] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const { inicio, fim } = getMesAtualDatas();
        const [resLanc, resCat] = await Promise.all([
          api.get(`/lancamentos?inicio=${inicio}&fim=${fim}&limite=5`),
          api.get(`/relatorios/categorias?inicio=${inicio}&fim=${fim}`),
        ]);
        setDadosLanc(resLanc);
        setRelCat(resCat);
      } catch (err) {
        setErro(err.message || 'Erro ao carregar resumo do mês.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return <div className="card">Carregando resumo financeiro...</div>;
  }
  if (erro) {
    return <div className="alert-danger">{erro}</div>;
  }

  const totais = dadosLanc?.totais || { entradas: 0, saidas: 0, saldo: 0 };
  const recentes = dadosLanc?.lancamentos || [];
  const categorias = relCat?.categorias || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Visão Geral do Mês</h1>
          <p className="text-muted">
            Período: {formatarDataBR(dadosLanc?.periodo?.inicio)} a{' '}
            {formatarDataBR(dadosLanc?.periodo?.fim)}
          </p>
        </div>
        <Link to="/lancamentos" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <PlusCircle size={18} />
          Novo Lançamento
        </Link>
      </div>

      <ResumoPeriodo
        entradas={totais.entradas}
        saidas={totais.saidas}
        saldo={totais.saldo}
        sufixo=" do Mês"
      />

      <div className="grid-auto">
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Saídas por Categoria</h3>
          {categorias.length === 0 ? (
            <p className="text-muted">Nenhuma saída registrada neste mês.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categorias}
                    dataKey="total"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categorias.map((_, index) => (
                      <Cell key={index} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatarMoeda(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3>Últimos Lançamentos</h3>
            <Link to="/lancamentos">Ver todos</Link>
          </div>
          {recentes.length === 0 ? (
            <p className="text-muted">Nenhum lançamento neste mês.</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((item) => {
                    const classeValor = item.tipo === 'entrada' ? 'text-success' : 'text-danger';
                    const sinal = item.tipo === 'entrada' ? '+' : '-';

                    return (
                      <tr key={item.id}>
                        <td>{formatarDataBR(item.data)}</td>
                        <td>
                          {item.descricao}
                          {item.total_parcelas > 1 && (
                            <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>
                              {item.parcela_atual}/{item.total_parcelas}
                            </span>
                          )}
                        </td>
                        <td className={classeValor}>
                          {sinal} {formatarMoeda(item.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
