import React, { useState } from 'react';
import {
  FileText,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Play,
  RefreshCw,
  Layers,
  Building,
  Calendar,
  DollarSign,
  Quote,
  Sliders,
  Check,
} from 'lucide-react';
import {
  RevenueRecognitionResult,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import {
  SAMPLE_REVENUE_CONTRACTS,
  REVENUE_POLICIES,
  SampleRevenueContract,
} from '../../server/revenueEngine.js';

export const RevenueRecognitionView: React.FC = () => {
  const [selectedContract, setSelectedContract] = useState<SampleRevenueContract>(SAMPLE_REVENUE_CONTRACTS[0]);
  const [customContractText, setCustomContractText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  const [preferredModel, setPreferredModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-pro-preview'>('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RevenueRecognitionResult | null>(null);

  const handleSelectContract = (contract: SampleRevenueContract) => {
    setSelectedContract(contract);
    setUseCustomText(false);
    setPreferredModel(contract.recommendedModel);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        analysis?: RevenueRecognitionResult;
        error?: string;
      }>('/api/analyze-revenue-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: useCustomText ? undefined : selectedContract.id,
          contract_text: useCustomText ? customContractText : selectedContract.contractText,
          is_complex: selectedContract.isComplex || useCustomText,
          preferred_model: preferredModel,
        }),
      });

      if (res.success && res.data?.analysis) {
        setAnalysisResult(res.data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Disclaimer Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-xs">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            ANÁLISE DE FATOS CONTRATUAIS DE RECEITA (IFRS 15 / ASC 606)
          </h3>
          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
            A IA atua exclusivamente na extração de fatos e comparação com políticas contábeis.
            <strong> A IA não é o aprovador técnico e não calcula o cronograma oficial de reconhecimento</strong>.
            A revisão humana é formalmente mandatória quando houver preço variável, múltiplas PPOs ou cláusulas atípicas.
          </p>
        </div>
      </div>

      {/* Contract Ingestion Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Módulo 4: Análise Contratual de Receita
              </h3>
              <p className="text-xs text-slate-500">
                gemini-3.8-flash (contratos simples) • gemini-3.1-pro-preview (contratos complexos)
              </p>
            </div>
          </div>

          {/* Model selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto text-xs">
            <button
              onClick={() => setPreferredModel('gemini-3.8-flash')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                preferredModel === 'gemini-3.8-flash'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>gemini-3.8-flash (Simples)</span>
            </button>
            <button
              onClick={() => setPreferredModel('gemini-3.1-pro-preview')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                preferredModel === 'gemini-3.1-pro-preview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>gemini-3.1-pro-preview (Complexo)</span>
            </button>
          </div>
        </div>

        {/* Contract Selector Cards */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Selecione o Contrato para Análise:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_REVENUE_CONTRACTS.map((c) => {
              const isSelected = !useCustomText && selectedContract.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectContract(c)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.isComplex
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.isComplex ? 'CONTRATO COMPLEXO' : 'CONTRATO LINEAR'}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{c.summary}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Text preview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">
              Texto Contratual: {selectedContract.title}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedContract.contractText.split('\n').length} linhas
            </span>
          </div>
          <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
            {selectedContract.contractText}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Modelo selecionado: <strong className="font-mono text-slate-800">{preferredModel}</strong>
            </span>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analisando Fatos Contratuais...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Analisar Contrato com Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Human Review Triggers Banner */}
          <div
            className={`p-5 rounded-2xl border shadow-xs ${
              analysisResult.human_review_mandatory
                ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/30'
                : 'bg-emerald-50/90 border-emerald-300'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  analysisResult.human_review_mandatory ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {analysisResult.human_review_mandatory ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {analysisResult.contract_id}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      analysisResult.human_review_mandatory
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {analysisResult.human_review_mandatory
                      ? 'REVISÃO HUMANA OBRIGATÓRIA'
                      : 'CONTRATO LINEAR PADRÃO'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {analysisResult.human_review_mandatory
                    ? `${analysisResult.human_review_triggers.length} Gatilho(s) Mandatário(s) de Revisão Acionados`
                    : 'Contrato de Baixa Complexidade Sem Gatilhos Críticos de Revisão'}
                </h3>

                {analysisResult.human_review_triggers.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    {analysisResult.human_review_triggers.map((trig, idx) => (
                      <div key={idx} className="text-xs text-amber-900 bg-amber-100/60 p-1.5 rounded flex items-center space-x-1.5 font-medium">
                        <span>⚠️</span>
                        <span>{trig}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Obligations (PPOs) Identified */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Obrigações de Performance Candidatas (PPOs)
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {analysisResult.facts.obrigações_de_performance_candidatas?.length || 0} PPO(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.facts.obrigações_de_performance_candidatas?.map((ppo) => (
                <div key={ppo.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {ppo.id}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {ppo.satisfactionTiming.toUpperCase()}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">{ppo.description}</h5>
                  <p className="text-slate-600 mt-1 leading-relaxed">{ppo.rationale}</p>
                  {ppo.allocatedPriceEstimate && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 font-mono font-bold text-indigo-700">
                      Preço Estimado Alocado: R$ {ppo.allocatedPriceEstimate.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Facts Extracted */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 mb-4">
              Fatos Financeiros e Cláusulas Extraídas
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Preço Fixo</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {analysisResult.facts.moeda} {analysisResult.facts.preco_fixo?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Preço Variável</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {analysisResult.facts.preco_variavel?.tem_preco_variavel ? 'SIM (Relevante)' : 'Não aplicável'}
                </span>
                <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                  {analysisResult.facts.preco_variavel?.descricao}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Prazo Contratual</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {analysisResult.facts.prazo_meses ? `${analysisResult.facts.prazo_meses} meses` : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Partes Relacionadas?</span>
                <span
                  className={`font-bold text-sm mt-0.5 block ${
                    analysisResult.facts.partes?.is_related_party ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {analysisResult.facts.partes?.is_related_party ? 'SIM (Related Party)' : 'NÃO (Terceiros)'}
                </span>
              </div>
            </div>
          </div>

          {/* Textual Evidences */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 mb-3 flex items-center space-x-2">
              <Quote className="w-4 h-4 text-indigo-600" />
              <span>Evidências Textuais Extraídas do Instrumento</span>
            </h4>
            <div className="space-y-2">
              {analysisResult.facts.evidencias_textuais?.map((ev, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">{ev.topico}:</span>{' '}
                  <span className="text-slate-600 italic">"{ev.citacao}"</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
