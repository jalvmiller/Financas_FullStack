import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { getMesAtualDatas } from '../../services/formatters';
import { ResumoPeriodo } from '../ui/ResumoPeriodo';
import { FiltrosLancamentos } from './FiltrosLancamentos';
import { TabelaLancamentos } from './TabelaLancamentos';
import { ModalLancamento } from './ModalLancamento';
import { ModalExcluirLancamento } from './ModalExcluirLancamento';
import { Plus } from 'lucide-react';

// --------------------------------------------------
// Lancamentos.jsx - página principal de movimentações (RF6)
// --------------------------------------------------
// 1. concentra o estado (filtros, lista, paginação, modais) e todas as chamadas à API de /lancamentos;
// 2. passa dados e callbacks para os subcomponentes visuais (Filtros, Tabela e Modais);

const hoje = () => new Date().toISOString().slice(0, 10);

export function Lancamentos() {
  const mesPadrao = getMesAtualDatas();

  const [filtros, setFiltros] = useState({
    inicio: mesPadrao.inicio,
    fim: mesPadrao.fim,
    tipo: '',
    categoriaId: '',
    fonteDestinoId: '',
    pagina: 1,
  });

  const [lancamentos, setLancamentos] = useState([]);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 1, total: 0 });

  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    tipo: 'saida',
    descricao: '',
    valor: '',
    data: hoje(),
    categoriaId: '',
    fonteDestinoId: '',
    totalParcelas: 1,
  });
  const [errosForm, setErrosForm] = useState({});
  const [erroModal, setErroModal] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [itemExcluir, setItemExcluir] = useState(null);

  async function carregarAuxiliares() {
    try {
      const [cats, fds] = await Promise.all([api.get('/categorias'), api.get('/fontes-destinos')]);
      setCategorias(cats);
      setFontes(fds);
    } catch (err) {
      console.error('Erro ao carregar auxiliares:', err);
    }
  }

  async function carregarLancamentos(filtrosAtuais = filtros) {
    try {
      setCarregando(true);
      setErroLista('');
      // Envia apenas os filtros preenchidos
      const params = new URLSearchParams();
      Object.entries(filtrosAtuais).forEach(([chave, valor]) => {
        if (valor) params.append(chave, String(valor));
      });

      const res = await api.get(`/lancamentos?${params.toString()}`);
      setLancamentos(res.lancamentos);
      setTotais(res.totais);
      setPaginacao(res.paginacao);
    } catch (err) {
      setErroLista(err.message || 'Erro ao carregar lançamentos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAuxiliares();
  }, []);

  useEffect(() => {
    carregarLancamentos(filtros);
  }, [filtros]);

  function handleFiltroChange(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor, pagina: 1 }));
  }

  function abrirModal(item = null) {
    const catPadrao = categorias.find((c) => c.tipo === 'saida')?.id || '';
    const fontePadrao = fontes[0]?.id || '';

    setEditandoId(item ? item.id : null);
    setForm({
      tipo: item ? item.tipo : 'saida',
      descricao: item ? item.descricao : '',
      valor: item ? item.valor : '',
      data: item ? item.data : hoje(),
      categoriaId: item ? item.categoria_id : catPadrao,
      fonteDestinoId: item ? item.fonte_destino_id : fontePadrao,
      totalParcelas: item ? item.total_parcelas || 1 : 1,
    });
    setErrosForm({});
    setErroModal('');
    setModalAberto(true);
  }

  function handleTipoFormChange(novoTipo) {
    const primeiraCat = categorias.find((c) => c.tipo === novoTipo)?.id || '';
    setForm((prev) => ({
      ...prev,
      tipo: novoTipo,
      categoriaId: primeiraCat,
      totalParcelas: novoTipo === 'entrada' ? 1 : prev.totalParcelas,
    }));
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErrosForm({});
    setErroModal('');

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: Number(form.valor),
      data: form.data,
      categoriaId: Number(form.categoriaId),
      fonteDestinoId: Number(form.fonteDestinoId),
      totalParcelas: editandoId ? 1 : Number(form.totalParcelas || 1),
    };

    try {
      setSalvando(true);
      if (editandoId) {
        await api.put(`/lancamentos/${editandoId}`, payload);
      } else {
        await api.post('/lancamentos', payload);
      }
      setModalAberto(false);
      await carregarLancamentos();
    } catch (err) {
      if (err.campos && Object.keys(err.campos).length > 0) {
        setErrosForm(err.campos);
      } else {
        setErroModal(err.message || 'Erro ao salvar lançamento.');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(todasParcelas = false) {
    if (!itemExcluir) return;
    try {
      setErroLista('');
      const query = todasParcelas ? '?todasParcelas=true' : '';
      await api.delete(`/lancamentos/${itemExcluir.id}${query}`);
      setItemExcluir(null);
      await carregarLancamentos();
    } catch (err) {
      setErroLista(err.message || 'Erro ao excluir lançamento.');
      setItemExcluir(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lançamentos</h1>
        <button className="btn btn-primary" onClick={() => abrirModal()}>
          <Plus size={18} /> Novo Lançamento
        </button>
      </div>

      <FiltrosLancamentos
        filtros={filtros}
        categorias={categorias}
        fontes={fontes}
        onChange={handleFiltroChange}
      />

      <ResumoPeriodo
        entradas={totais.entradas}
        saidas={totais.saidas}
        saldo={totais.saldo}
        sufixo=" no Período"
      />

      {erroLista && <div className="alert-danger">{erroLista}</div>}

      <div className="card">
        {carregando ? (
          <p>Carregando lançamentos...</p>
        ) : lancamentos.length === 0 ? (
          <p className="text-muted">Nenhum lançamento encontrado para os filtros selecionados.</p>
        ) : (
          <TabelaLancamentos
            lancamentos={lancamentos}
            paginacao={paginacao}
            onEditar={abrirModal}
            onExcluir={setItemExcluir}
            onPagina={(pagina) => setFiltros((prev) => ({ ...prev, pagina }))}
          />
        )}
      </div>

      <ModalLancamento
        aberto={modalAberto}
        editando={Boolean(editandoId)}
        form={form}
        setForm={setForm}
        erros={errosForm}
        erroModal={erroModal}
        salvando={salvando}
        categorias={categorias}
        fontes={fontes}
        onTipoChange={handleTipoFormChange}
        onSalvar={handleSalvar}
        onFechar={() => setModalAberto(false)}
      />

      <ModalExcluirLancamento
        item={itemExcluir}
        onConfirmar={confirmarExclusao}
        onFechar={() => setItemExcluir(null)}
      />
    </div>
  );
}

export default Lancamentos;
