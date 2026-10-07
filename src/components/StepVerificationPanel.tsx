import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calculator,
  Scale,
  Calendar,
  Copy,
  Building2,
  Send,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserCheck,
  FileSearch,
  Percent,
  Download,
} from 'lucide-react';
import {
  BackendValidationResult,
  GeminiExtractionResult,
  ExtractionIntegrityCheck,
} from '../types/finance.js';

interface StepVerificationPanelProps {
  validation: BackendValidationResult;
  extraction: GeminiExtractionResult;
  onOpenReviewModal: () => void;
  humanReviewDecision?: any;
  extractionIntegrity?: ExtractionIntegrityCheck | null;
  onExportPdf?: () => void;
}

export const StepVerificationPanel: React.FC<StepVerificationPanelProps> = ({
  validation,
  extraction,
  onOpenReviewModal,
  humanReviewDecision,
  extractionIntegrity,
  onExportPdf,
}) => {
  const {
    step1_lineItemsCalculation: step1,
    step2_subtotalTaxTotalComparison: step2,
    step3_currencyAndDatesValidation: step3,
    step4_duplicateCheck: step4,
    step5_vendorVerification: step5,
    step6_reviewRouting: step6,
  } = validation;

  const curr = extraction.currency || 'BRL';
  const hasIntegrityDiscrepancy = extractionIntegrity?.hasDiscrepancy ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Overall Routing Decision */}
      <div
        className={`rounded-2xl p-5 border shadow-xs transition-all ${
          humanReviewDecision?.status === 'APPROVED'
            ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
            : humanReviewDecision?.status === 'REJECTED'
            ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400/30'
            : step6.overallStatus === 'APPROVED_AUTOMATIC'
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-amber-50/70 border-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                humanReviewDecision?.status === 'APPROVED' || step6.overallStatus === 'APPROVED_AUTOMATIC'
                  ? 'bg-emerald-600 text-white'
                  : humanReviewDecision?.status === 'REJECTED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {humanReviewDecision?.status === 'APPROVED' || step6.overallStatus === 'APPROVED_AUTOMATIC' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : humanReviewDecision?.status === 'REJECTED' ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Decisão do Motor de Auditoria
                </span>
                {humanReviewDecision ? (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      humanReviewDecision.status === 'APPROVED'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    REVISÃO MANUAL: {humanReviewDecision.status}
                  </span>
                ) : (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      step6.overallStatus === 'APPROVED_AUTOMATIC'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {step6.overallStatus === 'APPROVED_AUTOMATIC' ? 'APROVAÇÃO AUTOMÁTICA' : 'REVISÃO OBRIGATÓRIA'}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {humanReviewDecision
                  ? `Documento auditado por ${humanReviewDecision.reviewerName}`
                  : step6.overallStatus === 'APPROVED_AUTOMATIC'
                  ? 'Documento 100% Consistente e Conciliado'
                  : `${step6.criticalIssuesCount + step6.warningIssuesCount} Inconsistência(s) Requerem Atenção`}
              </h3>

              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                {humanReviewDecision
                  ? `Notas da revisão: "${humanReviewDecision.notes || 'Sem observações adicionais'}"`
                  : step6.overallStatus === 'APPROVED_AUTOMATIC'
                  ? 'Todos os 6 passos de auditoria backend foram superados sem divergências. Cálculos aritméticos, fornecedor e datas válidos.'
                  : 'O documento foi roteado para a esteira de revisão humana devido a divergências matemáticas, cadastrais ou de duplicidade.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Exportar Laudo Pericial de Auditoria Fiscal em PDF"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Laudo PDF</span>
              </button>
            )}
            <button
              onClick={onOpenReviewModal}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>{humanReviewDecision ? 'Alterar Decisão' : 'Abrir Esteira de Revisão'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED EXTRACTION INTEGRITY VALIDATOR (Soma dos Itens vs Total Declarado) */}
      {extractionIntegrity && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            hasIntegrityDiscrepancy
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasIntegrityDiscrepancy
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {hasIntegrityDiscrepancy ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Validador de Integridade de Extração
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                      hasIntegrityDiscrepancy
                        ? 'bg-rose-200 text-rose-900 border border-rose-300'
                        : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {hasIntegrityDiscrepancy
                      ? 'DISCREPÂNCIA MATEMÁTICA DETECTADA'
                      : 'INTEGRIDADE MATEMÁTICA 100% VERIFICADA'}
                  </span>
                  {hasIntegrityDiscrepancy && extractionIntegrity.difference !== null && (
                    <span className="text-[11px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                      Delta: {curr} {extractionIntegrity.difference.toFixed(2)}
                      {extractionIntegrity.percentageDiff !== null
                        ? ` (${extractionIntegrity.percentageDiff}%)`
                        : ''}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {hasIntegrityDiscrepancy
                    ? `Divergência de ${curr} ${extractionIntegrity.difference?.toFixed(2)} entre soma dos itens e total declarado`
                    : `Soma dos ${extractionIntegrity.itemCount} itens confere perfeitamente com o total declarado (${curr} ${extractionIntegrity.declaredTotal?.toFixed(2)})`}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  {extractionIntegrity.details}
                </p>
              </div>
            </div>

            {/* Quick Comparison Pills */}
            <div className="flex items-center space-x-2 shrink-0 self-start md:self-center font-mono text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-right shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Soma dos Itens</span>
                <strong className="text-slate-900">
                  {curr} {extractionIntegrity.calculatedLineItemsSum.toFixed(2)}
                </strong>
              </div>
              <div className="text-slate-400 font-bold">vs</div>
              <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-right shadow-2xs">
                <span className="text-[10px] text-slate-500 block">Total Declarado</span>
                <strong
                  className={
                    hasIntegrityDiscrepancy ? 'text-rose-700 font-black' : 'text-emerald-700 font-bold'
                  }
                >
                  {extractionIntegrity.declaredTotal !== null
                    ? `${curr} ${extractionIntegrity.declaredTotal.toFixed(2)}`
                    : 'N/A'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The 6 Backend Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* STEP 1: Recalcular a soma das linhas */}
        <div
          className={`rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between ${
            hasIntegrityDiscrepancy
              ? 'bg-rose-50/20 border-2 border-rose-300 ring-2 ring-rose-500/10'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 1
              </span>
              {step1.isConsistent && !hasIntegrityDiscrepancy ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Confere
                </span>
              ) : hasIntegrityDiscrepancy ? (
                <span className="inline-flex items-center text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Discrepante
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Divergente
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">1. Recálculo das Linhas</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step1.details}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Soma das linhas ({step1.itemCount} itens):</span>
                <span className="font-bold text-slate-900">
                  {extraction.currency || '$'} {step1.calculatedLineItemsSum.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal extraído:</span>
                <span className="font-bold text-slate-900">
                  {step1.extractedSubtotal !== null ? `${extraction.currency || '$'} ${step1.extractedSubtotal.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              {step1.differenceWithSubtotal !== null && step1.differenceWithSubtotal > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
                  <span>Delta (Subtotal):</span>
                  <span>{extraction.currency || '$'} {step1.differenceWithSubtotal.toFixed(2)}</span>
                </div>
              )}
              {hasIntegrityDiscrepancy && extractionIntegrity && extractionIntegrity.difference !== null && (
                <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-rose-200 bg-rose-50/60 p-1 rounded">
                  <span>Delta vs Total Declarado:</span>
                  <span>{curr} {extractionIntegrity.difference.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: Comparar subtotal, imposto e total */}
        <div
          className={`rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between ${
            hasIntegrityDiscrepancy
              ? 'bg-rose-50/20 border-2 border-rose-300 ring-2 ring-rose-500/10'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 2
              </span>
              {step2.isConsistent ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Equação OK
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Inconsistente
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">2. Subtotal, Imposto e Total</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step2.details}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal + Impostos:</span>
                <span className="font-bold text-slate-900">
                  {step2.calculatedSum !== null ? `${extraction.currency || '$'} ${step2.calculatedSum.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total impresso:</span>
                <span className="font-bold text-slate-900">
                  {step2.extractedTotal !== null ? `${extraction.currency || '$'} ${step2.extractedTotal.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              {step2.difference !== null && step2.difference > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold pt-1 border-t border-slate-200">
                  <span>Diferença fiscal:</span>
                  <span>{extraction.currency || '$'} {step2.difference.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 3: Validar moeda e datas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 3
              </span>
              {step3.isCurrencyValid && step3.isDatesValid ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Válidas
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Anomalia
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">3. Moeda e Datas</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step3.details}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Moeda ISO:</span>
                <span className="font-bold text-slate-900">{step3.normalizedCurrency || 'Não padrão'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Emissão:</span>
                <span className="font-bold text-slate-900">{step3.issueDate || 'Ausente'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vencimento:</span>
                <span
                  className={`font-bold ${
                    !step3.isChronologyValid ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {step3.dueDate || 'À vista / Ausente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 4: Procurar duplicidade */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 4
              </span>
              {!step4.isDuplicate ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Sem Duplicata
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" /> Duplicidade!
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Copy className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">4. Procura de Duplicidade</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step4.details}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Risco de Duplicidade:</span>
                <span
                  className={`font-bold ${
                    step4.duplicateRisk === 'high' ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {step4.duplicateRisk.toUpperCase()}
                </span>
              </div>
              {step4.matchedDocumentId && (
                <div className="flex justify-between text-slate-600">
                  <span>Registro Conflitante:</span>
                  <span className="font-bold text-slate-900">{step4.matchedDocumentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 5: Verificar o fornecedor */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 5
              </span>
              {step5.status === 'approved' ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Homologado
                </span>
              ) : step5.status === 'blocked' ? (
                <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Bloqueado
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Não Cadastrado
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">5. Verificação de Fornecedor</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step5.details}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Fornecedor:</span>
                <span className="font-bold text-slate-900 truncate max-w-[140px]">
                  {step5.vendorName || 'Não identificado'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax ID / CNPJ:</span>
                <span className="font-bold text-slate-900">{step5.vendorTaxId || 'Ausente'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 6: Enviar divergências para revisão */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 uppercase">
                Passo 6
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {step6.discrepancies.length} Divergência(s)
              </span>
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">6. Esteira de Revisão</h4>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {step6.requiresReview
                ? 'Divergências consolidadas e direcionadas para fila de auditoria fiscal.'
                : 'Nenhuma pendência. Documento liberado diretamente para contabilização.'}
            </p>

            <div className="bg-slate-50 rounded-lg p-2.5 text-xs font-mono space-y-1 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Críticas:</span>
                <span className="font-bold text-rose-600">{step6.criticalIssuesCount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Avisos / Alertas:</span>
                <span className="font-bold text-amber-600">{step6.warningIssuesCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancies detailed list if any exist */}
      {step6.discrepancies.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Quadro de Divergências Identificadas para Revisão
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {step6.discrepancies.length} item(ns) na fila
            </span>
          </div>

          <div className="space-y-3">
            {step6.discrepancies.map((disc, idx) => {
              const isCrit = disc.severity === 'critical';
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCrit
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="mt-0.5">
                      {isCrit ? (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          {disc.title}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                          Passo {disc.step}: {disc.stepName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {disc.description}
                      </p>
                      {disc.suggestedAction && (
                        <p className="text-[11px] font-medium text-indigo-700 mt-1">
                          💡 Ação Recomendada: {disc.suggestedAction}
                        </p>
                      )}
                    </div>
                  </div>

                  {disc.involvedFields && disc.involvedFields.length > 0 && (
                    <div className="flex flex-wrap gap-1 self-start sm:self-center shrink-0">
                      {disc.involvedFields.map((f, fi) => (
                        <span
                          key={fi}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
