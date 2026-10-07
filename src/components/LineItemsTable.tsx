import React, { useState, useMemo } from 'react';
import { Layers, Search, ChevronLeft, ChevronRight, AlertCircle, ArrowDownRight, ArrowUpRight, Globe } from 'lucide-react';
import { LineItem } from '../types/finance.js';

interface LineItemsTableProps {
  items: LineItem[];
  currency: string | null;
  calculatedSum: number;
  extractedSubtotal: number | null;
  extractedTotal: number | null;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  items,
  currency,
  calculatedSum,
  extractedSubtotal,
  extractedTotal,
}) => {
  const curr = currency || 'BRL';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit' | 'fx'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Financial aggregates
  const stats = useMemo(() => {
    let debits = 0;
    let credits = 0;
    let fxCount = 0;

    for (const item of items) {
      const val = item.line_total ?? 0;
      if (val > 0) debits += val;
      else if (val < 0) credits += val;

      const raw = (item.raw_text || '').toUpperCase();
      if (raw.includes('USD') || raw.includes('EUR') || (item.description && (item.description.includes('USD') || item.description.includes('EUR')))) {
        fxCount++;
      }
    }

    return {
      debits,
      credits,
      net: debits + credits,
      fxCount,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const val = item.line_total ?? 0;
      const raw = (item.raw_text || '').toUpperCase();
      const desc = (item.description || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Tab filter
      if (filterType === 'debit' && val <= 0) return false;
      if (filterType === 'credit' && val >= 0) return false;
      if (filterType === 'fx' && !raw.includes('USD') && !raw.includes('EUR') && !desc.includes('usd') && !desc.includes('eur')) return false;

      // Search query
      if (q) {
        const matchesDesc = desc.includes(q);
        const matchesVal = val.toString().includes(q) || Math.abs(val).toFixed(2).includes(q);
        const matchesRaw = raw.toLowerCase().includes(q);
        if (!matchesDesc && !matchesVal && !matchesRaw) return false;
      }

      return true;
    });
  }, [items, filterType, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Linhas e Transações Extraídas (line_items: {items.length})
            </h3>
            <p className="text-xs text-slate-500">
              Discriminação de todos os lançamentos com recálculo algorítmico exato e auditoria de sinais.
            </p>
          </div>
        </div>

        {/* Aggregates Summary Badges */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-mono">
            Saldo Líquido: {curr} {calculatedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {stats.credits < 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono flex items-center space-x-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Estornos/Créditos: {curr} {stats.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
          )}
          {stats.fxCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-mono flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              <span>{stats.fxCount} Multimoeda (USD/EUR)</span>
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search controls */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => { setFilterType('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => { setFilterType('debit'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'debit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Débitos ({items.filter(i => (i.line_total ?? 0) > 0).length})
            </button>
            {stats.credits < 0 && (
              <button
                onClick={() => { setFilterType('credit'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'credit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Estornos ({items.filter(i => (i.line_total ?? 0) < 0).length})
              </button>
            )}
            {stats.fxCount > 0 && (
              <button
                onClick={() => { setFilterType('fx'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'fx' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                USD/EUR ({stats.fxCount})
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar descrição ou valor..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Table view */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
          Nenhum item individual faturado foi encontrado no documento.
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
          Nenhuma transação corresponde ao filtro pesquisado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold w-12">#</th>
                <th className="py-2.5 px-3 font-semibold">Descrição do Lançamento</th>
                <th className="py-2.5 px-3 font-semibold text-center w-20">Qtd</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Valor Unit.</th>
                <th className="py-2.5 px-3 font-semibold text-right w-36">Total da Linha</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">Confiança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((item, idx) => {
                const isNegative = (item.line_total ?? 0) < 0;
                const isZero = (item.line_total ?? 0) === 0;
                const isHighMateriality = Math.abs(item.line_total ?? 0) >= 50000;
                const isFx = (item.raw_text || '').toUpperCase().includes('USD') || (item.raw_text || '').toUpperCase().includes('EUR');

                return (
                  <tr key={item.item_number || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">
                      {item.item_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{item.description}</span>
                        {isNegative && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Estorno / Crédito
                          </span>
                        )}
                        {isHighMateriality && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            Alta Materialidade
                          </span>
                        )}
                        {isFx && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            Moeda Estrangeira
                          </span>
                        )}
                      </div>
                      {item.raw_text && (
                        <div className="text-[11px] text-slate-400 italic font-mono truncate max-w-lg mt-0.5">
                          "{item.raw_text}"
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                      {item.quantity !== null && item.quantity !== undefined ? item.quantity : 1}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {item.unit_price !== null && item.unit_price !== undefined
                        ? item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          isNegative
                            ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
                            : isHighMateriality
                            ? 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200'
                            : isZero
                            ? 'text-slate-400'
                            : 'text-slate-900'
                        }
                      >
                        {item.line_total !== null && item.line_total !== undefined
                          ? `${item.line_total < 0 ? '-' : ''}${curr} ${Math.abs(item.line_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                <td colSpan={4} className="py-3 px-3 text-right text-slate-700">
                  Total Filtrado ({filteredItems.length} transações):
                </td>
                <td className="py-3 px-3 text-right font-mono text-indigo-700 text-sm">
                  {curr} {filteredItems.reduce((acc, i) => acc + (i.line_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div>
            Mostrando <strong>{(currentPage - 1) * pageSize + 1}</strong> a{' '}
            <strong>{Math.min(currentPage * pageSize, filteredItems.length)}</strong> de{' '}
            <strong>{filteredItems.length}</strong> lançamentos
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700 px-2 font-semibold">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
