import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatarMoeda } from '../../services/formatters';
import { Modal } from '../ui/Modal';
import { Campo } from '../ui/Campo';
import { Plus, Pencil, Trash2, CreditCard, Landmark, Briefcase } from 'lucide-react';

// --------------------------------------------------
// FontesDestinos.jsx - CRUD de contas, rendas e cartões (RF5)
// --------------------------------------------------
// 1. lista e gerencia contas, rendas e cartões de crédito do usuário;
// 2. exibe campos extras de fechamento, vencimento e limite quando o tipo for 'cartao_credito';
// 3. permite marcar uma conta comum como reserva de emergência (usada em SaudeFinanceira);

const TIPOS_FONTE = {
  cartao_credito: { label: 'Cartão de Crédito', classe: 'badge-saida', Icone: CreditCard },
  conta: { label: 'Conta', classe: 'badge-info', Icone: Landmark },
  renda: { label: 'Renda', classe: 'badge-entrada', Icone: Briefcase },
};

export function FontesDestinos() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    tipo: 'conta',
    dia_fechamento: '',
    dia_vencimento: '',
    limite: '',
    reserva: false,
  });

  const [errosForm, setErrosForm] = useState({});
  const [erroModal, setErroModal] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setCarregando(true);
      setErroLista('');
      setLista(await api.get('/fontes-destinos'));
    } catch (err) {
      setErroLista(err.message || 'Erro ao carregar fontes e destinos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirModal(item = null) {
    setEditandoId(item ? item.id : null);
    setForm({
      nome: item?.nome || '',
      tipo: item?.tipo || 'conta',
      dia_fechamento: item?.dia_fechamento ?? '',
      dia_vencimento: item?.dia_vencimento ?? '',
      limite: item?.limite ?? '',
      reserva: Boolean(item?.reserva),
    });
    setErrosForm({});
    setErroModal('');
    setModalAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErrosForm({});
    setErroModal('');

    const isCartao = form.tipo === 'cartao_credito';
    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      dia_fechamento: isCartao ? Number(form.dia_fechamento) : null,
      dia_vencimento: isCartao ? Number(form.dia_vencimento) : null,
      limite: isCartao ? Number(form.limite) : null,
      reserva: form.tipo === 'conta' ? form.reserva : false,
    };

    try {
      setSalvando(true);
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
      } else {
        await api.post('/fontes-destinos', payload);
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      if (err.campos && Object.keys(err.campos).length > 0) {
        setErrosForm(err.campos);
      } else {
        setErroModal(err.message || 'Erro ao salvar fonte/destino.');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(item) {
    if (!window.confirm(`Deseja realmente excluir "${item.nome}"?`)) {
      return;
    }

    try {
      setErroLista('');
      await api.delete(`/fontes-destinos/${item.id}`);
      await carregar();
    } catch (err) {
      setErroLista(err.message || 'Não foi possível excluir.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Fontes e Destinos</h1>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          <Plus size={18} /> Nova Fonte / Destino
        </button>
      </div>

      {erroLista && <div className="alert-danger">{erroLista}</div>}

      <div className="card">
        {carregando ? (
          <p>Carregando fontes e destinos...</p>
        ) : lista.length === 0 ? (
          <p className="text-muted">Nenhuma fonte ou destino cadastrado.</p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Detalhes</th>
                  <th className="acoes-col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => {
                  const info = TIPOS_FONTE[item.tipo] || TIPOS_FONTE.renda;
                  const Icone = info.Icone;

                  return (
                    <tr key={item.id}>
                      <td>
                        {item.nome}
                        {item.reserva && (
                          <span className="badge badge-entrada" style={{ marginLeft: '0.5rem' }}>
                            Reserva
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${info.classe} flex-center`}>
                          <Icone size={12} /> {info.label}
                        </span>
                      </td>
                      <td className="text-muted">
                        {item.tipo === 'cartao_credito' ? (
                          <>
                            Fecha dia <strong>{item.dia_fechamento}</strong> | Vence dia{' '}
                            <strong>{item.dia_vencimento}</strong> | Limite:{' '}
                            <strong>{formatarMoeda(item.limite)}</strong>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="acoes-col">
                        <div className="acoes-btns">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirModal(item)}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleExcluir(item)}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        aberto={modalAberto}
        titulo={editandoId ? 'Editar Fonte / Destino' : 'Nova Fonte / Destino'}
        onFechar={() => setModalAberto(false)}
      >
        {erroModal && <div className="alert-danger">{erroModal}</div>}
        <form onSubmit={handleSalvar} noValidate>
          <Campo label="Nome" htmlFor="fd-nome" erro={errosForm.nome}>
            <input
              id="fd-nome"
              type="text"
              className={`form-control ${errosForm.nome ? 'is-invalid' : ''}`}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Conta Corrente, Cartão Nubank..."
              maxLength={60}
              required
            />
          </Campo>

          <Campo label="Tipo" htmlFor="fd-tipo" erro={errosForm.tipo}>
            <select
              id="fd-tipo"
              className={`form-control ${errosForm.tipo ? 'is-invalid' : ''}`}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="conta">Conta (Corrente, Poupança, Dinheiro)</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="renda">Renda (Fonte de Entrada)</option>
            </select>
          </Campo>

          {form.tipo === 'conta' && (
            <div className="form-group flex-center">
              <input
                id="fd-reserva"
                type="checkbox"
                checked={form.reserva}
                onChange={(e) => setForm({ ...form, reserva: e.target.checked })}
              />
              <label htmlFor="fd-reserva" style={{ marginBottom: 0 }}>
                Considerar como Conta de Reserva de Emergência
              </label>
            </div>
          )}

          {form.tipo === 'cartao_credito' && (
            <div className="grid-2">
              <Campo label="Dia de Fechamento" htmlFor="fd-fech" erro={errosForm.dia_fechamento}>
                <input
                  id="fd-fech"
                  type="number"
                  min="1"
                  max="31"
                  className={`form-control ${errosForm.dia_fechamento ? 'is-invalid' : ''}`}
                  value={form.dia_fechamento}
                  onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
                  placeholder="1 a 31"
                  required
                />
              </Campo>

              <Campo label="Dia de Vencimento" htmlFor="fd-venc" erro={errosForm.dia_vencimento}>
                <input
                  id="fd-venc"
                  type="number"
                  min="1"
                  max="31"
                  className={`form-control ${errosForm.dia_vencimento ? 'is-invalid' : ''}`}
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                  placeholder="1 a 31"
                  required
                />
              </Campo>

              <div className="col-full">
                <Campo label="Limite do Cartão (R$)" htmlFor="fd-lim" erro={errosForm.limite}>
                  <input
                    id="fd-lim"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={`form-control ${errosForm.limite ? 'is-invalid' : ''}`}
                    value={form.limite}
                    onChange={(e) => setForm({ ...form, limite: e.target.value })}
                    placeholder="Ex: 5000.00"
                    required
                  />
                </Campo>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalAberto(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default FontesDestinos;
