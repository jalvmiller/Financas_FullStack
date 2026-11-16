import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatarMoeda, formatarMesAno } from '../../services/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// --------------------------------------------------
// SaudeFinanceira.jsx - página do desafio extra (10.5.10)
// --------------------------------------------------
// 1. consome /saude-financeira (toda a conta e geração das dicas vem pronta do servidor);
// 2. exibe aviso educativo obrigatório, 4 cards de indicadores, gráfico de projeção (6 meses) e dicas;

const CLASSES_DICA = {
  sucesso: 'alert-success',
  perigo: 'alert-danger',
  alerta: 'alert-warning',
  info: 'alert-info',
};

export function SaudeFinanceira() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        setErro('');
        setDados(await api.get('/saude-financeira'));
      } catch (err) {
        setErro(err.message || 'Erro ao carregar análise de saúde financeira.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return <div className="card">Analisando sua saúde financeira...</div>;
  }
  if (erro) {
    return <div className="alert-danger">{erro}</div>;
  }
  if (!dados) return null;

  const { indicadores, projecao, dicas, avisoEducativo } = dados;

  const dadosGrafico = projecao.map((p) => ({
    ...p,
    mesFormatado: formatarMesAno(p.mes),
  }));

  function renderIconeDica(tipo) {
    if (tipo === 'sucesso') return <CheckCircle2 size={18} />;
    if (tipo === 'perigo' || tipo === 'alerta') {
      return <AlertTriangle size={18} />;
    }
    return <Info size={18} />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Saúde Financeira</h1>
      </div>

      <div className="alert-info flex-center">
        <Info size={20} />
        <span>{avisoEducativo}</span>
      </div>

      <div className="grid-cards">
        <div className="summary-card">
          <div className="label">Taxa de Poupança (Mês)</div>
          <div
            className={`value ${indicadores.taxaPoupanca >= 10 ? 'text-success' : 'text-danger'}`}
          >
            {indicadores.taxaPoupanca}%
          </div>
          <div className="text-muted">Meta sugerida: ≥ 10%</div>
        </div>

        <div className="summary-card">
          <div className="label">Comprometimento c/ Cartões</div>
          <div
            className={`value ${indicadores.comprometimentoCartao <= 30 ? 'text-primary' : 'text-danger'}`}
          >
            {indicadores.comprometimentoCartao}%
          </div>
          <div className="text-muted">Próximos 3 meses sobre renda média</div>
        </div>

        <div className="summary-card">
          <div className="label">Parcelas Futuras</div>
          <div className="value text-danger">{formatarMoeda(indicadores.totalParcelasFuturas)}</div>
          <div className="text-muted">Total a vencer nos cartões</div>
        </div>

        <div className="summary-card">
          <div className="label">Reserva de Emergência</div>
          <div
            className={`value ${indicadores.mesesReserva >= 3 ? 'text-success' : 'text-danger'}`}
          >
            {indicadores.mesesReserva} meses
          </div>
          <div className="text-muted">
            Saldo em reserva: {formatarMoeda(indicadores.valorReserva)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>Projeção de Saldo para os Próximos 6 Meses</h2>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Baseado na média dos últimos 3 meses (Renda média:{' '}
          {formatarMoeda(indicadores.rendaMediaMensal)} | Despesa média:{' '}
          {formatarMoeda(indicadores.despesaMediaMensal)}) + parcelas de cartão já conhecidas.
        </p>

        <div className="chart-box">
          <ResponsiveContainer>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mesFormatado" />
              <YAxis />
              <Tooltip formatter={(val) => formatarMoeda(val)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="saldoProjetado"
                name="Saldo Projetado"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Diagnóstico e Dicas Personalizadas</h2>
        {dicas.length === 0 ? (
          <p className="text-muted">
            Continue registrando seus lançamentos para receber diagnósticos.
          </p>
        ) : (
          <div className="dicas-lista">
            {dicas.map((dica, i) => (
              <div
                key={i}
                className={`${CLASSES_DICA[dica.tipo] || 'alert-info'} flex-center`}
                style={{ marginBottom: 0, alignItems: 'flex-start' }}
              >
                <div>{renderIconeDica(dica.tipo)}</div>
                <div>
                  <strong style={{ display: 'block' }}>{dica.titulo}</strong>
                  <span>{dica.mensagem}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SaudeFinanceira;
