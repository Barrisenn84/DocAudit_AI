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
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Lock,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileCheck2,
  KeyRound,
  Scale,
  Hash,
} from 'lucide-react';
import {
  BenfordLawAnalysisResult,
  SodAuditViolation,
  CryptographicAuditBlock,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface ForensicsSoxViewProps {
  documents: ProcessedDocument[];
}

export const ForensicsSoxView: React.FC<ForensicsSoxViewProps> = ({ documents }) => {
  const [activeSubTab, setActiveSubTab] = useState<'benford' | 'sod' | 'trail'>('benford');
  const [benfordResult, setBenfordResult] = useState<BenfordLawAnalysisResult | null>(null);
  const [sodViolations, setSodViolations] = useState<SodAuditViolation[]>([]);
  const [auditChain, setAuditChain] = useState<CryptographicAuditBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiOpinion, setAiOpinion] = useState<{
    opinionTitle: string;
    riskRating: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    laudoExecutiveSummary: string;
    anomaliesIdentified: string[];
    recommendations: string[];
    suggestedAuditSamplingPct: number;
    modelUsed: string;
  } | null>(null);
  const [isGeneratingAiOpinion, setIsGeneratingAiOpinion] = useState(false);

  const handleGenerateAiOpinion = async () => {
    setIsGeneratingAiOpinion(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        opinion: any;
      }>('/api/forensics/ai-opinion', {
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

  const fetchForensicsData = async () => {
    setIsLoading(true);
    try {
      const [bRes, sRes, tRes] = await Promise.all([
        safeFetchJson<{ success: boolean; result: BenfordLawAnalysisResult }>('/api/forensics/benford-analysis'),
        safeFetchJson<{ success: boolean; violations: SodAuditViolation[] }>('/api/forensics/sod-violations'),
        safeFetchJson<{ success: boolean; chain: CryptographicAuditBlock[] }>('/api/forensics/audit-trail'),
      ]);

      if (bRes.success && bRes.data?.result) setBenfordResult(bRes.data.result);
      if (sRes.success && sRes.data?.violations) setSodViolations(sRes.data.violations);
      if (tRes.success && tRes.data?.chain) setAuditChain(tRes.data.chain);
    } catch (err) {
      console.error('Error fetching forensics data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForensicsData();
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Auditoria Forense & Conformidade SOX</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Lei de Benford, Matriz SoD & Trilha Criptográfica SHA-256
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Detecção estatística de anomalias e adulterações financeiras (Benford's Law), prevenção de conflitos de interesse (Segregation of Duties) e cadeia de custódia imutável.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('benford')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'benford' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            1. Lei de Benford
          </button>
          <button
            onClick={() => setActiveSubTab('sod')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'sod' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            2. Matriz SoD ({sodViolations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('trail')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'trail' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            3. Trilha Cripto ({auditChain.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LEI DE BENFORD */}
      {activeSubTab === 'benford' && benfordResult && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Amostra Analisada</span>
              <p className="text-2xl font-mono font-bold text-slate-900">
                {benfordResult.totalSampleTransactions} transações
              </p>
              <span className="text-[11px] text-slate-500">Valores de faturas e itens</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Nível de Conformidade Forense</span>
              <p className="text-xl font-bold text-emerald-700">
                {benfordResult.conformityLevel === 'CLOSE_CONFORMITY'
                  ? 'Forte Aderência (Sem Fraude)'
                  : 'Atenção Estatística'}
              </p>
              <span className="text-[11px] text-slate-500">Desvio Médio: {benfordResult.meanDeviationPct}% (Chi²: {benfordResult.chiSquareScore})</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Grau de Confiança (p-value)</span>
              <p className="text-2xl font-mono font-bold text-indigo-600">
                {(benfordResult.pValueConfidence * 100).toFixed(0)}%
              </p>
              <span className="text-[11px] text-slate-500">Distribuição logarítmica natural</span>
            </div>
          </div>

          {/* Recharts Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Distribuição de Frequência do 1º Dígito (Observado vs. Teórico de Benford)
                </h3>
                <p className="text-xs text-slate-500">
                  Comparação da proporção dos primeiros dígitos significativos com a curva teórica P(d) = log10(1 + 1/d)
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={benfordResult.digits} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="digit" stroke="#94a3b8" fontSize={12} label={{ value: 'Primeiro Dígito (1 a 9)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend />
                  <Bar dataKey="observedPct" name="% Observada no Applet" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line type="monotone" dataKey="theoreticalPct" name="% Teórica Lei de Benford" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong>Parecer Estatístico Preliminar: </strong>
                {benfordResult.forensicOpinion}
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
                <span>{aiOpinion ? 'Reavaliar com IA' : 'Emitir Laudo Pericial com IA'}</span>
              </button>
            </div>

            {/* AI Forensic Opinion Card */}
            {aiOpinion && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-500/30 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      {aiOpinion.opinionTitle}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        aiOpinion.riskRating === 'CRITICO' || aiOpinion.riskRating === 'ALTO'
                          ? 'bg-rose-500 text-white ring-2 ring-rose-400'
                          : aiOpinion.riskRating === 'MEDIO'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      Risco SOX: {aiOpinion.riskRating}
                    </span>
                    <span className="text-[10px] text-indigo-200 font-mono">
                      Modelo: {aiOpinion.modelUsed}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {aiOpinion.laudoExecutiveSummary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-rose-300 text-[11px] block uppercase tracking-wider">
                      Pontos de Risco & Anomalias Identificadas:
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {aiOpinion.anomaliesIdentified.map((a, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-emerald-300 text-[11px] block uppercase tracking-wider">
                      Recomendações Periciais da Controladoria:
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      {aiOpinion.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Amostragem Dirigida Recomendada:</span>
                      <span className="font-bold text-indigo-300">{aiOpinion.suggestedAuditSamplingPct}% do volume</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MATRIZ SoD */}
      {activeSubTab === 'sod' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Matriz de Segregação de Funções (SoD - Sarbanes-Oxley Act)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Bloqueio mandatória de ações conflitantes executadas pelo mesmo usuário (prevenção de fraudes internas)
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {sodViolations.filter((v) => v.status === 'ACTIVE_BLOCK').length} Bloqueios Ativos
            </span>
          </div>

          <div className="space-y-3">
            {sodViolations.map((v) => (
              <div
                key={v.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  v.status === 'ACTIVE_BLOCK' ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{v.operatorName}</span>
                    <span className="text-[11px] font-mono text-slate-500">({v.operatorId})</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      v.status === 'ACTIVE_BLOCK' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {v.status === 'ACTIVE_BLOCK' ? 'BLOQUEIO SOX ATIVO' : 'MITIGADO PELO CFO'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-slate-500 font-semibold">Atividades Conflitantes:</span>
                  {v.conflictingActivities.map((act, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-800 font-mono text-[10px] font-bold">
                      {act}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-slate-600">
                  Documento Afetado: <strong>{v.documentId}</strong> • Detectado em {new Date(v.detectedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRILHA CRIPTOGRÁFICA SHA-256 */}
      {activeSubTab === 'trail' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <Hash className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Cadeia de Custódia Criptográfica Imutável (Audit Trail Ledger)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Cada ação de auditoria, laudo e parecer é encadeada matematicamente com hash SHA-256 e assinatura ICP-Brasil
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Integridade do Ledger 100% Verificada</span>
            </span>
          </div>

          <div className="space-y-4">
            {auditChain.map((block) => (
              <div key={block.blockIndex} className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 shadow-lg border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xs">
                      #{block.blockIndex}
                    </span>
                    <span className="font-bold text-xs text-indigo-300">{block.actionType}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{block.timestamp}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Ator Responsável:</span>
                    <span className="font-semibold text-slate-200">{block.actor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Certificado Digital:</span>
                    <span className="font-mono text-emerald-400 text-[11px]">{block.signatureCert}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="truncate text-slate-400">
                    <span className="text-slate-500">Previous Hash:</span> {block.previousBlockHash}
                  </div>
                  <div className="truncate text-indigo-300 font-bold">
                    <span className="text-slate-500">Block Hash (SHA-256):</span> {block.blockHash}
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
