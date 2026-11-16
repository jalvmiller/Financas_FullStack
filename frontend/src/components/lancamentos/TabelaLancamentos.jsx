import React from 'react';
import { formatarMoeda, formatarDataBR } from '../../services/formatters';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

// --------------------------------------------------
// TabelaLancamentos.jsx - tabela paginada de lançamentos (RF6)
// --------------------------------------------------
// 1. exibe os registros formatados (data BR, valor em R$ e badge de parcela quando houver);
// 2. renderiza botões de editar/excluir por linha e controles de página anterior/próxima;

export function TabelaLancamentos({ lancamentos, paginacao, onEditar, onExcluir, onPagina }) {
  return (
    <>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Fonte / Destino</th>
              <th>Valor</th>
              <th className="acoes-col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((item) => {
              const entrada = item.tipo === 'entrada';
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
                  <td>{item.categoria_nome}</td>
                  <td>{item.fonte_destino_nome}</td>
                  <td className={entrada ? 'text-success' : 'text-danger'}>
                    {entrada ? '+' : '-'} {formatarMoeda(item.valor)}
                  </td>
                  <td className="acoes-col">
                    <div className="acoes-btns">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditar(item)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onExcluir(item)}
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

      {paginacao.totalPaginas > 1 && (
        <div className="flex-between" style={{ marginTop: '1rem' }}>
          <span className="text-muted">
            Página {paginacao.pagina} de {paginacao.totalPaginas} ({paginacao.total} registros)
          </span>
          <div className="flex-gap">
            <button
              className="btn btn-secondary btn-sm"
              disabled={paginacao.pagina <= 1}
              onClick={() => onPagina(paginacao.pagina - 1)}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={paginacao.pagina >= paginacao.totalPaginas}
              onClick={() => onPagina(paginacao.pagina + 1)}
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
