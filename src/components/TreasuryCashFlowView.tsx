import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  Barcode,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  Coins,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import {
  CashFlowDayProjection,
  DynamicDiscountingProposal,
  DdaElectronicInvoiceItem,
  ProcessedDocument,
  BacenFinancialRates,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface TreasuryCashFlowViewProps {
  documents: ProcessedDocument[];
}

export const TreasuryCashFlowView: React.FC<TreasuryCashFlowViewProps> = ({ documents }) => {
  const [activeSubTab, setActiveSubTab] = useState<'cashflow' | 'discounting' | 'dda'>('cashflow');
  const [forecastDays, setForecastDays] = useState<CashFlowDayProjection[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [bacenRates, setBacenRates] = useState<BacenFinancialRates | null>(null);
  const [discountingList, setDiscountingList] = useState<DynamicDiscountingProposal[]>([]);
  const [ddaList, setDdaList] = useState<DdaElectronicInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiOpinion, setAiOpinion] = useState<{
    liquidityVerdict: 'EXCELENTE' | 'ESTAVEL' | 'ATENCAO_REQUERIDA' | 'RISCO_DE_DEFICIT';
    cfoSummaryNote: string;
    strategicActionPlan: string[];
    workingCapitalTips: string[];
    discountingOpportunityEstimate: number;
    modelUsed: string;
  } | null>(null);
  const [isGeneratingAiOpinion, setIsGeneratingAiOpinion] = useState(false);

  const handleGenerateAiOpinion = async () => {
    setIsGeneratingAiOpinion(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        opinion: any;
      }>('/api/treasury/ai-forecast-opinion', {
        method: 'POST',
      });
      if (res.success && res.data?.opinion) {
        setAiOpinion(res.data.opinion);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAiOpinion(false);
    }
  };

  const fetchTreasuryData = async () => {
    setIsLoading(true);
    try {
      const [cfRes, discRes, ddaRes] = await Promise.all([
        safeFetchJson<{ success: boolean; forecast: { days: CashFlowDayProjection[]; summary: any }; bacenRates?: BacenFinancialRates }>(
          '/api/treasury/cash-flow-d90'
        ),
        safeFetchJson<{ success: boolean; opportunities: DynamicDiscountingProposal[]; cdiRate: number }>(
          '/api/treasury/dynamic-discounting'
        ),
        safeFetchJson<{ success: boolean; ddaInvoices: DdaElectronicInvoiceItem[] }>(
          '/api/treasury/dda-invoices'
        ),
      ]);

      if (cfRes.success && cfRes.data?.forecast) {
        setForecastDays(cfRes.data.forecast.days);
        setSummary(cfRes.data.forecast.summary);
        if (cfRes.data.bacenRates) setBacenRates(cfRes.data.bacenRates);
      }

      if (discRes.success && discRes.data?.opportunities) {
        setDiscountingList(discRes.data.opportunities);
      }

      if (ddaRes.success && ddaRes.data?.ddaInvoices) {
        setDdaList(ddaRes.data.ddaInvoices);
      }
    } catch (err) {
      console.error('Error fetching treasury data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, [documents]);

  const CustomCashFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: CashFlowDayProjection = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-56 space-y-1.5 z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <span className="font-bold text-sm text-slate-100">{data.date}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                data.liquidityStatus === 'HEALTHY'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : data.liquidityStatus === 'TIGHT'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {data.liquidityStatus}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-emerald-400">
              <span>Entradas Previstas:</span>
              <strong className="font-mono">R$ {data.inflowsExpected.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>Saídas Comprometidas:</span>
              <strong className="font-mono">R$ {data.outflowsCommitted.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="flex justify-between text-indigo-300 border-t border-slate-800 pt-1 font-bold">
              <span>Saldo Projetado:</span>
              <strong className="font-mono text-white text-sm">R$ {data.projectedClosingBalance.toLocaleString('pt-BR')}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
            <span>Tesouraria Corporativa & Liquidez Preditiva</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Fluxo de Caixa D+90, Desconto Dinâmico & DDA Bancário
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Monitoramento de liquidez com CDI/SELIC ao vivo, cálculo do custo de oportunidade para quitação antecipada e reconciliação com Débito Direto Autorizado.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('cashflow')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'cashflow' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Fluxo D+90
          </button>
          <button
            onClick={() => setActiveSubTab('discounting')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'discounting' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Desconto Dinâmico
          </button>
          <button
            onClick={() => setActiveSubTab('dda')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'dda' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Boletos DDA ({ddaList.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: FLUXO DE CAIXA D+90 */}
      {activeSubTab === 'cashflow' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Saldo de Caixa Inicial</span>
              <p className="text-2xl font-mono font-bold text-slate-900">
                R$ {summary?.startBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Disponibilidade imediata D+0</span>
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Mínimo Projetado (90 Dias)</span>
              <p className="text-2xl font-mono font-bold text-indigo-600">
                R$ {summary?.lowestProjectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">Ponto de inflexão em {summary?.lowestBalanceDate}</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total de Entradas Previstas</span>
              <p className="text-2xl font-mono font-bold text-emerald-700">
                + R$ {summary?.totalInflowsPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">Recebíveis e cobranças ativas</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total de Saídas Auditadas</span>
              <p className="text-2xl font-mono font-bold text-rose-600">
                - R$ {summary?.totalOutflowsPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">Contas a pagar e tributos</span>
            </div>
          </div>

          {/* Recharts Cash Flow Curve */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Curva de Liquidez & Saldo Projetado D+90</h3>
                <p className="text-xs text-slate-500">Projeção diária com base em faturas auditadas e colchão de segurança de R$ 150.000,00</p>
              </div>

              {bacenRates && (
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border text-xs">
                  <span className="text-slate-600">Taxa SELIC: <strong>{bacenRates.selic}% a.a.</strong></span>
                  <span>•</span>
                  <span className="text-slate-600">CDI: <strong>{bacenRates.cdi}% a.a.</strong></span>
                </div>
              )}
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastDays} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={11} interval={6} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomCashFlowTooltip />} />
                  <Legend />
                  <Bar dataKey="inflowsExpected" name="Entradas (R$)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="outflowsCommitted" name="Saídas (R$)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Line
                    type="monotone"
                    dataKey="projectedClosingBalance"
                    name="Saldo Acumulado (R$)"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={false}
                  />
                  <ReferenceLine y={150000} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Colchão Mínimo (R$ 150k)', position: 'insideTopRight', fill: '#d97706', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* AI Cash Flow Opinion Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong>Diagnóstico de Liquidez com Inteligência Artificial: </strong>
                <span>Gere uma análise preditiva fundamentada sobre os descasamentos de caixa e oportunidades de antecipação.</span>
              </div>
              <button
                onClick={handleGenerateAiOpinion}
                disabled={isGeneratingAiOpinion}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                {isGeneratingAiOpinion ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                )}
                <span>{aiOpinion ? 'Atualizar Diagnóstico com IA' : 'Emitir Parecer de Liquidez com IA'}</span>
              </button>
            </div>

            {aiOpinion && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      Parecer Preditivo de Tesouraria & Liquidez D+90
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        aiOpinion.liquidityVerdict === 'RISCO_DE_DEFICIT' || aiOpinion.liquidityVerdict === 'ATENCAO_REQUERIDA'
                          ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      Status: {aiOpinion.liquidityVerdict}
                    </span>
                    <span className="text-[10px] text-indigo-200 font-mono">
                      Modelo: {aiOpinion.modelUsed}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {aiOpinion.cfoSummaryNote}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-amber-300 text-[11px] block uppercase tracking-wider">
                      Plano de Ação Estratégico para o Caixa:
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {aiOpinion.strategicActionPlan.map((a, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-emerald-300 text-[11px] block uppercase tracking-wider">
                      Otimização de Capital de Giro & Descontos:
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {aiOpinion.workingCapitalTips.map((tip, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Economia Estimada por Desconto Dinâmico:</span>
                      <span className="font-bold text-emerald-300 font-mono">
                        R$ {aiOpinion.discountingOpportunityEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DESCONTO DINÂMICO */}
      {activeSubTab === 'discounting' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Oportunidades de Desconto Dinâmico (Dynamic Discounting)
              </h3>
              <p className="text-xs text-slate-500">
                Algoritmo de custo de capital comparando o ROI anualizado do desconto com o CDI do Banco Central
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Taxa de Corte: CDI 10,40% a.a.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discountingList.map((prop) => (
              <div
                key={prop.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  prop.verdict === 'ALTAMENTE_LUCRATIVO'
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{prop.documentId}</span>
                    <h4 className="font-bold text-sm text-slate-900">{prop.vendorName}</h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      prop.verdict === 'ALTAMENTE_LUCRATIVO'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    ROI {prop.annualizedRoiPct}% a.a.
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Valor Original</span>
                    <strong className="text-xs font-mono text-slate-800">
                      R$ {prop.originalAmount.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 uppercase block">Desconto ({prop.discountRatePct}%)</span>
                    <strong className="text-xs font-mono text-emerald-700 font-bold">
                      - R$ {prop.discountAmount.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-700 uppercase block">Líquido a Pagar</span>
                    <strong className="text-xs font-mono text-indigo-900 font-bold">
                      R$ {prop.netPaymentAmount.toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{prop.financialBenefitExplanation}</p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    Antecipar <strong>{prop.daysAccelerated} dias</strong>
                  </span>
                  <button className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer">
                    Autorizar Pagamento Antecipado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DDA BANCÁRIO */}
      {activeSubTab === 'dda' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Central de Boletos Eletrônicos DDA (Débito Direto Autorizado)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Consulta automática via Open Finance / CIP de todos os boletos emitidos contra o CNPJ da empresa
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conexão CIP Ativa</span>
            </span>
          </div>

          <div className="space-y-3">
            {ddaList.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs transition-all ${
                  item.matchStatus === 'MATCHED_WITH_PO'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{item.beneficiaryName}</span>
                      <span className="text-[11px] font-mono text-slate-500">({item.beneficiaryCnpj})</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          item.matchStatus === 'MATCHED_WITH_PO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {item.matchStatus === 'MATCHED_WITH_PO' ? 'CONCILIADO COM PEDIDO' : 'RISCO DE COBRANÇA INDEVIDA'}
                      </span>
                    </div>

                    <p className="font-mono text-[11px] text-slate-600">Linha Digitável: {item.digitableLine}</p>
                    <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                      <span>Emissão: {item.issueDate}</span>
                      <span>•</span>
                      <span>Vencimento: <strong>{item.dueDate}</strong></span>
                      {item.matchedPurchaseOrder && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-700 font-semibold">Ordem de Compra: {item.matchedPurchaseOrder}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-lg font-mono font-bold text-slate-900 block">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {item.matchStatus === 'UNEXPECTED_CHARGE_RISK' ? (
                      <span className="inline-flex items-center space-x-1 text-rose-700 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Boleto não reconhecido</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pronto para Agendamento</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
