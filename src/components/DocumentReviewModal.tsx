import React, { useState } from 'react';
import { X, Check, ShieldAlert, AlertTriangle, FileCheck, ThumbsUp, ThumbsDown, Edit3, Download, FileText } from 'lucide-react';
import { ProcessedDocument } from '../types/finance.js';
import { exportDocumentAuditPdf } from '../utils/pdfExport.js';

interface DocumentReviewModalProps {
  document: ProcessedDocument;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (decision: {
    status: 'APPROVED' | 'REJECTED' | 'MODIFIED';
    reviewerName: string;
    notes: string;
    adjustedFields?: any;
  }) => Promise<void>;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  isOpen,
  onClose,
  onSubmitReview,
}) => {
  if (!isOpen) return null;

  const [decisionStatus, setDecisionStatus] = useState<'APPROVED' | 'REJECTED' | 'MODIFIED'>('APPROVED');
  const [reviewerName, setReviewerName] = useState('Auditor Fiscal Responsável');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const discrepancies = document.validation.step6_reviewRouting.discrepancies;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitReview({
        status: decisionStatus,
        reviewerName,
        notes,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Esteira de Revisão Fiscal e Contábil
              </h3>
              <p className="text-xs text-slate-500">
                Documento {document.id} • {document.filename}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Discrepancies Summary */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Divergências Submetidas à Revisão ({discrepancies.length})
            </span>
            {discrepancies.length === 0 ? (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Nenhuma divergência grave pendente. Documento elegível para aprovação regular.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {discrepancies.map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-start space-x-2"
                  >
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        d.severity === 'critical' ? 'text-rose-600' : 'text-amber-500'
                      }`}
                    />
                    <div>
                      <span className="font-bold text-slate-900">{d.title}</span>: {d.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Selecione o Parecer da Revisão:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecisionStatus('APPROVED')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  decisionStatus === 'APPROVED'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs mb-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Aprovar com Justificativa</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Libera o pagamento assumindo a conformidade e justificativa registrada em ata.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDecisionStatus('REJECTED')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  decisionStatus === 'REJECTED'
                    ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs mb-1">
                  <ThumbsDown className="w-4 h-4" />
                  <span>Rejeitar Documento</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Bloqueia processamento financeiro e solicita reemissão ou cancelamento.
                </p>
              </button>
            </div>
          </div>

          {/* Reviewer Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nome do Auditor / Aprovador:
            </label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Justification Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Justificativa / Parecer de Auditoria (Obrigatório para compliance):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Diferença de arredondamento aceita conforme contrato Nº 441/2026. Fornecedor autorizado pela diretoria."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => exportDocumentAuditPdf(document)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Baixar Laudo Técnico (PDF)</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !notes.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Parecer de Auditoria'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
