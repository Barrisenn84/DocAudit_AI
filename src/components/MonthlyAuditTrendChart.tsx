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
  Cell,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Filter,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { MonthlyAuditTrendItem, AuditTrendSummary } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface MonthlyAuditTrendChartProps {
  onSelectHotspotMonth?: (monthKey: string) => void;
}

export const MonthlyAuditTrendChart: React.FC<MonthlyAuditTrendChartProps> = ({
  onSelectHotspotMonth,
}) => {
  const [trendData, setTrendData] = useState<MonthlyAuditTrendItem[]>([]);
  const [summary, setSummary] = useState<AuditTrendSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyAuditTrendItem | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'hotspots_only'>('all');
  const [viewMetric, setViewMetric] = useState<'counts' | 'financial'>('counts');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTrendData = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ success: boolean; summary?: AuditTrendSummary }>('/api/cfo/monthly-audit-trend');
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary);
        setTrendData(res.data.summary.trends);
        // Default selected month to peak hotspot or current month
        const peak = res.data.summary.trends.find((t) => t.isHotspot) || res.data.summary.trends[res.data.summary.trends.length - 1];
        setSelectedMonth(peak || null);
      }
    } catch (err) {
      console.error('Error fetching audit trend data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, []);

  const displayedData = trendData.filter((item) => {
    if (filterMode === 'hotspots_only') {
      return item.isHotspot || item.hotspotLevel !== 'NORMAL';
    }
    return true;
  });

  const formatCurrency = (val: number) => {
    return `R$ ${(val / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: MonthlyAuditTrendItem = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-56 space-y-2 z-50">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <span className="font-bold text-sm text-slate-100">{item.monthLabel}</span>
            {item.isHotspot ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>HOTSPOT CRÍTICO</span>
              </span>
            ) : item.hotspotLevel === 'WARNING' ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>ATENÇÃO</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>REGULAR</span>
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>Documentos Processados:</span>
              <strong className="text-white font-mono">{item.processedDocuments}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Discrepâncias Encontradas:</span>
              <strong className="text-rose-400 font-mono font-bold">{item.discrepanciesFound}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Taxa de Divergência:</span>
              <strong className="text-amber-300 font-mono font-bold">{item.discrepancyRate}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              <span>Volume Auditado:</span>
              <span className="font-mono text-slate-200">
                R$ {item.totalFinancialVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Ponto de Atenção:
            </span>
            <p className="text-[11px] text-slate-200 leading-tight">{item.primaryIssueType}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Header & Visual Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Tendência Mensal de Auditoria: Documentos vs. Discrepâncias
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              Audit Hotspots
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Identifique picos de vulnerabilidade tributária, desvios operacionais e meses críticos com sobrecarga de divergências na esteira de compras e faturamento.
          </p>
        </div>

        {/* View Switches & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos os Meses
            </button>
            <button
              onClick={() => setFilterMode('hotspots_only')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                filterMode === 'hotspots_only'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Apenas Hotspots</span>
            </button>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMetric('counts')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMetric === 'counts'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Volumetria (Qtd)
            </button>
            <button
              onClick={() => setViewMetric('financial')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMetric === 'financial'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financeiro (R$)
            </button>
          </div>

          <button
            onClick={fetchTrendData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            title="Atualizar dados analíticos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Tiles Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Documentos</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-slate-900">
                {summary.totalProcessedDocuments.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">docs</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-800">Total Discrepâncias</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-rose-900">
                {summary.totalDiscrepanciesFound}
              </span>
              <span className="text-[10px] text-rose-600 font-semibold">ocorrências</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[11px] font-semibold text-amber-800 block">Taxa Média de Inconsistência</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-amber-900">
                {summary.overallDiscrepancyRate}%
              </span>
              <span className="text-[10px] text-amber-700">média</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-100/60 border border-rose-300">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-900">Pico Crítico (Hotspot)</span>
              <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
            </div>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-base font-bold text-rose-950 font-mono">
                {summary.peakHotspotMonth}
              </span>
              <span className="text-xs font-bold font-mono text-rose-700">
                ({summary.peakHotspotRate}%)
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">Aprovação Automática</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-emerald-900">
                {summary.autoApprovalRate}%
              </span>
              <span className="text-[10px] text-emerald-700">aderência</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Recharts Visualization */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedData}
            margin={{ top: 15, right: 25, left: 0, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const item: MonthlyAuditTrendItem = state.activePayload[0].payload;
                setSelectedMonth(item);
                if (onSelectHotspotMonth) {
                  onSelectHotspotMonth(item.monthKey);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
            />
            {viewMetric === 'counts' ? (
              <>
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  label={{
                    value: 'Documentos Processados (Qtd)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748B',
                    fontSize: 10,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#E11D48', fontSize: 11 }}
                  label={{
                    value: 'Discrepâncias / Taxa (%)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#E11D48',
                    fontSize: 10,
                  }}
                />
              </>
            ) : (
              <>
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#E11D48', fontSize: 10 }}
                  tickFormatter={formatCurrency}
                />
              </>
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.6 }} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
            />

            {/* Bar: Volume de Documentos / Volume Financeiro Total */}
            <Bar
              yAxisId="left"
              dataKey={viewMetric === 'counts' ? 'processedDocuments' : 'totalFinancialVolume'}
              name={viewMetric === 'counts' ? 'Documentos Processados' : 'Volume Total (R$)'}
              fill="#4F46E5"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            >
              {displayedData.map((entry, index) => {
                const isSelected = selectedMonth?.monthKey === entry.monthKey;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isHotspot ? '#4338CA' : isSelected ? '#3730A3' : '#6366F1'}
                    opacity={isSelected ? 1 : 0.85}
                  />
                );
              })}
            </Bar>

            {/* Line: Discrepâncias Encontradas */}
            <Line
              yAxisId={viewMetric === 'counts' ? 'right' : 'right'}
              type="monotone"
              dataKey={viewMetric === 'counts' ? 'discrepanciesFound' : 'discrepantFinancialVolume'}
              name={viewMetric === 'counts' ? 'Discrepâncias Encontradas' : 'Volume com Discrepância (R$)'}
              stroke="#E11D48"
              strokeWidth={3}
              dot={{ r: 5, fill: '#E11D48', strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 8, fill: '#BE123C', stroke: '#FFFFFF', strokeWidth: 2 }}
            />

            {/* Secondary Line: Taxa de Inconsistência (%) */}
            {viewMetric === 'counts' && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="discrepancyRate"
                name="Taxa de Erro (%)"
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F59E0B' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Hotspot Deep-Dive Inspector Panel */}
      {selectedMonth && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            selectedMonth.isHotspot
              ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400/30'
              : selectedMonth.hotspotLevel === 'WARNING'
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900">
                  Detalhamento de Auditoria: {selectedMonth.monthLabel}
                </span>
                {selectedMonth.isHotspot ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                    <Flame className="w-3.5 h-3.5" />
                    <span>HOTSPOT CRÍTICO IDENTIFICADO</span>
                  </span>
                ) : selectedMonth.hotspotLevel === 'WARNING' ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>ALERTA DE VARIAÇÃO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DENTRO DA TOLERÂNCIA</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
                <strong>Diagnóstico do Motor:</strong> {selectedMonth.notes}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>
                  Principal Causa:{' '}
                  <strong className="text-slate-900">{selectedMonth.primaryIssueType}</strong>
                </span>
                <span>•</span>
                <span>
                  Discrepâncias Críticas:{' '}
                  <strong className="text-rose-700 font-mono">
                    {selectedMonth.criticalDiscrepancies}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Avisos / Divergências Menores:{' '}
                  <strong className="text-amber-700 font-mono">
                    {selectedMonth.warningDiscrepancies}
                  </strong>
                </span>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shrink-0 text-right space-y-1">
              <span className="text-[11px] text-slate-500 block">Exposição Financeira Divergente</span>
              <span className="text-base font-bold font-mono text-rose-700 block">
                R$ {selectedMonth.discrepantFinancialVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block">
                de R$ {selectedMonth.totalFinancialVolume.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} auditados
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
