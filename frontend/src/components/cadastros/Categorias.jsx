import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { Campo } from '../ui/Campo';
import { Plus, Pencil, Trash2 } from 'lucide-react';

// --------------------------------------------------
// Categorias.jsx - CRUD de categorias (RF4)
// --------------------------------------------------
// 1. lista as categorias do usuário separadas por tipo (entrada/saida);
// 2. modal de criar/editar com tratamento de erro de validação/duplicidade (409);
// 3. exclusão com window.confirm e aviso caso exista lançamento vinculado;

export function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('saida');
  const [errosForm, setErrosForm] = useState({});
  const [erroModal, setErroModal] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setCarregando(true);
      setErroLista('');
      setCategorias(await api.get('/categorias'));
    } catch (err) {
      setErroLista(err.message || 'Erro ao carregar categorias.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirModal(cat = null) {
    setEditandoId(cat ? cat.id : null);
    setNome(cat ? cat.nome : '');
    setTipo(cat ? cat.tipo : 'saida');
    setErrosForm({});
    setErroModal('');
    setModalAberto(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErrosForm({});
    setErroModal('');

    if (!nome.trim()) {
      setErrosForm({ nome: 'O nome da categoria é obrigatório.' });
      return;
    }

    try {
      setSalvando(true);
      if (editandoId) {
        await api.put(`/categorias/${editandoId}`, { nome, tipo });
      } else {
        await api.post('/categorias', { nome, tipo });
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      if (err.campos && Object.keys(err.campos).length > 0) {
        setErrosForm(err.campos);
      } else {
        setErroModal(err.message || 'Erro ao salvar categoria.');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(cat) {
    if (!window.confirm(`Deseja realmente excluir a categoria "${cat.nome}"?`)) {
      return;
    }

    try {
      setErroLista('');
      await api.delete(`/categorias/${cat.id}`);
      await carregar();
    } catch (err) {
      setErroLista(err.message || 'Não foi possível excluir a categoria.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Categorias</h1>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {erroLista && <div className="alert-danger">{erroLista}</div>}

      <div className="card">
        {carregando ? (
          <p>Carregando categorias...</p>
        ) : categorias.length === 0 ? (
          <p className="text-muted">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th className="acoes-col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => {
                  const badgeClasse = cat.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida';
                  const badgeTexto = cat.tipo === 'entrada' ? 'Entrada' : 'Saída';

                  return (
                    <tr key={cat.id}>
                      <td>{cat.nome}</td>
                      <td>
                        <span className={`badge ${badgeClasse}`}>{badgeTexto}</span>
                      </td>
                      <td className="acoes-col">
                        <div className="acoes-btns">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirModal(cat)}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleExcluir(cat)}
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
        titulo={editandoId ? 'Editar Categoria' : 'Nova Categoria'}
        onFechar={() => setModalAberto(false)}
      >
        {erroModal && <div className="alert-danger">{erroModal}</div>}
        <form onSubmit={handleSalvar} noValidate>
          <Campo label="Nome" htmlFor="cat-nome" erro={errosForm.nome}>
            <input
              id="cat-nome"
              type="text"
              className={`form-control ${errosForm.nome ? 'is-invalid' : ''}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Supermercado, Salário..."
              maxLength={60}
              required
            />
          </Campo>

          <Campo label="Tipo" htmlFor="cat-tipo" erro={errosForm.tipo}>
            <select
              id="cat-tipo"
              className={`form-control ${errosForm.tipo ? 'is-invalid' : ''}`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="saida">Saída (Despesa)</option>
              <option value="entrada">Entrada (Receita)</option>
            </select>
          </Campo>

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

export default Categorias;
