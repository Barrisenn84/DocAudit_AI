import React from 'react';
import {
  FileText,
  CheckCircle,
  HelpCircle,
  XCircle,
  MapPin,
  Quote,
  ShieldCheck,
  AlertTriangle,
  BadgeAlert,
} from 'lucide-react';
import { GeminiExtractionResult, FieldEvidence, DocumentException } from '../types/finance.js';

interface ExtractedFieldsEvidenceProps {
  extraction: GeminiExtractionResult;
}

export const ExtractedFieldsEvidence: React.FC<ExtractedFieldsEvidenceProps> = ({ extraction }) => {
  const getStatusBadge = (status: 'observed' | 'ambiguous' | 'missing') => {
    switch (status) {
      case 'observed':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
            observed
          </span>
        );
      case 'ambiguous':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <HelpCircle className="w-3 h-3 mr-1 text-amber-600" />
            ambiguous
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <XCircle className="w-3 h-3 mr-1 text-slate-400" />
            missing
          </span>
        );
    }
  };

  const getConfidenceBar = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    let barColor = 'bg-emerald-500';
    if (pct < 70) barColor = 'bg-rose-500';
    else if (pct < 85) barColor = 'bg-amber-500';

    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-mono font-semibold text-slate-700">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary Key Values Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Campos Principais Extraídos via JSON Schema
            </h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
            {extraction.document_type.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Fornecedor (vendor_name)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.vendor_name || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Tax ID / CNPJ (vendor_tax_id)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.vendor_tax_id || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Nº Fatura (invoice_number)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.invoice_number || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Moeda (currency)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.currency || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Emissão (issue_date)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.issue_date || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Vencimento (due_date)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.due_date || <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Subtotal (subtotal)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.subtotal !== null ? `${extraction.currency || '$'} ${extraction.subtotal.toFixed(2)}` : <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium block">Imposto (tax_amount)</span>
            <span className="font-bold text-sm text-slate-900 truncate block mt-0.5">
              {extraction.tax_amount !== null ? `${extraction.currency || '$'} ${extraction.tax_amount.toFixed(2)}` : <span className="text-slate-400 italic">null</span>}
            </span>
          </div>

          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 col-span-2 sm:col-span-3 lg:col-span-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-700 font-semibold block">Total Geral Faturado (total)</span>
              <span className="text-xl font-extrabold text-indigo-950 mt-0.5 block">
                {extraction.total !== null ? `${extraction.currency || '$'} ${extraction.total.toFixed(2)}` : <span className="text-slate-400 italic">null</span>}
              </span>
            </div>
            <div className="text-right text-xs text-indigo-700 font-medium">
              Extraído exatamente como impresso no documento, sem suposições.
            </div>
          </div>
        </div>
      </div>

      {/* Field Evidence & Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <Quote className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Rastreabilidade de Evidências Textuais (field_evidence)
              </h3>
              <p className="text-xs text-slate-500">
                Cada campo acompanhado de status (observed, ambiguous, missing), confiança e comprovação textual.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {extraction.field_evidence.length} campos auditados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold">Campo</th>
                <th className="py-2.5 px-3 font-semibold">Valor Extraído</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Confiança</th>
                <th className="py-2.5 px-3 font-semibold">Evidência Textual / Citação</th>
                <th className="py-2.5 px-3 font-semibold">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {extraction.field_evidence.map((fe, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {fe.field_name}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {fe.extracted_value !== null && fe.extracted_value !== undefined ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">
                        {fe.extracted_value}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">null</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {getStatusBadge(fe.status)}
                  </td>
                  <td className="py-2.5 px-3">
                    {getConfidenceBar(fe.confidence)}
                  </td>
                  <td className="py-2.5 px-3 max-w-xs text-slate-600 italic">
                    "{fe.text_evidence}"
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {fe.page_or_location ? (
                      <span className="inline-flex items-center text-[11px]">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                        {fe.page_or_location}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Exceptions Detected on Original Document */}
      {extraction.exceptions && extraction.exceptions.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-rose-200/60 mb-3">
            <BadgeAlert className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-rose-900 text-sm">
              Exceções Preservadas do Documento Original (exceptions)
            </h3>
          </div>
          <p className="text-xs text-rose-800 mb-3">
            Conforme a diretriz: <em>"Se houver conflito entre subtotal, imposto, linhas e total, preserve os valores encontrados, crie uma exceção e não resolva silenciosamente."</em>
          </p>
          <div className="space-y-2">
            {extraction.exceptions.map((exc, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-rose-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-rose-700">{exc.code}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    {exc.severity}
                  </span>
                </div>
                <p className="text-slate-700">{exc.message}</p>
                {exc.involved_fields && exc.involved_fields.length > 0 && (
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-slate-500">
                    <span>Campos envolvidos:</span>
                    {exc.involved_fields.map((f, fi) => (
                      <span key={fi} className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-700">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
