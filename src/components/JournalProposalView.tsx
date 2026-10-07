import React, { useState } from 'react';
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  FileCheck2,
  Sliders,
  DollarSign,
  Building,
  Calendar,
  Lock,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  Download,
} from 'lucide-react';
import {
  JournalEntryProposal,
  ProcessedDocument,
  TransactionClassificationResult,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';
import { exportJournalProposalPdf } from '../utils/pdfExport.js';

interface JournalProposalViewProps {
  documents: ProcessedDocument[];
  prefilledDoc?: ProcessedDocument | null;
  prefilledClassification?: TransactionClassificationResult | null;
}

export const JournalProposalView: React.FC<JournalProposalViewProps> = ({
  documents,
  prefilledDoc,
  prefilledClassification,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(prefilledDoc?.id || '');
  const [vendorName, setVendorName] = useState(
    prefilledDoc?.geminiExtraction.vendor_name || 'AWS Serviços de Nuvem Ltda'
  );
  const [description, setDescription] = useState(
    prefilledClassification?.evidence || 'Computação em nuvem e instâncias elásticas EC2/S3'
  );
  const [totalAmount, setTotalAmount] = useState(
    prefilledDoc?.geminiExtraction.total?.toString() || '6600.00'
  );
  const [subtotal, setSubtotal] = useState(
    prefilledDoc?.geminiExtraction.subtotal?.toString() || '6000.00'
  );
  const [taxAmount, setTaxAmount] = useState(
    prefilledDoc?.geminiExtraction.tax_amount?.toString() || '600.00'
  );
  const [periodId, setPeriodId] = useState<'2026-10' | '2026-09' | '2026-08'>('2026-10');
  const [entityName, setEntityName] = useState('Empresa Soluções Digitais S.A. (Matriz - SP)');
  const [accountCode, setAccountCode] = useState(
    prefilledClassification?.selected_account?.code || '3.1.01.001'
  );
  const [policyId, setPolicyId] = useState(prefilledClassification?.policy_id || 'POL-IT-01');

  // Test simulation toggles to test the 7 automatic rejection criteria
  const [testUnbalanced, setTestUnbalanced] = useState(false);
  const [testClosedPeriod, setTestClosedPeriod] = useState(false);
  const [testInactiveAccount, setTestInactiveAccount] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<JournalEntryProposal | null>(null);
  const [proposalsHistory, setProposalsHistory] = useState<JournalEntryProposal[]>([]);
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleGenerateProposal = async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ success: boolean; proposal?: JournalEntryProposal; error?: string }>(
        '/api/propose-journal-entry',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_document_id: selectedDocId || undefined,
            vendor_name: vendorName,
            description,
            total_amount: parseFloat(totalAmount) || 0,
            subtotal: parseFloat(subtotal) || 0,
            tax_amount: parseFloat(taxAmount) || 0,
            period_id: testClosedPeriod ? '2026-08' : periodId,
            entity_name: entityName,
            account_code_hint: testInactiveAccount ? '3.1.99.999' : accountCode,
            policy_id: policyId,
            force_unbalanced_test: testUnbalanced,
            force_closed_period_test: testClosedPeriod,
            force_inactive_account_test: testInactiveAccount,
          }),
        }
      );

      if (res.success && res.data?.proposal) {
        setCurrentProposal(res.data.proposal);
        setProposalsHistory((prev) => [res.data!.proposal!, ...prev]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (status: 'APPROVED_FOR_POSTING' | 'REJECTED') => {
    if (!currentProposal) return;
    try {
      const res = await safeFetchJson<{ success: boolean; proposal?: JournalEntryProposal; error?: string }>(
        `/api/journal-proposals/${currentProposal.proposal_id}/decision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            auditor: 'Controller Geral / Auditor Responsável',
            notes: decisionNotes || (status === 'APPROVED_FOR_POSTING' ? 'Aprovado para contabilização no ERP.' : 'Rejeitado.'),
          }),
        }
      );

      if (res.success && res.data?.proposal) {
        setCurrentProposal(res.data.proposal);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Disclaimer Banner */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-xs">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            PROPOSTA DE LANÇAMENTO CONTÁBIL (Diretriz Mandatória)
          </h3>
          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
            Este módulo gera exclusivamente uma <strong>PROPOSTA</strong> de lançamento contábil.
            <strong> O lançamento NÃO foi postado e não deve ser tratado como postado</strong>.
            O backend recalcula e valida o equilíbrio rigoroso de partidas dobradas e aplica as 7 regras de rejeição automática.
          </p>
        </div>
      </div>

      {/* Generator Configuration Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Módulo 3: Parâmetros da Proposta de Lançamento
              </h3>
              <p className="text-xs text-slate-500">
                Modelo gerador: <strong className="font-mono text-indigo-700">gemini-3.8-flash</strong> • Validador oficial de equilíbrio no backend.
              </p>
            </div>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Descrição do Objeto / Justificativa:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fornecedor / Emitente:
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Valor Total (R$):
            </label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Subtotal Líquido (R$):
            </label>
            <input
              type="number"
              step="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Impostos Retidos (R$):
            </label>
            <input
              type="number"
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Período Contábil:
            </label>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value as any)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="2026-10">2026-10 (Outubro/2026 - ABERTO)</option>
              <option value="2026-09">2026-09 (Setembro/2026 - ABERTO)</option>
              <option value="2026-08">2026-08 (Agosto/2026 - FECHADO)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Entidade Corporativa:
            </label>
            <select
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="Empresa Soluções Digitais S.A. (Matriz - SP)">Matriz - SP (Permitida)</option>
              <option value="Soluções Digitais Filial RJ Ltda">Filial - RJ (Permitida)</option>
              <option value="Entidade Externa Não Autorizada">Entidade Não Autorizada (Testar Rejeição)</option>
            </select>
          </div>
        </div>

        {/* Simulation of Failure Modes (Para testar rejeição automática do sistema) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
            Simulador de Teste das Regras de Rejeição Automática:
          </span>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={testUnbalanced}
                onChange={(e) => setTestUnbalanced(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className={testUnbalanced ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                Simular Desequilíbrio (Débitos ≠ Créditos)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={testClosedPeriod}
                onChange={(e) => setTestClosedPeriod(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className={testClosedPeriod ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                Simular Período Fechado (Agosto/2026)
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={testInactiveAccount}
                onChange={(e) => setTestInactiveAccount(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className={testInactiveAccount ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                Simular Conta Inativa (3.1.99.999)
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>O backend executa recálculo aritmético e validação das 7 regras após resposta da IA.</span>
          </div>

          <button
            onClick={handleGenerateProposal}
            disabled={isLoading || !description.trim()}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando & Validando Proposta...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Gerar Proposta com Gemini 3.8 Flash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Proposal & Official Validation Result */}
      {currentProposal && (
        <div className="space-y-6">
          {/* Official Backend Decision Card */}
          <div
            className={`rounded-2xl p-5 border shadow-xs transition-all ${
              currentProposal.validation.status === 'AUTOMATICALLY_REJECTED'
                ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-400/30'
                : currentProposal.human_decision?.status === 'APPROVED_FOR_POSTING'
                ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/30'
                : currentProposal.validation.status === 'PENDING_HUMAN_REVIEW'
                ? 'bg-amber-50/90 border-amber-300'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    currentProposal.validation.status === 'AUTOMATICALLY_REJECTED'
                      ? 'bg-rose-600 text-white'
                      : currentProposal.human_decision?.status === 'APPROVED_FOR_POSTING'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {currentProposal.validation.status === 'AUTOMATICALLY_REJECTED' ? (
                    <XCircle className="w-6 h-6" />
                  ) : currentProposal.human_decision?.status === 'APPROVED_FOR_POSTING' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {currentProposal.proposal_id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        currentProposal.validation.status === 'AUTOMATICALLY_REJECTED'
                          ? 'bg-rose-200 text-rose-900'
                          : currentProposal.human_decision?.status === 'APPROVED_FOR_POSTING'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {currentProposal.validation.status === 'AUTOMATICALLY_REJECTED'
                        ? 'REJEITADO AUTOMATICAMENTE PELO BACKEND'
                        : currentProposal.human_decision?.status === 'APPROVED_FOR_POSTING'
                        ? 'APROVADO PARA POSTAGEM (CONTROLLER)'
                        : 'REQUER REVISÃO HUMANA (NEEDS_REVIEW)'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {currentProposal.validation.details}
                  </h3>

                  {/* Rejection reasons if rejected */}
                  {currentProposal.validation.isAutoRejected && (
                    <div className="mt-3 space-y-1.5">
                      <span className="text-xs font-bold text-rose-900 block">
                        Motivos da Rejeição Automática do Backend:
                      </span>
                      {currentProposal.validation.rejectionReasons.map((r, ri) => (
                        <div key={ri} className="text-xs text-rose-800 bg-rose-100/70 p-2 rounded-lg font-medium">
                          ❌ {r}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review triggers */}
                  {!currentProposal.validation.isAutoRejected &&
                    currentProposal.validation.reviewTriggers.length > 0 && (
                      <div className="mt-2 text-xs text-amber-800 flex items-center space-x-2">
                        <Info className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Gatilhos de revisão: {currentProposal.validation.reviewTriggers.join(' • ')}</span>
                      </div>
                    )}
                </div>
              </div>

              {/* Action buttons for human controller */}
              <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => exportJournalProposalPdf(currentProposal)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Exportar Minuta Oficial de Lançamento em PDF"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Minuta PDF</span>
                </button>

                {!currentProposal.validation.isAutoRejected && (
                  <>
                    <button
                      onClick={() => handleDecision('APPROVED_FOR_POSTING')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Aprovar para Postagem
                    </button>
                    <button
                      onClick={() => handleDecision('REJECTED')}
                      className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Double-Entry Balance Calculation Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-sans uppercase block mb-1">
                  Total de Débitos (Recalculado)
                </span>
                <span className="text-lg font-bold text-slate-900">
                  R$ {currentProposal.validation.totalDebits.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-sans uppercase block mb-1">
                  Total de Créditos (Recalculado)
                </span>
                <span className="text-lg font-bold text-slate-900">
                  R$ {currentProposal.validation.totalCredits.toFixed(2)}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  currentProposal.validation.isBalanced
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                <span className="text-[11px] font-sans uppercase block mb-1">
                  Diferença / Equilíbrio
                </span>
                <span className="text-lg font-bold">
                  {currentProposal.validation.isBalanced
                    ? 'R$ 0,00 (Equilibrado ✓)'
                    : `R$ ${currentProposal.validation.balanceDifference.toFixed(2)} (DESEQUILÍBRIO ✗)`}
                </span>
              </div>
            </div>
          </div>

          {/* Journal Entry Lines Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Partidas Dobradas Propostas (proposed_lines)
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {currentProposal.proposed_lines.length} partidas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-semibold w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold">Conta</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Débito Candidato</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Crédito Candidato</th>
                    <th className="py-2.5 px-3 font-semibold">Entidade / Dimensão</th>
                    <th className="py-2.5 px-3 font-semibold">Período</th>
                    <th className="py-2.5 px-3 font-semibold">Política</th>
                    <th className="py-2.5 px-3 font-semibold">Justificativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentProposal.proposed_lines.map((line) => (
                    <tr key={line.line_number} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-slate-400">{line.line_number}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{line.conta}</div>
                        <div className="text-[11px] font-sans text-slate-500 truncate max-w-xs">
                          {line.account_name}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {line.debito_candidato > 0 ? `R$ ${line.debito_candidato.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {line.credito_candidato > 0 ? `R$ ${line.credito_candidato.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-700">
                        <div className="truncate max-w-[140px] font-semibold">{line.entidade}</div>
                        <div className="text-[11px] text-slate-400">{line.dimensao}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{line.periodo}</td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-semibold text-[11px]">
                          {line.policy_id}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600 max-w-xs leading-snug">
                        {line.justificativa}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
