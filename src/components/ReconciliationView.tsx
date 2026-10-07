import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Play,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  Download,
} from 'lucide-react';
import {
  ReconciliationBatchResult,
  ReconciliationPairCandidate,
  LedgerTransactionItem,
  BankStatementTransactionItem,
  MatchStatus,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import { exportReconciliationReportPdf } from '../utils/pdfExport.js';

export const ReconciliationView: React.FC = () => {
  const [ledgerItems, setLedgerItems] = useState<LedgerTransactionItem[]>([]);
  const [statementItems, setStatementItems] = useState<BankStatementTransactionItem[]>([]);
  const [currentBatch, setCurrentBatch] = useState<ReconciliationBatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    safeFetchJson<{ success: boolean; ledger_items?: LedgerTransactionItem[]; statement_items?: BankStatementTransactionItem[]; batches?: ReconciliationBatchResult[] }>('/api/reconciliation-data')
      .then((res) => {
        if (res.success && res.data) {
          setLedgerItems(res.data.ledger_items || []);
          setStatementItems(res.data.statement_items || []);
          if (res.data.batches && res.data.batches.length > 0) {
            setCurrentBatch(res.data.batches[0]);
          }
        }
      });
  }, []);

  const handleRunReconciliation = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ success: boolean; batch?: ReconciliationBatchResult }>('/api/reconcile-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledger_items: ledgerItems,
          statement_items: statementItems,
        }),
      });
      if (res.success && res.data?.batch) {
        setCurrentBatch(res.data.batch);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'exact':
        return (
          <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            EXACT MATCH
          </span>
        );
      case 'probable':
        return (
          <span className="inline-flex items-center text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
            PROBABLE MATCH
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
            PARTIAL MATCH
          </span>
        );
      case 'insufficient_data':
        return (
          <span className="inline-flex items-center text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            INSUFFICIENT DATA
          </span>
        );
      case 'no_match':
        return (
          <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full border border-slate-300">
            <XCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
            NO MATCH
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Inviolable Rules Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Módulo 5: Reconciliação Assistida (Algorítmica + IA)
              </h2>
              <p className="text-xs text-slate-500">
                A reconciliação é predominantemente algorítmica. O Gemini explica divergências e classifica candidatos.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {currentBatch && (
              <button
                onClick={() => exportReconciliationReportPdf(currentBatch)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Exportar Laudo Pericial de Reconciliação Bancária em PDF"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Laudo PDF</span>
              </button>
            )}

            <button
              onClick={handleRunReconciliation}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando Reconciliação...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar Reconciliação Algorítmica</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* The 4 Rules */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Regras de Reconciliação Obrigatórias:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
              <span className="font-bold text-slate-900">Regra 1:</span> Diferença acima da tolerância (R$ 0,01) <strong>nunca pode ser exact</strong>.
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
              <span className="font-bold text-slate-900">Regra 2:</span> Uma transação <strong>não pode ser casada duas vezes</strong>.
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
              <span className="font-bold text-slate-900">Regra 3:</span> Moeda diferente <strong>exige conversão cambial documentada</strong>.
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70">
              <span className="font-bold text-slate-900">Regra 4:</span> Sem source_id <strong>não pode ser considerada reconciliada</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Batch Statistics Bar */}
      {currentBatch && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="font-mono text-xs font-bold text-slate-500">{currentBatch.batch_id}</span>
            <span className="text-xs text-slate-500">
              Processado em {new Date(currentBatch.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Total Pares</span>
              <span className="text-lg font-bold font-mono text-slate-900">{currentBatch.total_pairs}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-700 block">Exact Matches</span>
              <span className="text-lg font-bold font-mono text-emerald-800">{currentBatch.exact_matches}</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[11px] text-blue-700 block">Probable Matches</span>
              <span className="text-lg font-bold font-mono text-blue-800">{currentBatch.probable_matches}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[11px] text-amber-700 block">Partial Matches</span>
              <span className="text-lg font-bold font-mono text-amber-800">{currentBatch.partial_matches}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-rose-700 block">Com Pendências</span>
              <span className="text-lg font-bold font-mono text-rose-800">{currentBatch.unmatched_items}</span>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Pairs List */}
      {currentBatch && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Pares Candidatos Avaliados pelo Algoritmo & Explicados pelo Gemini:
          </h3>

          {currentBatch.pairs.map((pair) => (
            <div
              key={pair.pair_id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                pair.rule_violations.length > 0
                  ? 'border-rose-300 ring-1 ring-rose-400/20'
                  : pair.match_status === 'exact'
                  ? 'border-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-400">{pair.pair_id}</span>
                  {getStatusBadge(pair.match_status)}
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 font-mono">Confiança: {(pair.confidence * 100).toFixed(0)}%</span>
                  {pair.is_reconciled ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Reconciliação Confirmada ✓
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Requer Validação Manual
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-side comparison of items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-4">
                {/* Left: Ledger Item */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-sans font-bold text-slate-500 uppercase">
                    <span>Razão Contábil (Livro)</span>
                    <span className="text-indigo-700">{pair.ledger_item.id}</span>
                  </div>
                  <div className="font-sans font-bold text-slate-900 text-sm">{pair.ledger_item.description}</div>
                  <div className="mt-1 text-slate-600">
                    Valor: <strong className="text-slate-900">{pair.ledger_item.currency} {pair.ledger_item.amount.toFixed(2)}</strong>
                  </div>
                  <div className="text-slate-500">Data: {pair.ledger_item.date} • Ref: {pair.ledger_item.reference_code}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-sans">
                    Contraparte: {pair.ledger_item.counterparty} • Source ID: {pair.ledger_item.source_id || <span className="text-rose-600 font-bold">AUSENTE (Regra 4)</span>}
                  </div>
                </div>

                {/* Right: Statement Item */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1 text-[11px] font-sans font-bold text-slate-500 uppercase">
                    <span>Extrato Bancário</span>
                    <span className="text-indigo-700">{pair.statement_item.id}</span>
                  </div>
                  <div className="font-sans font-bold text-slate-900 text-sm">{pair.statement_item.description}</div>
                  <div className="mt-1 text-slate-600">
                    Valor: <strong className="text-slate-900">{pair.statement_item.currency} {pair.statement_item.amount.toFixed(2)}</strong>
                  </div>
                  <div className="text-slate-500">Data: {pair.statement_item.date} • Ref: {pair.statement_item.reference_code}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-sans">
                    Banco: {pair.statement_item.bank_name} • Source ID: {pair.statement_item.source_id || <span className="text-rose-600 font-bold">AUSENTE</span>}
                  </div>
                </div>
              </div>

              {/* Algorithmic Differences Analysis */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Dif. Valor</span>
                  <span className={`font-mono font-bold ${pair.diferencas_de_valor.is_within_tolerance ? 'text-emerald-700' : 'text-rose-600'}`}>
                    R$ {pair.diferencas_de_valor.diferenca_absoluta.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Dif. Data</span>
                  <span className="font-mono font-bold text-slate-800">
                    {pair.diferencas_de_data.dias_diferenca} dia(s)
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Moeda</span>
                  <span className={`font-mono font-bold ${pair.diferencas_de_moeda.has_currency_mismatch ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {pair.diferencas_de_moeda.has_currency_mismatch ? 'DIVERGENTE' : 'IGUAL'}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Ref. Match</span>
                  <span className="font-mono font-bold text-slate-800">
                    {pair.diferenca_de_referencia.similaridade_percentual}%
                  </span>
                </div>
              </div>

              {/* Rule Violations Alert if any */}
              {pair.rule_violations.length > 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Violação de Regra Mandatória:</span>
                  </div>
                  {pair.rule_violations.map((v, vi) => (
                    <div key={vi}>• {v}</div>
                  ))}
                </div>
              )}

              {/* Gemini Suggested Action */}
              <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-900">Ação Sugerida pelo Analista: </span>
                  <span className="text-indigo-800">{pair.acao_sugerida}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
