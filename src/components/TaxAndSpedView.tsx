import React, { useState, useEffect } from 'react';
import {
  Percent,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Scale,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  FileText,
  BadgeAlert,
  Coins,
  Split,
  Landmark,
} from 'lucide-react';
import {
  TaxWithholdingBreakdown,
  TaxReformSimulation,
  SpedAuditReport,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface TaxAndSpedViewProps {
  documents: ProcessedDocument[];
  activeDocument?: ProcessedDocument | null;
}

export const TaxAndSpedView: React.FC<TaxAndSpedViewProps> = ({ documents, activeDocument }) => {
  const [activeSubTab, setActiveSubTab] = useState<'withholdings' | 'reform' | 'sped'>('withholdings');
  const [grossAmountInput, setGrossAmountInput] = useState<string>('6600.00');
  const [vendorCategory, setVendorCategory] = useState<string>('SERVIÇOS_TI');
  const [isSimplesNacional, setIsSimplesNacional] = useState<boolean>(false);

  const [withholdings, setWithholdings] = useState<TaxWithholdingBreakdown | null>(null);
  const [reformSim, setReformSim] = useState<TaxReformSimulation | null>(null);
  const [spedReport, setSpedReport] = useState<SpedAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    executiveSummary: string;
    creditOpportunities: string[];
    splitPaymentImpact: string;
    complianceAlerts: string[];
    strategicActionList: string[];
    modelUsed: string;
  } | null>(null);
  const [isGeneratingAiDiagnosis, setIsGeneratingAiDiagnosis] = useState(false);

  const handleGenerateAiDiagnosis = async () => {
    setIsGeneratingAiDiagnosis(true);
    try {
      const amountNum = parseFloat(grossAmountInput) || 6600;
      const res = await safeFetchJson<{
        success: boolean;
        diagnosis: any;
      }>('/api/tax/ai-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gross_total: amountNum }),
      });
      if (res.success && res.data?.diagnosis) {
        setAiDiagnosis(res.data.diagnosis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAiDiagnosis(false);
    }
  };

  useEffect(() => {
    if (activeDocument?.geminiExtraction.total) {
      setGrossAmountInput(activeDocument.geminiExtraction.total.toString());
    }
    fetchData();
  }, [activeDocument]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const amountNum = parseFloat(grossAmountInput) || 6600;

      // 1. Withholdings
      const wRes = await safeFetchJson<{ success: boolean; breakdown: TaxWithholdingBreakdown }>(
        `/api/tax/withholdings?amount=${amountNum}&category=${encodeURIComponent(vendorCategory)}&is_simples=${isSimplesNacional}`
      );
      if (wRes.success && wRes.data?.breakdown) {
        setWithholdings(wRes.data.breakdown);
      }

      // 2. Tax Reform
      const rRes = await safeFetchJson<{ success: boolean; simulation: TaxReformSimulation }>('/api/tax/simulate-reform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gross_total: amountNum }),
      });
      if (rRes.success && rRes.data?.simulation) {
        setReformSim(rRes.data.simulation);
      }

      // 3. SPED Audit
      const sRes = await safeFetchJson<{ success: boolean; report: SpedAuditReport }>('/api/tax/sped-audit');
      if (sRes.success && sRes.data?.report) {
        setSpedReport(sRes.data.report);
      }
    } catch (err) {
      console.error('Error fetching tax data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = () => {
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>Módulo Tributário Avançado & Tax Intelligence</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Retenções na Fonte, Reforma Tributária & Auditoria SPED
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Cálculo automático de IRRF, CSRF (4,65%) e ISS, simulação do IVA Dual (IBS + CBS com Split Payment) e pré-auditoria de arquivos EFD/ECD.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('withholdings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'withholdings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Retenções na Fonte
          </button>
          <button
            onClick={() => setActiveSubTab('reform')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'reform'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Reforma Tributária (IVA Dual)
          </button>
          <button
            onClick={() => setActiveSubTab('sped')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'sped'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Auditoria SPED
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: RETENÇÕES NA FONTE */}
      {activeSubTab === 'withholdings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Parâmetros de Retenção da Fatura</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Valor Bruto da Fatura (R$):</label>
                <input
                  type="number"
                  value={grossAmountInput}
                  onChange={(e) => setGrossAmountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Natureza do Serviço / Categoria:</label>
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="SERVIÇOS_TI">Serviços de TI, Nuvem & Software (IRRF 1,5% + PCC 4,65%)</option>
                  <option value="CONSULTORIA">Consultoria & Auditoria (IRRF 1,5% + PCC 4,65% + ISS Retido 5%)</option>
                  <option value="ENGENHARIA">Serviços de Engenharia e Arquitetura (IRRF 1,5% + PCC 4,65%)</option>
                  <option value="LIMPEZA_VIGILANCIA">Cessão de Mão de Obra (INSS 11% + PCC + ISS)</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSimplesNacional}
                    onChange={(e) => setIsSimplesNacional(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-slate-700 font-semibold">Fornecedor Optante pelo Simples Nacional</span>
                </label>
                <span className="text-[10px] text-slate-500 block ml-6">
                  (Dispensa retenções federais nos termos do Art. 1º da IN RFB 459/2004)
                </span>
              </div>

              <button
                onClick={handleRecalculate}
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Recalcular Retenções</span>
              </button>
            </div>
          </div>

          {/* Breakdown Results */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Demonstrativo de Retenções Federais & Municipais</h3>
                <p className="text-xs text-slate-500">Validação automática de obrigações tributárias do tomador</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {withholdings?.withholdingStatus || 'CALCULADO'}
              </span>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valor Bruto Faturado</span>
                <p className="text-xl font-mono font-bold text-slate-900">
                  R$ {withholdings?.grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Total Retido na Fonte</span>
                <p className="text-xl font-mono font-bold text-rose-700">
                  - R$ {withholdings?.totalWithheld.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Valor Líquido a Pagar</span>
                <p className="text-xl font-mono font-bold text-emerald-800">
                  R$ {withholdings?.netPayableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Table of Withholdings */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tributo</th>
                    <th className="py-2.5 px-3">Alíquota</th>
                    <th className="py-2.5 px-3">Base Cálculo</th>
                    <th className="py-2.5 px-3 text-right">Valor Retido</th>
                    <th className="py-2.5 px-3">Base Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withholdings?.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{item.ratePct}%</td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        R$ {item.baseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-600 text-right">
                        R$ {item.withheldAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs">{item.legalBasis}</td>
                    </tr>
                  ))}
                  {withholdings?.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Nenhuma retenção incidente (dispensa ou enquadramento no Simples Nacional).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Guia Sugerida para Recolhimento: <strong>{withholdings?.darfDarfCodeSuggested}</strong></span>
              </span>
              <span className="text-[11px] font-mono text-indigo-700">Vencimento: dia 20 do mês subsequente</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REFORMA TRIBUTÁRIA & SPLIT PAYMENT */}
      {activeSubTab === 'reform' && reformSim && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Simulador Comparativo: Regime Atual vs. IVA Dual (EC 132/2023)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    Split Payment SPB
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Transição do PIS/COFINS/ICMS/ISS para a Contribuição sobre Bens e Serviços (CBS) e Imposto sobre Bens e Serviços (IBS)
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="text-slate-500">Valor Base Fatura:</span>
                <strong className="text-slate-900 font-mono font-bold text-sm">
                  R$ {reformSim.grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Comparison Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Regime Atual (Cumulativo / Misto)</span>
                <p className="text-xl font-mono font-bold text-slate-900">
                  R$ {reformSim.currentRegimeTotalTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-slate-500">Alíquota Efetiva: {reformSim.currentRegimeEffectiveRate}%</span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
                <span className="text-[11px] font-bold text-indigo-700 uppercase">Novo IVA Dual (IBS + CBS)</span>
                <p className="text-xl font-mono font-bold text-indigo-700">
                  R$ {reformSim.newRegimeTotalTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-indigo-600">Alíquota Referência: {reformSim.newRegimeEffectiveRate}% (EC 132)</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Crédito Financeiro B2B Gerado</span>
                <p className="text-xl font-mono font-bold text-emerald-800">
                  R$ {reformSim.estimatedCreditAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] text-emerald-700">Recuperação Imediata: 100% não-cumulativo</span>
              </div>
            </div>

            {/* Split Payment Mechanism Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-950 text-white space-y-3">
              <div className="flex items-center space-x-2">
                <Split className="w-5 h-5 text-purple-300" />
                <h4 className="text-sm font-bold text-white">Mecanismo de Split Payment Bancário em Tempo Real</h4>
              </div>
              <p className="text-xs text-purple-200 leading-relaxed">
                {reformSim.splitPaymentEstimate.splitPaymentMechanism}. Na liquidação da fatura, o valor total de{' '}
                <strong>R$ {reformSim.grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> é cindido instantaneamente no SPB:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/80">
                  <span className="text-[10px] uppercase font-bold text-purple-300 block">Crédito Direto ao Fornecedor</span>
                  <span className="text-lg font-mono font-bold text-white">
                    R$ {reformSim.splitPaymentEstimate.vendorNetReceipt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/80">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Split Direto ao Fisco (CBS + IBS)</span>
                  <span className="text-lg font-mono font-bold text-amber-300">
                    R$ {reformSim.splitPaymentEstimate.taxAuthoritySplitDirect.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tributo & Equivalência</th>
                    <th className="py-2.5 px-3">Regime Atual (%)</th>
                    <th className="py-2.5 px-3">Regime Atual (R$)</th>
                    <th className="py-2.5 px-3">Novo IVA (%)</th>
                    <th className="py-2.5 px-3">Novo IVA (R$)</th>
                    <th className="py-2.5 px-3">Impacto Contábil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reformSim.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{item.tributo}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{item.regimeAtualPct}%</td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        R$ {item.regimeAtualValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">{item.regimeNovoPct}%</td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        R$ {item.regimeNovoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">{item.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Tax Reform Diagnosis Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong>Parecer Especializado de Inteligência Tributária (EC 132/2023): </strong>
                <span>Obtenha o diagnóstico da IA sobre impactos na cadeia de suprimentos, compensação de créditos e split payment.</span>
              </div>
              <button
                onClick={handleGenerateAiDiagnosis}
                disabled={isGeneratingAiDiagnosis}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                {isGeneratingAiDiagnosis ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                )}
                <span>{aiDiagnosis ? 'Reavaliar com IA' : 'Emitir Diagnóstico Tributário com IA'}</span>
              </button>
            </div>

            {aiDiagnosis && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Diagnóstico Estratégico da Reforma Tributária (IBS & CBS)
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-indigo-200 font-mono">
                      Modelo: {aiDiagnosis.modelUsed}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {aiDiagnosis.executiveSummary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-emerald-300 text-[11px] block uppercase tracking-wider">
                      Oportunidades de Crédito Tributário Integral (B2B):
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {aiDiagnosis.creditOpportunities.map((c, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-purple-300 text-[11px] block uppercase tracking-wider">
                      Impacto do Split Payment Operacional:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {aiDiagnosis.splitPaymentImpact}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                  <span className="font-bold text-amber-300 text-[11px] block uppercase tracking-wider">
                    Plano de Ação para a Transição Fiscal (2026 - 2033):
                  </span>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                    {aiDiagnosis.strategicActionList.map((act, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-400 font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUDITORIA SPED */}
      {activeSubTab === 'sped' && spedReport && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Pré-Auditoria de Obrigações Acessórias SPED (EFD Contribuições & EFD ICMS/IPI)
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      spedReport.statusConformidade === 'APROVADO_SEM_RESSALVAS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : spedReport.statusConformidade === 'RETIFICACAO_OBRIGATORIA'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {spedReport.statusConformidade}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Cruzamento automatizado entre faturas extraídas e blocos fiscais do SPED (PVA)
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-600">
                <span>Período: <strong>{spedReport.period}</strong></span>
                <span>•</span>
                <span>Registros: <strong>{spedReport.totalRegistrosValidados}</strong></span>
              </div>
            </div>

            {/* List of SPED Inconsistencies */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Apuração de Inconsistências nos Blocos do SPED:
              </h4>

              {spedReport.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-4 ${
                    issue.severidade === 'erro_impeditivo'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded bg-white border">
                        {issue.bloco} • {issue.registro}
                      </span>
                      <span className="font-bold text-slate-900">Campo: {issue.campo}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          issue.severidade === 'erro_impeditivo' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {issue.severidade === 'erro_impeditivo' ? 'IMPEDITIVO PVA' : 'ALERTA'}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{issue.descricao}</p>
                    <p className="text-[11px] text-slate-600 font-semibold pt-1">
                      Ação Corretiva: <span className="font-normal text-slate-800">{issue.acaoSugerida}</span>
                    </p>
                  </div>
                </div>
              ))}

              {spedReport.issues.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">SPED 100% Validado</h4>
                  <p className="text-xs text-slate-500">Nenhuma divergência de alíquota ou cadastro detectada para o período.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
