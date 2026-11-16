import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatarMoeda, formatarDataBR, getMesAtualDatas } from '../../services/formatters';
import { Campo } from '../ui/Campo';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// --------------------------------------------------
// Relatorios.jsx - relatórios por categoria e fonte/destino (RF7 e RF8)
// --------------------------------------------------
// 1. busca as agregações prontas do back-end para o período escolhido (padrão: mês atual);
// 2. RF7: gráfico de rosca das saídas, percentuais, variação vs período anterior e tabela de entradas;
// 3. RF8: gráfico de barras e tabela com entradas, saídas e saldo por fonte/destino;

const CORES = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

export function Relatorios() {
  const mesPadrao = getMesAtualDatas();
  const [inicio, setInicio] = useState(mesPadrao.inicio);
  const [fim, setFim] = useState(mesPadrao.fim);

  const [relCategorias, setRelCategorias] = useState(null);
  const [relFontes, setRelFontes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      if (!inicio || !fim) return;
      try {
        setCarregando(true);
        setErro('');
        const [catData, fdData] = await Promise.all([
          api.get(`/relatorios/categorias?inicio=${inicio}&fim=${fim}`),
          api.get(`/relatorios/fontes-destinos?inicio=${inicio}&fim=${fim}`),
        ]);
        setRelCategorias(catData);
        setRelFontes(fdData);
      } catch (err) {
        setErro(err.message || 'Erro ao gerar relatórios.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [inicio, fim]);

  function renderVariacao(variacao) {
    if (variacao === 0) return <span className="text-muted">Estável</span>;
    if (variacao > 0) {
      return <span className="text-danger">+{formatarMoeda(variacao)} (Aumento)</span>;
    }
    return <span className="text-success">{formatarMoeda(variacao)} (Redução)</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios Financeiros</h1>
      </div>

      <div className="card">
        <div className="flex-gap">
          <Campo label="Data Inicial">
            <input
              type="date"
              className="form-control"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </Campo>
          <Campo label="Data Final">
            <input
              type="date"
              className="form-control"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </Campo>
          {relCategorias?.periodoAnterior && (
            <div className="text-muted">
              Comparando com período anterior:{' '}
              <strong>
                {formatarDataBR(relCategorias.periodoAnterior.inicio)} a{' '}
                {formatarDataBR(relCategorias.periodoAnterior.fim)}
              </strong>
            </div>
          )}
        </div>
      </div>

      {erro && <div className="alert-danger">{erro}</div>}

      {carregando ? (
        <div className="card">Calculando relatórios...</div>
      ) : (
        <>
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>
              Saídas por Categoria (Total: {formatarMoeda(relCategorias?.totalSaidas)})
            </h2>

            {relCategorias?.categorias?.length === 0 ? (
              <p className="text-muted">Nenhuma saída registrada no período.</p>
            ) : (
              <div className="grid-auto">
                <div className="chart-box">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={relCategorias.categorias}
                        dataKey="total"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {relCategorias.categorias.map((_, idx) => (
                          <Cell key={idx} fill={CORES[idx % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatarMoeda(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Total</th>
                        <th>%</th>
                        <th>Período Ant.</th>
                        <th>Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relCategorias.categorias.map((c) => (
                        <tr key={c.id}>
                          <td>{c.nome}</td>
                          <td>{formatarMoeda(c.total)}</td>
                          <td>{c.percentual}%</td>
                          <td className="text-muted">{formatarMoeda(c.periodoAnterior)}</td>
                          <td>{renderVariacao(c.variacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>
              Entradas por Categoria (Total: {formatarMoeda(relCategorias?.totalEntradas)})
            </h2>
            {relCategorias?.entradas?.length === 0 ? (
              <p className="text-muted">Nenhuma entrada registrada no período.</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Total Recebido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relCategorias.entradas.map((e) => (
                      <tr key={e.id}>
                        <td>{e.nome}</td>
                        <td className="text-success">{formatarMoeda(e.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Movimentação por Fonte / Destino</h2>

            {relFontes?.fontesDestinos?.length === 0 ? (
              <p className="text-muted">Nenhuma fonte ou destino cadastrado.</p>
            ) : (
              <>
                <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
                  <ResponsiveContainer>
                    <BarChart data={relFontes.fontesDestinos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis />
                      <Tooltip formatter={(val) => formatarMoeda(val)} />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas" fill="#16a34a" />
                      <Bar dataKey="saidas" name="Saídas" fill="#dc2626" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Fonte / Destino</th>
                        <th>Tipo</th>
                        <th>Entradas</th>
                        <th>Saídas</th>
                        <th>Saldo no Período</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relFontes.fontesDestinos.map((f) => {
                        const classeSaldo = f.saldo >= 0 ? 'text-primary' : 'text-danger';
                        return (
                          <tr key={f.id}>
                            <td>{f.nome}</td>
                            <td className="text-muted">{f.tipo}</td>
                            <td className="text-success">{formatarMoeda(f.entradas)}</td>
                            <td className="text-danger">{formatarMoeda(f.saidas)}</td>
                            <td className={classeSaldo}>{formatarMoeda(f.saldo)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Relatorios;
