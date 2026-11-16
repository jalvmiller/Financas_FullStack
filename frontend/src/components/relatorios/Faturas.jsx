import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatarMoeda, formatarDataBR, formatarMesAno } from '../../services/formatters';
import { CreditCard } from 'lucide-react';

// --------------------------------------------------
// Faturas.jsx - previsão de faturas de cartão (RF9)
// --------------------------------------------------
// 1. consulta /relatorios/faturas passando a quantidade de meses futuros (mínimo 3);
// 2. mostra por cartão o limite total, utilizado e disponível;
// 3. lista a fatura atual e as próximas com fechamento, vencimento, total e parcelas inclusas;

export function Faturas() {
  const [meses, setMeses] = useState(3);
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        setErro('');
        const res = await api.get(`/relatorios/faturas?meses=${meses}`);
        setDados(res.cartoes || []);
      } catch (err) {
        setErro(err.message || 'Erro ao carregar faturas dos cartões.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [meses]);

  return (
    <div>
      <div className="page-header">
        <h1>Faturas de Cartão de Crédito</h1>
        <div className="flex-center">
          <label htmlFor="filtro-meses">Previsão:</label>
          <select
            id="filtro-meses"
            className="form-control"
            style={{ width: 'auto' }}
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
          >
            <option value={3}>Atual + próximos 3 meses</option>
            <option value={6}>Atual + próximos 6 meses</option>
            <option value={12}>Atual + próximos 12 meses</option>
          </select>
        </div>
      </div>

      {erro && <div className="alert-danger">{erro}</div>}

      {carregando ? (
        <div className="card">Calculando faturas e limites...</div>
      ) : dados.length === 0 ? (
        <div className="card">
          <p className="text-muted">Você não possui cartões de crédito cadastrados.</p>
        </div>
      ) : (
        dados.map(({ cartao, faturas }) => {
          const pctUso =
            cartao.limite > 0
              ? Math.min(100, Math.round((cartao.limiteUtilizado / cartao.limite) * 100))
              : 0;

          return (
            <div key={cartao.id} className="card">
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div className="flex-center">
                  <CreditCard size={24} className="text-primary" />
                  <div>
                    <h2>{cartao.nome}</h2>
                    <span className="text-muted">
                      Fecha dia {cartao.diaFechamento} • Vence dia {cartao.diaVencimento}
                    </span>
                  </div>
                </div>

                <div className="flex-gap">
                  <div>
                    <span className="text-muted">Limite Total: </span>
                    <strong>{formatarMoeda(cartao.limite)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Utilizado: </span>
                    <strong className="text-danger">{formatarMoeda(cartao.limiteUtilizado)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Disponível: </span>
                    <strong className="text-success">
                      {formatarMoeda(cartao.limiteDisponivel)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="progress-bar-bg">
                <div
                  className={`progress-bar-fill ${pctUso > 85 ? 'alerta' : ''}`}
                  style={{ width: `${pctUso}%` }}
                />
              </div>

              <div className="grid-faturas">
                {faturas.map((f, idx) => (
                  <div key={f.referencia} className={`fatura-card ${idx === 0 ? 'atual' : ''}`}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <h3>
                        Fatura {formatarMesAno(f.referencia)}
                        {idx === 0 && (
                          <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>
                            Atual
                          </span>
                        )}
                      </h3>
                      <strong className={f.total > 0 ? 'text-danger' : 'text-muted'}>
                        {formatarMoeda(f.total)}
                      </strong>
                    </div>

                    <div className="text-muted" style={{ marginBottom: '0.75rem' }}>
                      Fechamento: {formatarDataBR(f.fechamento)} | Vencimento:{' '}
                      {formatarDataBR(f.vencimento)}
                    </div>

                    {f.lancamentos.length === 0 ? (
                      <p className="text-muted">Sem lançamentos previstos.</p>
                    ) : (
                      <ul className="fatura-lista">
                        {f.lancamentos.map((l) => (
                          <li key={l.id} className="fatura-item">
                            <div>
                              <span>{l.descricao}</span>
                              {l.totalParcelas > 1 && (
                                <span className="text-muted">
                                  {' '}
                                  — {l.parcelaAtual}/{l.totalParcelas}
                                </span>
                              )}
                              <div className="text-muted">
                                Compra em {formatarDataBR(l.dataCompra)} • {l.categoria}
                              </div>
                            </div>
                            <strong>{formatarMoeda(l.valor)}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Faturas;
