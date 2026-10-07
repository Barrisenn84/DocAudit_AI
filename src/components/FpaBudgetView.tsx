import React, { useState, useEffect } from 'react';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import {
  CostCenterBudget,
  FpaVarianceAnalysisReport,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface FpaBudgetViewProps {
  documents: ProcessedDocument[];
}

export const FpaBudgetView: React.FC<FpaBudgetViewProps> = ({ documents }) => {
  const [costCenters, setCostCenters] = useState<CostCenterBudget[]>([]);
  const [varianceReport, setVarianceReport] = useState<FpaVarianceAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFpaData = async () => {
    setIsLoading(true);
    try {
      const [ccRes, repRes] = await Promise.all([
        safeFetchJson<{ success: boolean; costCenters: CostCenterBudget[] }>('/api/fpa/cost-centers'),
        safeFetchJson<{ success: boolean; report: FpaVarianceAnalysisReport }>('/api/fpa/variance-report'),
      ]);

      if (ccRes.success && ccRes.data?.costCenters) {
        setCostCenters(ccRes.data.costCenters);
      }
      if (repRes.success && repRes.data?.report) {
        setVarianceReport(repRes.data.report);
      }
    } catch (err) {
      console.error('Error fetching FP&A data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFpaData();
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Controladoria & FP&A Corporativo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Orçamento vs. Realizado (Budget vs. Actual) & Análise de Variância IA
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Acompanhamento de consumo orçamentário por centro de custo, controle de alçadas e geração autônoma de narrativas de variância EBITDA para o Conselho.
          </p>
        </div>

        <button
          onClick={fetchFpaData}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar FP&A</span>
        </button>
      </div>

      {/* Cost Centers Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Consumo Orçamentário por Centro de Custo (Budget vs. Actual YTD)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {costCenters.map((cc) => {
            const isOver = cc.status === 'OVERBUDGET_BLOCKED';
            const isAtt = cc.status === 'ATTENTION';

            return (
              <div
                key={cc.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
                  isOver ? 'border-rose-300 ring-1 ring-rose-200' : isAtt ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">{cc.code}</span>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{cc.name}</h4>
                    <span className="text-[11px] text-slate-500 block">{cc.manager}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      isOver
                        ? 'bg-rose-100 text-rose-800'
                        : isAtt
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOver ? 'ESTOURO BLOQUEADO' : isAtt ? 'ALERTA 80%+' : 'DENTRO DA META'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Consumo:</span>
                    <span className={isOver ? 'text-rose-600 font-mono' : isAtt ? 'text-amber-600 font-mono' : 'text-emerald-700 font-mono'}>
                      {cc.consumptionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-rose-500' : isAtt ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(cc.consumptionPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Financial Figures */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Orçado Anual</span>
                    <strong className="font-mono text-slate-800">
                      R$ {(cc.annualBudget / 1000).toFixed(0)}k
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Realizado YTD</span>
                    <strong className="font-mono text-slate-900">
                      R$ {(cc.ytdActualSpent / 1000).toFixed(1)}k
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variance Narrative & AI Executive Commentary */}
      {varianceReport && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Narrative Commentary */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Comentário Executivo do CFO (Gemini 3.8-flash)</h3>
                  <span className="text-[10px] text-slate-500">Narrativa automatizada para Reunião de Diretoria</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {varianceReport.period}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-3 font-sans">
              <p className="font-medium">{varianceReport.executiveNarrative}</p>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Impacto na Margem EBITDA:
                </span>
                <p className="text-slate-600 text-[11px] leading-snug">{varianceReport.ebitdaImpactCommentary}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Eficiência em SG&A:
                </span>
                <p className="text-slate-600 text-[11px] leading-snug">{varianceReport.sgaEfficiencyCommentary}</p>
              </div>
            </div>

            {/* Action Plan */}
            <div className="space-y-1.5 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Plano de Ação Corretivo Sugerido:</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {varianceReport.actionPlan.map((action, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Variance Drivers Breakdown */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Principais Detratores e Propulsores da Variância
            </h3>

            <div className="space-y-3">
              {varianceReport.keyDrivers.map((d, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    d.impactType === 'UNFAVORABLE' ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{d.category}</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        d.impactType === 'UNFAVORABLE' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {d.impactType === 'UNFAVORABLE' ? '+' : ''}
                      {d.variancePct}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">{d.primaryCause}</p>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Centro: {d.costCenter}</span>
                    <span className="font-mono font-semibold">
                      Var: R$ {Math.abs(d.varianceAmount).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
