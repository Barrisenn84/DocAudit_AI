import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Globe,
  Wind,
  Zap,
  Fuel,
  Cloud,
  Plane,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Coins,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import {
  EsgCorporateSustainabilitySummary,
  InvoiceEsgCarbonEmission,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface EsgCarbonViewProps {
  documents: ProcessedDocument[];
}

export const EsgCarbonView: React.FC<EsgCarbonViewProps> = ({ documents }) => {
  const [summary, setSummary] = useState<EsgCorporateSustainabilitySummary | null>(null);
  const [items, setItems] = useState<InvoiceEsgCarbonEmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiRecommendations, setAiRecommendations] = useState<{
    carbonReductionPlan: string[];
    taxBenefitOpportunities: string[];
    supplierEngagementTips: string[];
    carbonOffsetBudgetEstimate: number;
    modelUsed: string;
  } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateAiRecommendations = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        recommendations: any;
      }>('/api/esg/ai-recommendations', {
        method: 'POST',
      });
      if (res.success && res.data?.recommendations) {
        setAiRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const fetchEsgData = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        summary: EsgCorporateSustainabilitySummary;
        items: InvoiceEsgCarbonEmission[];
      }>('/api/esg/corporate-summary');

      if (res.success && res.data) {
        setSummary(res.data.summary);
        setItems(res.data.items);
      }
    } catch (err) {
      console.error('Error fetching ESG data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEsgData();
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <Leaf className="w-3.5 h-3.5" />
            <span>ESG & Contabilidade de Carbono Corporativo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Inventário de Emissões de Carbono (Scope 1, 2 e 3 em Faturas)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Conversão automática de faturas de eletricidade (kWh), combustíveis, viagens e computação em nuvem em toneladas de CO₂ equivalente conforme o GHG Protocol e ISO 14064.
          </p>
        </div>

        <button
          onClick={fetchEsgData}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Inventário ESG</span>
        </button>
      </div>

      {/* Scope Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center space-x-1.5">
            <Fuel className="w-3.5 h-3.5 text-amber-600" />
            <span>Escopo 1 (Direto)</span>
          </span>
          <p className="text-2xl font-mono font-bold text-slate-900">
            {summary?.scope1TonCo2e} <span className="text-xs font-normal text-slate-500">tCO₂e</span>
          </p>
          <span className="text-[11px] text-slate-500">Frotas e combustíveis próprios</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Escopo 2 (Energia)</span>
          </span>
          <p className="text-2xl font-mono font-bold text-indigo-700">
            {summary?.scope2TonCo2e} <span className="text-xs font-normal text-slate-500">tCO₂e</span>
          </p>
          <span className="text-[11px] text-slate-500">Matriz SIN ({summary?.greenEnergyPct}% renovável)</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center space-x-1.5">
            <Cloud className="w-3.5 h-3.5 text-purple-600" />
            <span>Escopo 3 (Cadeia)</span>
          </span>
          <p className="text-2xl font-mono font-bold text-purple-700">
            {summary?.scope3TonCo2e} <span className="text-xs font-normal text-slate-500">tCO₂e</span>
          </p>
          <span className="text-[11px] text-slate-500">Nuvem, fornecedores e viagens</span>
        </div>

        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pegada Total de Carbono</span>
          </span>
          <p className="text-2xl font-mono font-bold text-emerald-800">
            {summary?.totalTonCo2e} <span className="text-xs font-normal text-emerald-700">tCO₂e</span>
          </p>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Orçamento Neutralização: R$ {summary?.totalOffsetBudgetBrl.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Invoice Emissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Extrato de Emissões por Fatura Auditada
            </h3>
            <p className="text-xs text-slate-500">
              Associação de faturas a fatores de emissão oficiais (ABNT NBR ISO 14064)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {summary?.recommendedCarbonCreditsCount} Créditos de Carbono para Neutralização
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Documento & Fornecedor</th>
                <th className="py-2.5 px-3">Atividade / Consumo</th>
                <th className="py-2.5 px-3">Escopo GHG</th>
                <th className="py-2.5 px-3">Quantidade Faturada</th>
                <th className="py-2.5 px-3">Emissão Total (kg CO₂e)</th>
                <th className="py-2.5 px-3 text-right">Custo Compensação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <span className="font-mono text-[10px] text-slate-500 block">{item.documentId}</span>
                    <span className="font-bold text-slate-900">{item.vendorName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                      {item.activityCategory}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-700">{item.scope}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {item.rawQuantity.toLocaleString('pt-BR')} {item.unit}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {item.totalKgCo2e.toLocaleString('pt-BR')} kg ({item.totalTonCo2e.toFixed(3)} t)
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-right">
                    R$ {item.estimatedOffsetCostBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Sustainability Recommendations Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <strong>Consultoria de Sustentabilidade & Créditos Verdes com IA: </strong>
            <span>Gere diretrizes para neutralização de emissões corporativas e obtenção de incentivos ESG.</span>
          </div>
          <button
            onClick={handleGenerateAiRecommendations}
            disabled={isGeneratingAi}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center space-x-1.5 shrink-0 cursor-pointer"
          >
            {isGeneratingAi ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>{aiRecommendations ? 'Reavaliar com IA' : 'Emitir Plano ESG com IA'}</span>
          </button>
        </div>

        {aiRecommendations && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/30 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  Plano Estratégico de Descarbonização Corporativa
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-emerald-200 font-mono">
                  Modelo: {aiRecommendations.modelUsed}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                <span className="font-bold text-emerald-300 text-[11px] block uppercase tracking-wider">
                  Medidas Práticas de Redução de Emissões (Escopos 2 e 3):
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {aiRecommendations.carbonReductionPlan.map((p, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                <span className="font-bold text-teal-300 text-[11px] block uppercase tracking-wider">
                  Incentivos Fiscais & Títulos Verdes (Green Bonds):
                </span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {aiRecommendations.taxBenefitOpportunities.map((b, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
              <span className="font-bold text-amber-300 text-[11px] block uppercase tracking-wider">
                Diretrizes ESG para Homologação de Fornecedores:
              </span>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                {aiRecommendations.supplierEngagementTips.map((tip, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-amber-400 font-bold">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Orçamento Estimado para Compensação Total:</span>
                <span className="font-bold text-emerald-300 font-mono">
                  R$ {aiRecommendations.carbonOffsetBudgetEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
