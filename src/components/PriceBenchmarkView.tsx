import React, { useState, useEffect } from 'react';
import {
  Tag,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Layers,
  Building2,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  Sliders,
  Scale,
  Plus,
} from 'lucide-react';
import {
  PriceBenchmarkItem,
  DocumentPriceBenchmarkAudit,
  LineItemPriceBenchmarkComparison,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface PriceBenchmarkViewProps {
  documents: ProcessedDocument[];
  activeDocument?: ProcessedDocument | null;
  onSelectDocument?: (doc: ProcessedDocument) => void;
}

export const PriceBenchmarkView: React.FC<PriceBenchmarkViewProps> = ({
  documents,
  activeDocument,
  onSelectDocument,
}) => {
  const [benchmarks, setBenchmarks] = useState<PriceBenchmarkItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>(activeDocument?.id || (documents[0]?.id || ''));
  const [currentAudit, setCurrentAudit] = useState<DocumentPriceBenchmarkAudit | null>(
    activeDocument?.priceBenchmarkAudit || null
  );
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Custom Simulator state
  const [simDesc, setSimDesc] = useState<string>('Instâncias Linux EC2 vCPU 8');
  const [simPrice, setSimPrice] = useState<string>('4300.00');
  const [simQty, setSimQty] = useState<string>('2');
  const [simVendor, setSimVendor] = useState<string>('Novo Fornecedor Cloud');
  const [simResult, setSimResult] = useState<DocumentPriceBenchmarkAudit | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch benchmark catalog
  useEffect(() => {
    safeFetchJson<{ success: boolean; benchmarks: PriceBenchmarkItem[]; categories: string[] }>('/api/price-benchmarks')
      .then((res) => {
        if (res.success && res.data) {
          setBenchmarks(res.data.benchmarks || []);
          setCategories(res.data.categories || []);
        }
      });
  }, []);

  // Update audit when selected document changes
  const evaluateDoc = async (docId: string) => {
    setIsLoadingAudit(true);
    try {
      const res = await safeFetchJson<{ success: boolean; audit: DocumentPriceBenchmarkAudit }>('/api/evaluate-price-benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId }),
      });
      if (res.success && res.data?.audit) {
        setCurrentAudit(res.data.audit);
      }
    } catch (err) {
      console.error('Error evaluating price benchmarks:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (selectedDocId) {
      evaluateDoc(selectedDocId);
    }
  }, [selectedDocId]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await safeFetchJson<{ success: boolean; audit: DocumentPriceBenchmarkAudit }>('/api/evaluate-price-benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: simVendor,
          line_items: [
            {
              item_number: 1,
              description: simDesc,
              quantity: parseFloat(simQty) || 1,
              unit_price: parseFloat(simPrice) || 0,
              line_total: (parseFloat(simPrice) || 0) * (parseFloat(simQty) || 1),
            },
          ],
        }),
      });
      if (res.success && res.data?.audit) {
        setSimResult(res.data.audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredBenchmarks = benchmarks.filter((b) => {
    const matchesCategory = selectedCategory === 'ALL' || b.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.itemKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRICE_SPIKE_CRITICAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>SOBREPREÇO CRÍTICO</span>
          </span>
        );
      case 'PRICE_SPIKE_WARNING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>ALERTA DE VARIAÇÃO</span>
          </span>
        );
      case 'SUSPICIOUS_UNDERPRICING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
            <span>SUBPRECIFICAÇÃO SUSPEITA</span>
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PREÇO CONFORME</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span>SEM BENCHMARK</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Módulo 10 • Inteligência de Compras
            </span>
            <span className="text-xs font-mono text-slate-500">
              Motor: <code className="text-indigo-600 font-bold">Historical Price Benchmarks Engine</code>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Auditoria de Preços Históricos & Detecção de Anomalias de Fornecedores
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Confronto automático de cada item extraído contra uma base de <strong>preços medianos e limites de tolerância</strong> de mercado.
            Identifica sobrepreço, desvios contratuais, subprecificação com risco de fraude e surtos de reajuste por fornecedor.
          </p>
        </div>

        {/* Document Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Documento para Auditoria de Preço:
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                const found = documents.find((d) => d.id === e.target.value);
                if (found && onSelectDocument) onSelectDocument(found);
              }}
              className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 min-w-64"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} - {d.geminiExtraction.vendor_name || 'Desconhecido'} (R$ {d.geminiExtraction.total?.toLocaleString('pt-BR')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Document Benchmark Audit Scorecard */}
      {currentAudit && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-5 border shadow-xs transition-all ${
              currentAudit.overallStatus === 'CRITICAL_PRICE_SURCHARGE'
                ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-400/30'
                : currentAudit.overallStatus === 'PRICE_ANOMALY_WARNING'
                ? 'bg-amber-50/80 border-amber-300'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    currentAudit.overallStatus === 'CRITICAL_PRICE_SURCHARGE'
                      ? 'bg-rose-600 text-white'
                      : currentAudit.overallStatus === 'PRICE_ANOMALY_WARNING'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {currentAudit.overallStatus === 'CRITICAL_PRICE_SURCHARGE' ? (
                    <Flame className="w-6 h-6" />
                  ) : currentAudit.overallStatus === 'PRICE_ANOMALY_WARNING' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      {currentAudit.documentId}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        currentAudit.overallStatus === 'CRITICAL_PRICE_SURCHARGE'
                          ? 'bg-rose-200 text-rose-900'
                          : currentAudit.overallStatus === 'PRICE_ANOMALY_WARNING'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {currentAudit.overallStatus === 'CRITICAL_PRICE_SURCHARGE'
                        ? 'SOBREPREÇO CRÍTICO DETECTADO'
                        : currentAudit.overallStatus === 'PRICE_ANOMALY_WARNING'
                        ? 'ALERTA DE VARIAÇÃO DE PREÇO'
                        : 'PREÇOS HOMOLOGADOS DENTRO DO BENCHMARK'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Fornecedor: {currentAudit.vendorName}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    {currentAudit.executiveSummary}
                  </p>
                </div>
              </div>

              {/* Overpayment Exposure Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs shrink-0 text-right space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">Exposição de Sobrepreço Estimada</span>
                <span className="text-xl font-bold font-mono text-rose-700 block">
                  R$ {currentAudit.totalOverpaymentRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="text-[10px] text-slate-500 flex items-center justify-end space-x-1">
                  <span>Score de Risco de Preço:</span>
                  <strong className="font-mono text-slate-900">{currentAudit.overallPricingRiskScore}/100</strong>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-200/60">
              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 text-xs">
                <span className="text-slate-500 block text-[11px]">Itens Confrontados</span>
                <strong className="text-slate-900 font-mono text-sm">
                  {currentAudit.benchmarkedItemsCount} de {currentAudit.totalItemsEvaluated}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 text-xs">
                <span className="text-slate-500 block text-[11px]">Sobrepreço Crítico</span>
                <strong className="text-rose-700 font-mono text-sm">
                  {currentAudit.criticalSpikeCount} itens
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 text-xs">
                <span className="text-slate-500 block text-[11px]">Variações Moderadas</span>
                <strong className="text-amber-700 font-mono text-sm">
                  {currentAudit.warningSpikeCount} itens
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/60 text-xs">
                <span className="text-slate-500 block text-[11px]">Histórico Fornecedor</span>
                <strong className="text-slate-900 font-mono text-[11px]">
                  {currentAudit.vendorHistoricalConsistency === 'CONSISTENT_WITH_HISTORY'
                    ? 'Preços Consistentes'
                    : currentAudit.vendorHistoricalConsistency === 'UNUSUAL_PRICE_INCREASE'
                    ? 'Aumento Atípico'
                    : 'Primeira Transação'}
                </strong>
              </div>
            </div>
          </div>

          {/* Line-by-Line Benchmark Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Discriminação Linha a Linha vs. Benchmarks Históricos
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {currentAudit.lineComparisons.length} itens analisados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Descrição da Linha</th>
                    <th className="py-2.5 px-3 text-right">Preço Fatura</th>
                    <th className="py-2.5 px-3 text-right">Mediana Mercado</th>
                    <th className="py-2.5 px-3 text-right">Faixa Esperada</th>
                    <th className="py-2.5 px-3 text-center">Variação (%)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Impacto Financeiro</th>
                    <th className="py-2.5 px-3">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {currentAudit.lineComparisons.map((c) => (
                    <tr
                      key={c.itemNumber}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        c.status === 'PRICE_SPIKE_CRITICAL'
                          ? 'bg-rose-50/40'
                          : c.status === 'PRICE_SPIKE_WARNING'
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-slate-400">{c.itemNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{c.description}</span>
                        {c.matchedBenchmark && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ref: {c.matchedBenchmark.description} ({c.matchedBenchmark.sampleSize} amostras)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        R$ {c.extractedUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          qtd: {c.extractedQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {c.benchmarkMedianPrice !== null
                          ? `R$ ${c.benchmarkMedianPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                        {c.benchmarkMinPrice !== null && c.benchmarkMaxPrice !== null
                          ? `R$ ${c.benchmarkMinPrice.toFixed(0)} - ${c.benchmarkMaxPrice.toFixed(0)}`
                          : 'Sem faixa'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {c.variancePercentage !== null ? (
                          <span
                            className={
                              c.variancePercentage > 20
                                ? 'text-rose-600'
                                : c.variancePercentage > 0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {c.variancePercentage > 0 ? `+${c.variancePercentage}%` : `${c.variancePercentage}%`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">{getStatusBadge(c.status)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {c.estimatedTotalFinancialImpact > 0 ? (
                          <span className="text-rose-700">
                            +R$ {c.estimatedTotalFinancialImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-xs">
                        {c.recommendedAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Simulator: Test Any Item/Price Against Historical Benchmarks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">
            Simulador Interativo de Auditoria de Preço & Homologação
          </h3>
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="lg:col-span-2">
            <label className="font-semibold text-slate-700 block mb-1">Descrição do Item / Serviço:</label>
            <input
              type="text"
              value={simDesc}
              onChange={(e) => setSimDesc(e.target.value)}
              placeholder="Ex: Hora Dev Sênior, Instância EC2, Papel A4..."
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Preço Unitário (R$):</label>
            <input
              type="number"
              step="0.01"
              value={simPrice}
              onChange={(e) => setSimPrice(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Quantidade:</label>
            <input
              type="number"
              value={simQty}
              onChange={(e) => setSimQty(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Confrontar Preço</span>
            </button>
          </div>
        </form>

        {simResult && simResult.lineComparisons[0] && (
          <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {simResult.lineComparisons[0].anomalyTitle}
                  </span>
                  {getStatusBadge(simResult.lineComparisons[0].status)}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {simResult.lineComparisons[0].details}
                </p>
                <p className="text-xs text-indigo-700 font-semibold mt-1">
                  Diretriz: {simResult.lineComparisons[0].recommendedAction}
                </p>
              </div>

              {simResult.lineComparisons[0].variancePercentage !== null && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shrink-0 text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Variação vs Mediana</span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      simResult.lineComparisons[0].variancePercentage > 15
                        ? 'text-rose-600'
                        : simResult.lineComparisons[0].variancePercentage < -20
                        ? 'text-blue-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {simResult.lineComparisons[0].variancePercentage > 0
                      ? `+${simResult.lineComparisons[0].variancePercentage}%`
                      : `${simResult.lineComparisons[0].variancePercentage}%`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Catalog of Enterprise Price Benchmarks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Catálogo de Benchmarks Históricos Homologados ({benchmarks.length} referências)
            </h3>
            <p className="text-xs text-slate-500">
              Preços médios ponderados calculados com base em contratos corporativos reais auditados.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar item ou categoria..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-slate-50"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas as Categorias ({benchmarks.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Benchmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredBenchmarks.map((bm) => (
            <div
              key={bm.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {bm.category.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs mt-1.5 leading-snug">
                    {bm.description}
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{bm.id}</span>
              </div>

              {/* Price Band */}
              <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold">Preço Mediano de Mercado:</span>
                  <span className="text-base font-bold font-mono text-indigo-700">
                    R$ {bm.medianPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 mt-1 border-t border-slate-100">
                  <span>Piso: R$ {bm.minPrice.toFixed(0)}</span>
                  <span>Teto: R$ {bm.maxPrice.toFixed(0)}</span>
                  <span>Un: {bm.unit}</span>
                </div>
              </div>

              {/* Benchmark Metadata */}
              <div className="text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Tolerância de Alerta:</span>
                  <strong className="text-amber-700">+{bm.toleranceWarningPct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tolerância Crítica:</span>
                  <strong className="text-rose-700">+{bm.toleranceCriticalPct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Amostras Auditadas:</span>
                  <span className="font-mono">{bm.sampleSize} contratos</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 text-[10px] text-slate-500">
                <span className="font-bold text-slate-700 block mb-0.5">Fornecedores Homologados:</span>
                <span className="line-clamp-1">{bm.verifiedVendors.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
