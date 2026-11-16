import React from 'react';
import { formatarMoeda } from '../../services/formatters';
import { Modal } from '../ui/Modal';
import { Campo } from '../ui/Campo';

// --------------------------------------------------
// ModalLancamento.jsx - formulário de criar/editar lançamento (RF6)
// --------------------------------------------------
// 1. filtra as categorias compatíveis com o tipo selecionado (entrada ou saida);
// 2. libera o campo de parcelas (1 a 48x) só quando é criação de saída no cartao_credito;
// 3. mostra erros de validação devolvidos pelo back-end direto nos campos;

export function ModalLancamento({
  aberto,
  editando,
  form,
  setForm,
  erros,
  erroModal,
  salvando,
  categorias,
  fontes,
  onTipoChange,
  onSalvar,
  onFechar,
}) {
  const categoriasDoTipo = categorias.filter((c) => c.tipo === form.tipo);
  const fonteSelecionada = fontes.find((f) => f.id === Number(form.fonteDestinoId));
  const podeParcelar =
    !editando && form.tipo === 'saida' && fonteSelecionada?.tipo === 'cartao_credito';

  // Atualiza um único campo do formulário
  const atualizar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  // Classe de validação do input
  const cls = (campo) => `form-control ${erros[campo] ? 'is-invalid' : ''}`;

  return (
    <Modal
      aberto={aberto}
      titulo={editando ? 'Editar Lançamento' : 'Novo Lançamento'}
      onFechar={onFechar}
    >
      {erroModal && <div className="alert-danger">{erroModal}</div>}
      <form onSubmit={onSalvar} noValidate>
        <Campo label="Tipo" erro={erros.tipo}>
          <select
            className={cls('tipo')}
            value={form.tipo}
            onChange={(e) => onTipoChange(e.target.value)}
          >
            <option value="saida">Saída (Despesa)</option>
            <option value="entrada">Entrada (Receita)</option>
          </select>
        </Campo>

        <Campo label="Descrição" erro={erros.descricao}>
          <input
            type="text"
            className={cls('descricao')}
            value={form.descricao}
            onChange={atualizar('descricao')}
            placeholder="Ex: Supermercado, Notebook..."
            maxLength={120}
            required
          />
        </Campo>

        <div className="grid-2">
          <Campo label="Valor (R$)" erro={erros.valor}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={cls('valor')}
              value={form.valor}
              onChange={atualizar('valor')}
              required
            />
          </Campo>

          <Campo label="Data" erro={erros.data}>
            <input
              type="date"
              className={cls('data')}
              value={form.data}
              onChange={atualizar('data')}
              required
            />
          </Campo>
        </div>

        <Campo label="Categoria" erro={erros.categoriaId}>
          <select
            className={cls('categoriaId')}
            value={form.categoriaId}
            onChange={atualizar('categoriaId')}
            required
          >
            <option value="">Selecione...</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Fonte / Destino" erro={erros.fonteDestinoId}>
          <select
            className={cls('fonteDestinoId')}
            value={form.fonteDestinoId}
            onChange={atualizar('fonteDestinoId')}
            required
          >
            <option value="">Selecione...</option>
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} ({f.tipo === 'cartao_credito' ? 'Cartão' : f.tipo})
              </option>
            ))}
          </select>
        </Campo>

        {podeParcelar && (
          <Campo label="Parcelas (1 a 48x)" erro={erros.totalParcelas}>
            <input
              type="number"
              min="1"
              max="48"
              className={cls('totalParcelas')}
              value={form.totalParcelas}
              onChange={atualizar('totalParcelas')}
            />
            {form.valor > 0 && form.totalParcelas > 1 && (
              <span className="text-muted">
                {form.totalParcelas}x de aproximadamente{' '}
                {formatarMoeda(form.valor / form.totalParcelas)}
              </span>
            )}
          </Campo>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
