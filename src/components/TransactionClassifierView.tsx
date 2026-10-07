import React, { useState } from 'react';
import {
  Tag,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  DollarSign,
  Play,
  RefreshCw,
  Sliders,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  TransactionClassificationResult,
  ChartOfAccountItem,
  AccountingPolicy,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface TransactionClassifierViewProps {
  documents: ProcessedDocument[];
  onProposeJournalForTransaction?: (classification: TransactionClassificationResult, doc?: ProcessedDocument) => void;
}

export const TransactionClassifierView: React.FC<TransactionClassifierViewProps> = ({
  documents,
  onProposeJournalForTransaction,
}) => {
  const [description, setDescription] = useState('Consumo de Instâncias EC2 Linux, Buckets S3 e Banco RDS Multi-AZ');
  const [vendorName, setVendorName] = useState('AWS Serviços de Nuvem Ltda');
  const [amount, setAmount] = useState('6600.00');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [preferredModel, setPreferredModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.8-flash'>('gemini-3.1-flash-lite');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionClassificationResult | null>(null);
  const [history, setHistory] = useState<TransactionClassificationResult[]>([]);

  // Pre-load from document if user selects one
  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setVendorName(doc.geminiExtraction.vendor_name || '');
      setAmount(doc.geminiExtraction.total !== null ? doc.geminiExtraction.total.toString() : '');
      const itemsText = doc.geminiExtraction.line_items.map((i) => i.description).join(', ');
      setDescription(itemsText || doc.filename);
    }
  };

  const handleClassify = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        classification?: TransactionClassificationResult;
        error?: string;
      }>('/api/classify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          vendor_name: vendorName,
          amount: parseFloat(amount) || 0,
          preferred_model: preferredModel,
          document_source_id: selectedDocId || undefined,
        }),
      });

      if (res.success && res.data?.classification) {
        setResult(res.data.classification);
        setHistory((prev) => [res.data!.classification!, ...prev]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner with the 7 rules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Módulo 2: Classificação de Transações
              </h2>
              <p className="text-xs text-slate-500">
                Classificação restrita ao plano de contas corporativo com motor híbrido Gemini.
              </p>
            </div>
          </div>

          {/* Model selector (Flash Lite vs Flash) */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              onClick={() => setPreferredModel('gemini-3.1-flash-lite')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preferredModel === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>gemini-3.1-flash-lite (Alto Volume)</span>
            </button>
            <button
              onClick={() => setPreferredModel('gemini-3.8-flash')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preferredModel === 'gemini-3.8-flash'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>gemini-3.8-flash (Casos Ambíguos)</span>
            </button>
          </div>
        </div>

        {/* The 7 Rules Compliance Pill List */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Regras de Classificação Vigentes (Invioláveis):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">1.</span> Nunca criar conta nova.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">2.</span> Nunca escolher só pelo fornecedor.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">3.</span> Histórico apenas evidência secundária.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">4.</span> Retornar todas as contas plausíveis.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">5.</span> Falta de evidência = needs_review.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-800">6.</span> Tratamento fiscal só com política.
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 col-span-1 md:col-span-2">
              <span className="font-bold text-slate-800">7.</span> Não inventar centro de custo, projeto, entidade ou dimensão.
            </div>
          </div>
        </div>
      </div>

      {/* Input Form & Parameters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Dados da Transação a Classificar</span>
        </h3>

        {/* Quick select from processed invoices */}
        {documents.length > 0 && (
          <div className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="text-xs font-semibold text-indigo-900 block mb-1.5">
              Importar dados de documento já auditado na Etapa 1:
            </label>
            <div className="flex flex-wrap gap-2">
              {documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDoc(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    selectedDocId === d.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.filename} ({d.geminiExtraction.currency || '$'}{' '}
                  {d.geminiExtraction.total !== null ? d.geminiExtraction.total.toFixed(2) : '0'})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Descrição Detalhada do Objeto / Serviço:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Licença anual software de gestão contábil SaaS..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fornecedor / Razão Social:
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Ex: AWS Serviços de Nuvem Ltda"
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Valor da Transação (R$):
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Modelo ativo:{' '}
              <strong className="text-slate-800 font-mono">{preferredModel}</strong> (escalonamento automático se ambíguo)
            </span>
          </div>

          <button
            onClick={handleClassify}
            disabled={isLoading || !description.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Classificando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Classificar Transação</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Classification Result Card */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-500">{result.transaction_id}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  Modelo: {result.model_used}
                </span>
                {result.needs_review ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                    needs_review = true
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    Classificação Direta
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Resultado da Classificação Contábil
              </h3>
            </div>

            {onProposeJournalForTransaction && (
              <button
                onClick={() => {
                  const doc = documents.find((d) => d.id === selectedDocId);
                  onProposeJournalForTransaction(result, doc);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-2 shadow-xs cursor-pointer"
              >
                <span>Avançar para Proposta de Lançamento (Módulo 3)</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            )}
          </div>

          {/* Primary Selected Account */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">
              Conta Selecionada (selected_account):
            </span>
            {result.selected_account ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    <code className="text-indigo-700 font-mono mr-2">{result.selected_account.code}</code>
                    {result.selected_account.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Tipo:{' '}
                    <span className="font-semibold text-slate-800">{result.selected_account.type}</span>
                    {result.policy_id && (
                      <span className="ml-3">
                        Política Vinculada:{' '}
                        <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-mono font-semibold">
                          {result.policy_id}
                        </code>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Confiança</span>
                    <span className="text-sm font-mono font-bold text-slate-900">
                      {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-800 italic">
                Nenhuma conta única pôde ser selecionada com certeza estrita. Verifique as candidatas abaixo.
              </div>
            )}
          </div>

          {/* Rationale & Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Justificativa Contábil (rationale):
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{result.rationale}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Evidência Textual Extraída (evidence):
              </span>
              <p className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                "{result.evidence}"
              </p>
            </div>
          </div>

          {/* Account Candidates List (Regra 4: se houver mais de uma, retorna todas) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Contas Candidatas Avaliadas ({result.account_candidates.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Regra 4: Múltiplas candidatas preservadas para auditoria
              </span>
            </div>

            <div className="space-y-2">
              {result.account_candidates.map((cand, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-2.5">
                    <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {cand.account_code}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{cand.account_name}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{cand.plausibility_rationale}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase block">Score</span>
                    <span className="font-mono font-bold text-slate-800">
                      {(cand.score * 100).toFixed(0)}%
                    </span>
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
