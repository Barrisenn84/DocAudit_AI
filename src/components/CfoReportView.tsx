import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Download,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  TrendingUp,
  FileText,
  Lock,
  Unlock,
  Check,
} from 'lucide-react';
import { CfoClosingReportResult } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import { exportCfoReportPdf } from '../utils/pdfExport.js';
import { MonthlyAuditTrendChart } from './MonthlyAuditTrendChart.js';

export const CfoReportView: React.FC = () => {
  const [report, setReport] = useState<CfoClosingReportResult | null>(null);
  const [isDataApproved, setIsDataApproved] = useState<boolean>(false);
  const [approvalMeta, setApprovalMeta] = useState<{ auditor?: string; approved_at?: string; notes?: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approverInput, setApproverInput] = useState<string>('Dra. Vanessa Cavalcanti - Controller Geral');

  const fetchReportData = async () => {
    try {
      const res = await safeFetchJson<{
        success: boolean;
        isClosingDataApproved?: boolean;
        closingApprovalMeta?: any;
        latestReport?: CfoClosingReportResult;
      }>('/api/cfo-report');
      if (res.success && res.data) {
        setIsDataApproved(Boolean(res.data.isClosingDataApproved));
        if (res.data.closingApprovalMeta) {
          setApprovalMeta(res.data.closingApprovalMeta);
        }
        if (res.data.latestReport) {
          setReport(res.data.latestReport);
        }
      }
    } catch (err) {
      console.error('Error fetching CFO report data:', err);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleApproveData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await safeFetchJson<{ success: boolean; closingApprovalMeta?: any }>('/api/approve-closing-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor: approverInput,
          notes: 'Dados contábeis, conciliações e notas fiscais homologados para elaboração do relatório executivo.',
        }),
      });
      if (res.success && res.data) {
        setIsDataApproved(true);
        if (res.data.closingApprovalMeta) {
          setApprovalMeta(res.data.closingApprovalMeta);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao aprovar dados contábeis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await safeFetchJson<{ success: boolean; report?: CfoClosingReportResult; message?: string; error?: string }>('/api/generate-cfo-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.success || !res.data?.report) {
        throw new Error(res.data?.message || res.data?.error || res.error || 'Falha ao gerar relatório para o CFO.');
      }
      setReport(res.data.report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de comunicação ao gerar relatório.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_CFO_${report.periodo}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Módulo 8 • Relatório Executivo
            </span>
            <span className="text-xs font-mono text-slate-500">
              Modelo: <code className="text-indigo-600 font-bold">gemini-3.8-flash</code> (Pós-Aprovação)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Relatório de Fechamento para CFO / Controller
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Consolidação executiva com 12 seções estruturadas e separação categórica estrita entre <strong>Fato</strong>, <strong>Interpretação</strong>, <strong>Pergunta</strong> e <strong>Risco</strong>.
            Sem explicações causais sem evidência e números inalterados.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {report && (
            <>
              <button
                onClick={() => exportCfoReportPdf(report, approvalMeta)}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs hover:shadow"
                title="Exportar Relatório Oficial do CFO em PDF para Diretoria e Reguladores"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Exportar Parecer PDF</span>
              </button>
              <button
                onClick={handleExportJson}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Exportar JSON</span>
              </button>
            </>
          )}

          {isDataApproved && (
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Sintetizando Relatório...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{report ? 'Atualizar com Gemini' : 'Gerar Relatório Executivo'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">Fechar</button>
        </div>
      )}

      {/* PAINEL DE VISUALIZAÇÃO: TENDÊNCIA MENSAL & AUDIT HOTSPOTS (RECHARTS) */}
      <MonthlyAuditTrendChart />

      {/* GATE MANDATÓRIO: APROVAÇÃO DOS DADOS ANTES DO RELATÓRIO */}
      {!isDataApproved ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base text-amber-950">
                    Gate de Governança: Aprovação Prévia de Dados Mandatória
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Regra Estrita
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                  Conforme a especificação: <em>&quot;Use gemini-3.8-flash somente depois que os dados forem aprovados&quot;</em>.
                  O relatório executivo para o CFO ou Controller não pode ser gerado sobre números preliminares não homologados.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    value={approverInput}
                    onChange={(e) => setApproverInput(e.target.value)}
                    placeholder="Nome e Cargo do Auditor / Controller Responsável"
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 w-full sm:w-80 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleApproveData}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Homologar Dados e Liberar Relatório</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-emerald-950">
                  Dados Aprovados para Emissão Executiva
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  STATUS: HOMOLOGADO
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Auditor: <strong>{approvalMeta.auditor || 'Dra. Vanessa Cavalcanti'}</strong> • Homologado em {approvalMeta.approved_at ? new Date(approvalMeta.approved_at).toLocaleString() : 'Recente'}
              </p>
            </div>
          </div>

          {!report && (
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Gerar Relatório Executivo Agora</span>
            </button>
          )}
        </div>
      )}

      {/* Exibição do Relatório Estruturado */}
      {report && (
        <div className="space-y-6">
          {/* SEPARAÇÃO OBRIGATÓRIA: QUADRANTE ANALÍTICO (FATO, INTERPRETAÇÃO, PERGUNTA, RISCO) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Separação Epistêmica Mandatória
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Fato ≠ Interpretação ≠ Pergunta ≠ Risco
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fatos */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fatos Observados</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-1.5">
                  {report.fatos.map((f, i) => (
                    <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interpretações */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Interpretações</span>
                </div>
                <ul className="text-xs text-blue-950 space-y-1.5">
                  {report.interpretacoes.map((item, i) => (
                    <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Perguntas */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Perguntas para Aprovação</span>
                </div>
                <ul className="text-xs text-amber-950 space-y-1.5">
                  {report.perguntas.map((p, i) => (
                    <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-amber-500 mt-0.5">?</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Riscos */}
              <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-rose-900 font-bold text-xs uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Riscos Identificados</span>
                </div>
                <ul className="text-xs text-rose-950 space-y-1.5">
                  {report.riscos.map((r, i) => (
                    <li key={i} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-rose-500 mt-0.5">!</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* AS 12 SEÇÕES FORMAIS DO RELATÓRIO DO CFO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {/* Seção 1 & 2: Status Geral, Período e Entidades */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">
                  Seção 1 & 2 • Panorama Executivo
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {report.report_id}</span>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>{report.secao_2_periodo_e_entidades.entidades.join(', ')}</span>
                  <span>•</span>
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Período {report.secao_2_periodo_e_entidades.periodo}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {report.secao_1_status_geral}
                </p>
                <div className="text-xs text-slate-400 border-t border-slate-800 pt-2">
                  Freeze Status: {report.secao_2_periodo_e_entidades.status_freeze}
                </div>
              </div>
            </div>

            {/* Seção 3: Contas Fechadas */}
            <div className="p-6 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                Seção 3 • Contas Fechadas & Conciliadas
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600 text-left">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Nome da Conta</th>
                      <th className="p-3 text-right">Saldo Final</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Evidence ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.secao_3_contas_fechadas.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700">{c.conta}</td>
                        <td className="p-3 font-medium text-slate-900">{c.nome}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          R$ {Number(c.saldo_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{c.evidence_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 4: Contas Pendentes */}
            <div className="p-6 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                Seção 4 • Contas com Pendências de Apuração
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600 text-left">
                    <tr>
                      <th className="p-3">Conta</th>
                      <th className="p-3">Descrição da Pendência</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3">Bloqueio Aplicado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.secao_4_contas_pendentes.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {c.conta} - {c.nome}
                        </td>
                        <td className="p-3 text-slate-700">{c.pendencia}</td>
                        <td className="p-3 font-medium text-slate-800">{c.responsavel}</td>
                        <td className="p-3 text-rose-700 font-semibold">{c.bloqueio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 5: Principais Variações */}
            <div className="p-6 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                Seção 5 • Principais Variações de Saldos
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-600 text-left">
                    <tr>
                      <th className="p-3">Rubrica</th>
                      <th className="p-3 text-right">Anterior</th>
                      <th className="p-3 text-right">Atual</th>
                      <th className="p-3 text-center">Variação %</th>
                      <th className="p-3">Explicação Comprovada por Evidência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.secao_5_principais_variacoes.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-900">{v.rubrica}</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          R$ {Number(v.valor_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          R$ {Number(v.valor_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              v.variacao_percentual.startsWith('+')
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {v.variacao_percentual}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 italic">
                          {v.explicacao_comprovada === 'não determinado' ? (
                            <span className="text-amber-700 font-semibold">não determinado (sem evidência causal)</span>
                          ) : (
                            v.explicacao_comprovada
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 6, 7 & 8: Exceções, Lançamentos Manuais & Reversões */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Exceções Abertas */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Seção 6 • Exceções Abertas
                </h4>
                <div className="space-y-2">
                  {report.secao_6_excecoes_abertas.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{e.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          {e.prioridade}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{e.impacto}</p>
                      <p className="text-[11px] text-slate-500">Encerramento: {e.condicao_encerramento}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lançamentos Manuais */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Seção 7 • Lançamentos Manuais
                </h4>
                <div className="space-y-2">
                  {report.secao_7_lancamentos_manuais.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span>{m.id}</span>
                        <span className="text-indigo-700">R$ {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-slate-700">{m.justificativa}</p>
                      <span className="text-[10px] text-slate-400 block">Aprovador: {m.aprovador}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reversões */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Seção 8 • Reversões de Provisão
                </h4>
                <div className="space-y-2">
                  {report.secao_8_reversoes.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span>{r.id}</span>
                        <span className="text-emerald-700">R$ {Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-slate-700">{r.descricao}</p>
                      <span className="text-[10px] text-slate-500 block">Motivo: {r.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seção 9 & 10: Mudanças de Política & Riscos */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Seção 9 • Políticas Contábeis Versionadas
                </h4>
                <div className="space-y-2">
                  {report.secao_9_mudancas_de_politica.map((p) => (
                    <div key={p.policy_id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-indigo-700">{p.policy_id}</span>
                        <span className="font-semibold text-slate-800">{p.titulo}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                          {p.versao}
                        </span>
                      </div>
                      <p className="text-slate-600">{p.impacto_adotado}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Seção 10 • Riscos & Mitigações
                </h4>
                <div className="space-y-2">
                  {report.secao_10_riscos.map((rk, i) => (
                    <div key={i} className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-950">{rk.risco}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                          {rk.severidade}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Mitigação: </span>
                        {rk.mitigacao}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seção 11 & 12: Perguntas para Aprovação & Evidências */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Seção 11 • Perguntas para Decisão do CFO</span>
                </h4>
                <div className="space-y-2">
                  {report.secao_11_perguntas_para_aprovacao.map((q, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-amber-950 space-y-1">
                      <span className="font-bold text-amber-700">Questão #{i + 1}: </span>
                      <p className="font-medium">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Seção 12 • Catálogo de Evidências Oficiais</span>
                </h4>
                <div className="space-y-2">
                  {report.secao_12_evidencias.map((ev) => (
                    <div key={ev.evidence_id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-indigo-700 block">{ev.evidence_id}</span>
                        <span className="text-slate-600 text-[11px]">{ev.descricao}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {ev.modulo_origem}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
