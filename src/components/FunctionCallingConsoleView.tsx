import React, { useState, useEffect } from 'react';
import {
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Database,
  Search,
  FileText,
  Lock,
  Sparkles,
  Layers,
  Code,
  Clock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { FunctionCallingSession, FunctionCallExecution } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

export const FunctionCallingConsoleView: React.FC = () => {
  const [specs, setSpecs] = useState<{
    allowed_read_only_tools: any[];
    blocked_mutating_functions: any[];
  } | null>(null);

  const [queryInput, setQueryInput] = useState<string>(
    'Consulte a fatura imutável DOC-HIST-001 e verifique se a despesa com serviços em nuvem está de acordo com as políticas contábeis vigentes de TI.'
  );
  const [currentSession, setCurrentSession] = useState<FunctionCallingSession | null>(null);
  const [history, setHistory] = useState<FunctionCallingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSpecsAndHistory = async () => {
    try {
      const sRes = await safeFetchJson<any>('/api/function-calling-specs');
      if (sRes.success && sRes.data) {
        setSpecs(sRes.data);
      }

      const hRes = await safeFetchJson<{ success: boolean; sessions?: FunctionCallingSession[] }>('/api/function-calling-history');
      if (hRes.success && Array.isArray(hRes.data?.sessions)) {
        setHistory(hRes.data.sessions);
        if (hRes.data.sessions.length > 0 && !currentSession) {
          setCurrentSession(hRes.data.sessions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch function calling specs:', err);
    }
  };

  useEffect(() => {
    fetchSpecsAndHistory();
  }, []);

  const handleExecuteAgent = async (overrideQuery?: string) => {
    const q = overrideQuery || queryInput;
    if (!q.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await safeFetchJson<{ success: boolean; session?: FunctionCallingSession; error?: string }>('/api/agent-function-calling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.success || !res.data?.session) {
        throw new Error(res.data?.error || res.error || 'Falha ao executar Function Calling com Gemini.');
      }
      const newSession = res.data.session;
      setCurrentSession(newSession);
      setHistory((prev) => [newSession, ...prev]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal e Distinção do Google */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-violet-50 text-violet-800 border border-violet-200">
              Módulo 9 • Function Calling Autônomo
            </span>
            <span className="text-xs font-mono text-slate-500">
              Modelo: <code className="text-indigo-600 font-bold">gemini-3.8-flash</code> (Tools API)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Ações Controladas & Governança de Ferramentas
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            O Google diferencia <strong>Structured Outputs</strong> (usados para formatar respostas) de{' '}
            <strong>Function Calling</strong> (usado pelo modelo para solicitar ações externas controladas).
            Apenas <strong>funções de leitura</strong> estão expostas inicialmente. Funções de mutação/escrita permanecem bloqueadas por governança.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>3 Funções de Leitura Ativas</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
            <Lock className="w-4 h-4 text-rose-600" />
            <span>6 Ações Mutantes Bloqueadas</span>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold underline ml-2">Fechar</button>
        </div>
      )}

      {/* MATRIZ DE GOVERNANÇA: FUNÇÕES DE LEITURA (VERDE) VS FUNÇÕES DE ESCRITA BLOQUEADAS (VERMELHO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: As 3 Funções de Leitura Liberadas */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                R/O
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Funções Expostas ao Gemini (Read-Only)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              AUTORIZADO
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono font-bold text-emerald-900">get_source_document</code>
                <span className="text-[10px] font-mono text-slate-500">source_id</span>
              </div>
              <p className="text-xs text-slate-600">
                Obtém um documento imutável pelo <code>source_id</code>. Acessa dados fiscais, itens de fatura e evidências textuais sem alterar o registro.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono font-bold text-emerald-900">search_policy</code>
                <span className="text-[10px] font-mono text-slate-500">entity_id, topic, period</span>
              </div>
              <p className="text-xs text-slate-600">
                Busca políticas contábeis vigentes. Retorna versões semânticas, regras de competência e diretrizes de capitalização/apropriação.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono font-bold text-emerald-900">find_reconciliation_candidates</code>
                <span className="text-[10px] font-mono text-slate-500">account_id, period</span>
              </div>
              <p className="text-xs text-slate-600">
                Busca candidatos calculados pelo motor algorítmico de matching. Compara razão contábil e extrato sem marcar saldo como reconciliado.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 2: As 6 Funções de Mutação Bloqueadas e Guardrails Mandatórios */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs">
                W/R
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Funções Mutantes Bloqueadas (Governança)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
              BLOQUEIO ESTRITO
            </span>
          </div>

          <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
            {[
              { name: 'post_journal_entry', desc: 'Postar lançamento no razão contábil' },
              { name: 'close_period', desc: 'Encerrar período contábil e congelar livros' },
              { name: 'delete_source', desc: 'Deletar documento comprobatório da base' },
              { name: 'change_accounting_policy', desc: 'Alterar redação ou regra de política contábil' },
              { name: 'approve_exception', desc: 'Encerrar exceção sem aprovação humana' },
              { name: 'execute_payment', desc: 'Disparar ordem de pagamento bancário / PIX' },
            ].map((f) => (
              <div key={f.name} className="p-2.5 rounded-lg border border-rose-200/70 bg-rose-50/20 text-xs flex items-center justify-between">
                <div>
                  <code className="font-mono font-bold text-rose-900 text-[11px] block">{f.name}</code>
                  <span className="text-[11px] text-slate-600">{f.desc}</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Não Exposta
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] space-y-1">
            <span className="font-bold text-amber-400 block uppercase tracking-wide">
              Salvaguardas Mandatórias para Habilitação Futura:
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • RBAC • Autorização explícita • Limite de materialidade • Idempotency key • Dupla aprovação • Período aberto • Política vigente • Trilha de auditoria • Possibilidade de rollback.
            </p>
          </div>
        </div>
      </div>

      {/* CONSOLE INTERATIVO DE FUNCTION CALLING */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Console de Execução de Function Calling
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Ciclo: Prompt → Gemini Function Call → Execução Backend → Grounded Response
          </span>
        </div>

        {/* Atalhos com Cenários Prontos */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
            Cenários de Teste Rápidos:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const q = 'Consulte o documento imutável DOC-HIST-001 e detalhe as linhas faturadas e o CNPJ do emissor.';
                setQueryInput(q);
                handleExecuteAgent(q);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1"
            >
              <span>📄 Ler Fatura Imutável (DOC-HIST-001)</span>
            </button>

            <button
              onClick={() => {
                const q = 'Busque as políticas contábeis vigentes sobre serviços em nuvem para a entidade Empresa Soluções Digitais S.A. no período 2026-10.';
                setQueryInput(q);
                handleExecuteAgent(q);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1"
            >
              <span>🔍 Buscar Política Vigente (POL-IT-01)</span>
            </button>

            <button
              onClick={() => {
                const q = 'Busque os candidatos calculados pelo motor de matching para a conta bancária 1.1.01.001 no período 2026-10.';
                setQueryInput(q);
                handleExecuteAgent(q);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1"
            >
              <span>⚖️ Buscar Candidatos de Conciliação</span>
            </button>

            <button
              onClick={() => {
                const q = 'Poste o lançamento contábil post_journal_entry debitando R$ 80.000 na conta 3.1.01.001.';
                setQueryInput(q);
                handleExecuteAgent(q);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold cursor-pointer transition-colors flex items-center space-x-1"
            >
              <Lock className="w-3 h-3 text-rose-600" />
              <span>🚫 Testar Bloqueio de Ação Mutante</span>
            </button>
          </div>
        </div>

        {/* Input Textual */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <textarea
            rows={2}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Digite uma instrução ou pergunta para o assistente autônomo com tools..."
            className="flex-1 p-3 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
          <button
            onClick={() => handleExecuteAgent()}
            disabled={isLoading || !queryInput.trim()}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Executando Turno...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Executar via Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RASTREIO DETALHADO DO AGENTE (MULTI-TURN VISUALIZER) */}
      {currentSession && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                Sessão: {currentSession.session_id}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  currentSession.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {currentSession.status === 'COMPLETED'
                  ? 'CICLO CONCLUÍDO COM FERRAMENTAS'
                  : 'AÇÃO MUTANTE BLOQUEADA PREVENTIVAMENTE'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Chamadas de Ferramenta: {currentSession.function_calls.length}
            </span>
          </div>

          {/* Turnos do Agente Passo a Passo */}
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {currentSession.agent_turns.map((turn) => (
                <div key={turn.step} className="flex items-start space-x-4">
                  {/* Ícone de cada etapa */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      turn.type === 'user_prompt'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : turn.type === 'model_function_call'
                        ? 'bg-indigo-600 text-white'
                        : turn.type === 'backend_tool_execution'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {turn.step}
                  </div>

                  <div className="flex-1 bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                        <span>{turn.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(turn.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Conteúdo específico da etapa */}
                    {turn.type === 'user_prompt' && (
                      <p className="text-xs text-slate-800 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                        {turn.details.query}
                      </p>
                    )}

                    {turn.type === 'model_function_call' && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-indigo-700">
                          Função Solicitada: <code className="font-bold font-mono">{turn.details.function_name}</code>
                        </span>
                        <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto">
                          {JSON.stringify(turn.details.arguments, null, 2)}
                        </pre>
                      </div>
                    )}

                    {turn.type === 'backend_tool_execution' && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Execução Local Concluída (Resposta Enviada de Volta ao Modelo):</span>
                        </span>
                        <pre className="text-[11px] font-mono bg-white border border-emerald-200 text-slate-800 p-2.5 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(turn.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {turn.type === 'model_final_response' && (
                      <div className="bg-white border border-indigo-100 rounded-lg p-3 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                          Síntese Final Fundamentada nas Evidências:
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {turn.details.answer}
                        </p>
                      </div>
                    )}
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
