import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  FileText,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  Filter,
  Download,
} from 'lucide-react';
import { ClosingChecklistResult, ClosingChecklistTask } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import { exportClosingChecklistPdf } from '../utils/pdfExport.js';

interface ClosingChecklistViewProps {
  onNavigateToTab?: (tabName: any) => void;
}

export const ClosingChecklistView: React.FC<ClosingChecklistViewProps> = ({ onNavigateToTab }) => {
  const [checklist, setChecklist] = useState<ClosingChecklistResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BLOQUEADO' | 'PENDENTE' | 'CONCLUIDO'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; latestChecklist?: ClosingChecklistResult }>('/api/closing-checklist');
      if (res.success && res.data?.latestChecklist) {
        setChecklist(res.data.latestChecklist);
      }
    } catch (err: any) {
      console.error('Error fetching closing checklist:', err);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleGenerateChecklist = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await safeFetchJson<{ success: boolean; checklist?: ClosingChecklistResult; error?: string }>('/api/generate-closing-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: '2026-10',
          entity: 'Empresa Soluções Digitais S.A. (Matriz - SP)',
          freezeDate: '2026-10-05T00:00:00Z',
        }),
      });
      if (!res.success || !res.data?.checklist) {
        throw new Error(res.error || res.data?.error || 'Falha ao sintetizar checklist com Gemini.');
      }
      setChecklist(res.data.checklist);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const tasks = checklist?.tasks || [];
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação e Controle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Módulo 7 • Governança Contábil
            </span>
            <span className="text-xs font-mono text-slate-500">
              Modelo: <code className="text-indigo-600 font-bold">gemini-3.8-flash</code>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Checklist Inteligente de Fechamento Contábil
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Sintetiza as pendências e tarefas a partir do <strong>estado real do banco de dados</strong>.
            Aplica bloqueio estrito contra conciliações incompletas, partidas desbalanceadas e exceções críticas sem resolução.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {checklist && (
            <button
              onClick={() => exportClosingChecklistPdf(checklist)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Exportar Certificado de Fechamento Contábil em PDF"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Certificado PDF</span>
            </button>
          )}

          <button
            onClick={handleGenerateChecklist}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Consultando Estado Real...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Atualizar Checklist via IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">Fechar</button>
        </div>
      )}

      {/* Alerta de Status Geral de Bloqueio */}
      {checklist && (
        <div
          className={`rounded-2xl border p-5 transition-all shadow-xs ${
            checklist.is_closing_blocked
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  checklist.is_closing_blocked
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {checklist.is_closing_blocked ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base">
                    {checklist.is_closing_blocked
                      ? 'FECHAMENTO CONTÁBIL BLOQUEADO'
                      : 'FECHAMENTO CONTÁBIL LIBERADO PARA HOMOLOGAÇÃO'}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/80 border border-current">
                    Período {checklist.periodo_referencia}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {checklist.is_closing_blocked
                    ? 'Foram identificadas inconsistências materiais ou violações de regras mandatórias que impedem o encerramento do balancete.'
                    : 'Todas as tarefas prioritárias possuem evidências formais vinculadas e não há restrições ativas.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('cfo')}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Ir para Relatório CFO</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Motivos de Bloqueio Mandatórios */}
          {checklist.is_closing_blocked && checklist.blocking_reasons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-rose-200/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-950 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Condições Mandatórias de Bloqueio Detectadas:</span>
              </span>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {checklist.blocking_reasons.map((r, i) => (
                  <li key={i} className="flex items-start space-x-2 bg-white/70 p-2.5 rounded-lg border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                    <span className="text-rose-950 font-medium">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Painel de Métricas e Contadores */}
      {checklist && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Concluídas</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5 flex items-center space-x-1.5">
              <span>{checklist.completed_count}</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-500">com evidence_ids</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Bloqueadas</span>
            <div className="text-xl font-bold text-rose-600 mt-0.5 flex items-center space-x-1.5">
              <span>{checklist.blocked_count}</span>
              <AlertOctagon className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-500">ação mandatória</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</span>
            <div className="text-xl font-bold text-amber-600 mt-0.5 flex items-center space-x-1.5">
              <span>{checklist.pending_count}</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-500">sem evidência</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Não Reconciliados</span>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {checklist.real_state_summary.unreconciled_items_count}
            </div>
            <span className="text-[10px] text-slate-500">extrato bancário</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Exceções Críticas</span>
            <div className="text-xl font-bold text-rose-700 mt-0.5">
              {checklist.real_state_summary.critical_exceptions_open_count}
            </div>
            <span className="text-[10px] text-slate-500">não encerradas</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Propostas Rejeitadas</span>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {checklist.real_state_summary.unbalanced_proposals_count}
            </div>
            <span className="text-[10px] text-slate-500">desequilíbrio contábil</span>
          </div>
        </div>
      )}

      {/* Regras e Diretrizes do Fechamento */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 flex items-start space-x-3">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-indigo-900">
            Princípios Contábeis de Governança Aplicados pelo Gemini:
          </p>
          <p className="text-slate-600 leading-relaxed">
            1. <strong>Não presuma conclusão porque a data passou.</strong> Tarefas só são concluídas mediante comprovante.<br />
            2. <strong>Não marque tarefa como concluída sem <code>evidence_ids</code>.</strong> Toda baixa exige documento fonte.<br />
            3. <strong>Não invente dependências.</strong> Relacionamentos devem refletir o fluxo de trabalho real.<br />
            4. <strong>Bloqueie o fechamento</strong> diante de: bancos não reconciliados, saldos materiais sem suporte, exceções críticas abertas ou propostas contábeis desequilibradas.
          </p>
        </div>
      </div>

      {/* Lista de Tarefas do Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Tarefas Estruturadas do Fechamento
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              {filteredTasks.length} de {tasks.length}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {(['ALL', 'BLOQUEADO', 'PENDENTE', 'CONCLUIDO'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' && 'Todas'}
                {filter === 'BLOQUEADO' && 'Bloqueadas'}
                {filter === 'PENDENTE' && 'Pendentes'}
                {filter === 'CONCLUIDO' && 'Concluídas'}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            Nenhuma tarefa encontrada com o filtro selecionado. Clique em &quot;Atualizar Checklist via IA&quot; para carregar o estado em tempo real.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => (
              <div key={task.task_id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {task.task_id}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {task.modulo}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {task.descricao}
                    </h4>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {task.status === 'CONCLUIDO' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>CONCLUÍDO</span>
                      </span>
                    )}
                    {task.status === 'BLOQUEADO' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                        <span>BLOQUEADO</span>
                      </span>
                    )}
                    {task.status === 'PENDENTE' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>PENDENTE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Motivo de Bloqueio */}
                {task.status === 'BLOQUEADO' && task.motivo_bloqueio && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Motivo do Bloqueio: </span>
                      <span>{task.motivo_bloqueio}</span>
                    </div>
                  </div>
                )}

                {/* Grid de Detalhes da Tarefa */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsável</span>
                    <span className="font-medium text-slate-800">{task.responsavel}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Critério de Aceite</span>
                    <span className="text-slate-700">{task.criterio_aceite}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Próxima Ação</span>
                    <span className="font-medium text-indigo-700">{task.proxima_acao}</span>
                  </div>
                </div>

                {/* Evidências e Dependências */}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                  <div className="flex items-center space-x-1 text-slate-500">
                    <span className="font-semibold text-slate-600">Dependências:</span>
                    {task.dependencias.length > 0 ? (
                      task.dependencias.map((dep, idx) => (
                        <span key={idx} className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          {dep}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-slate-400">Nenhuma dependência</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-slate-500 ml-auto">
                    <span className="font-semibold text-slate-600">Evidence IDs:</span>
                    {task.evidence_ids.length > 0 ? (
                      task.evidence_ids.map((ev, idx) => (
                        <span key={idx} className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {ev}
                        </span>
                      ))
                    ) : (
                      <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                        Ausente (Impede Conclusão)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
