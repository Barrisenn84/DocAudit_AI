import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Filter,
  Search,
  UserCheck,
  HelpCircle,
  Play,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import { ExceptionTriageResult, ExceptionCategory, ExceptionPriority } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import { exportExceptionsAuditPdf } from '../utils/pdfExport.js';

export const ExceptionTriageView: React.FC = () => {
  const [exceptions, setExceptions] = useState<ExceptionTriageResult[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('Divergência de Reconhecimento Contábil de Hardware');
  const [newDescription, setNewDescription] = useState('Equipamentos faturados como despesa de suprimentos sem laudo de imobilização (CAPEX)');
  const [newAmount, setNewAmount] = useState('65000.00'); // Acima de 50k para testar gemini-3.1-pro-preview para materialidade!
  const [newModule, setNewModule] = useState<'extraction' | 'classification' | 'journal' | 'revenue' | 'reconciliation'>('journal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingException, setResolvingException] = useState<ExceptionTriageResult | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [auditorName, setAuditorName] = useState('Auditor Sênior de Controladoria');

  const fetchExceptions = () => {
    safeFetchJson<{ success: boolean; exceptions: ExceptionTriageResult[] }>('/api/exceptions')
      .then((res) => res.success && setExceptions(res.data?.exceptions || []));
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleTriageNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await safeFetchJson<{ success: boolean; exception: ExceptionTriageResult }>('/api/triage-exception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          amount: parseFloat(newAmount) || 0,
          source_module: newModule,
        }),
      });
      if (res.success && res.data?.exception) {
        setExceptions((prev) => [res.data!.exception, ...prev]);
        setIsCreatingNew(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveHuman = async () => {
    if (!resolvingException) return;
    try {
      const res = await safeFetchJson<{ success: boolean; exception: ExceptionTriageResult }>(`/api/exceptions/${resolvingException.exception_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: resolutionNotes,
          resolved_by: auditorName,
        }),
      });
      if (res.success && res.data?.exception) {
        setExceptions((prev) =>
          prev.map((ex) => (ex.exception_id === res.data!.exception.exception_id ? res.data!.exception : ex))
        );
        setResolvingException(null);
        setResolutionNotes('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = exceptions.filter((ex) => {
    if (activeCategoryFilter === 'all') return true;
    return ex.category === activeCategoryFilter;
  });

  const getPriorityBadge = (p: ExceptionPriority) => {
    switch (p) {
      case 'critica':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 uppercase">CRÍTICA</span>;
      case 'alta':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">ALTA</span>;
      case 'media':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">MÉDIA</span>;
      case 'baixa':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">BAIXA</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Inviolable Rule Banner */}
      <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-xs">
        <Lock className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-rose-900 text-sm">
            REGRA MANDATÓRIA: UMA EXCEÇÃO CRÍTICA OU MATERIAL NUNCA PODE SER ENCERRADA PELO MODELO
          </h3>
          <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
            A IA atua na <strong>triagem, categorização e diagnóstico de fatos</strong> sem alterar o livro razão.
            O encerramento é prerrogativa exclusiva do auditor humano após comprovação do cumprimento da condição objetiva.
          </p>
        </div>
      </div>

      {/* Main Header & New Exception Trigger */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Módulo 6: Triagem Centralizada de Exceções
              </h2>
              <p className="text-xs text-slate-500">
                gemini-3.8-flash (triagem geral) • gemini-3.1-pro-preview (análise de materialidade)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {filtered.length > 0 && (
              <button
                onClick={() => exportExceptionsAuditPdf(filtered, activeCategoryFilter)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Exportar Parecer Técnico de Exceções & Riscos em PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>Parecer PDF</span>
              </button>
            )}

            <button
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submeter Nova Exceção</span>
            </button>
          </div>
        </div>

        {/* New Exception Form */}
        {isCreatingNew && (
          <form onSubmit={handleTriageNew} className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Parâmetros da Exceção a Triar:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Título da Exceção:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Módulo Origem:</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="journal">3. Proposta de Lançamento</option>
                  <option value="extraction">1. Extração de Documentos</option>
                  <option value="classification">2. Classificação de Transações</option>
                  <option value="revenue">4. Reconhecimento de Receita</option>
                  <option value="reconciliation">5. Reconciliação Assistida</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Descrição do Fato Contábil:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Valor Relevante (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                Valores {'>='} R$ 50.000 acionam automaticamente o modelo Pro de materialidade.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Triando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Executar Triagem</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Category Filter Chips */}
        <div className="mt-4 flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-slate-500 text-[11px] uppercase mr-1">Filtrar:</span>
          {['all', 'materiality_review', 'policy_conflict', 'amount_mismatch', 'period_conflict', 'missing_source'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeCategoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? `Todas (${exceptions.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exception Cards (with the 8 mandatory return fields) */}
      <div className="space-y-4">
        {filtered.map((exc) => {
          const isResolved = exc.status === 'RESOLVED_BY_HUMAN';
          return (
            <div
              key={exc.exception_id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                isResolved
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : exc.prioridade === 'critica'
                  ? 'border-rose-300 ring-1 ring-rose-400/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{exc.exception_id}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    Categoria: {exc.category}
                  </span>
                  {getPriorityBadge(exc.prioridade)}
                  <span className="text-[10px] font-mono text-slate-400">Modelo: {exc.model_used}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {isResolved ? (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      ENCERRADA PELO AUDITOR
                    </span>
                  ) : (
                    <button
                      onClick={() => setResolvingException(exc)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cumprir Condição & Encerrar</span>
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-3">{exc.title}</h3>

              {/* The 8 Mandatory Triage Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
                {/* 1. Fatos Observados */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    1. Fatos Observados:
                  </span>
                  <ul className="space-y-0.5 text-slate-700 leading-snug">
                    {exc.fatos_observados.map((f, fi) => (
                      <li key={fi}>• {f}</li>
                    ))}
                  </ul>
                </div>

                {/* 2 & 3. Evidências Disponíveis vs Ausentes */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    2 & 3. Rastreabilidade de Evidências:
                  </span>
                  <div className="text-emerald-700 text-[11px] mb-1">
                    <strong>Disponíveis:</strong> {exc.evidencias_disponiveis.join(', ') || 'Nenhuma'}
                  </div>
                  <div className="text-rose-700 text-[11px]">
                    <strong>Ausentes:</strong> {exc.evidencias_ausentes.join(', ') || 'Nenhuma'}
                  </div>
                </div>

                {/* 4 & 5. Impacto Potencial & Prioridade */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    4. Impacto Potencial:
                  </span>
                  <p className="text-slate-700 leading-snug">{exc.impacto_potencial}</p>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Responsável: <strong className="text-slate-800">{exc.responsavel_sugerido}</strong>
                  </div>
                </div>

                {/* 7 & 8. Próxima Pergunta & Condição Objetiva */}
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">
                    7 & 8. Encaminhamento:
                  </span>
                  <div className="text-slate-800 text-[11px] mb-1.5 font-medium">
                    ❓ <strong>Próxima Pergunta:</strong> {exc.proxima_pergunta}
                  </div>
                  <div className="text-indigo-950 text-[11px] font-bold">
                    🎯 <strong>Condição Objetiva de Encerramento:</strong> {exc.condicao_objetiva_encerramento}
                  </div>
                </div>
              </div>

              {/* Resolution details if already resolved by human */}
              {isResolved && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <strong>Encerrada por:</strong> {exc.resolved_by} em {new Date(exc.resolved_at!).toLocaleDateString()}
                    <div className="text-slate-600 mt-0.5 italic">"{exc.resolution_notes}"</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resolution Modal for Human Auditor */}
      {resolvingException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Encerramento de Exceção Contábil pelo Auditor
              </h3>
              <button
                onClick={() => setResolvingException(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-950">
              <strong className="block mb-1">Condição Objetiva de Encerramento Exigida:</strong>
              {resolvingException.condicao_objetiva_encerramento}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome do Auditor Responsável:
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Parecer / Evidência Comprovada de Atendimento da Condição:
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Ex: Recebida CC-e Nº 998 emitida pelo fornecedor comprovando a alocação do desconto e regularizando o valor."
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setResolvingException(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveHuman}
                disabled={!resolutionNotes.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
              >
                Homologar Encerramento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
