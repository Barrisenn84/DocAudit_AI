import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Calendar,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { ProcessedDocument } from '../types/finance.js';
import { exportDocumentAuditPdf, exportBatchAuditSummaryPdf } from '../utils/pdfExport.js';

interface DocumentsHistoryTableProps {
  documents: ProcessedDocument[];
  onSelectDocument: (doc: ProcessedDocument) => void;
  selectedDocId?: string;
}

export const DocumentsHistoryTable: React.FC<DocumentsHistoryTableProps> = ({
  documents,
  onSelectDocument,
  selectedDocId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'APPROVED' | 'REVIEW' | 'REJECTED'>('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.geminiExtraction.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.geminiExtraction.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isReviewed = doc.humanReview !== undefined;
    const currentStatus = isReviewed
      ? doc.humanReview?.status
      : doc.validation.step6_reviewRouting.overallStatus;

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'APPROVED') {
      return matchesSearch && (currentStatus === 'APPROVED' || currentStatus === 'APPROVED_AUTOMATIC');
    }
    if (statusFilter === 'REVIEW') {
      return matchesSearch && currentStatus === 'PENDING_REVIEW' && !isReviewed;
    }
    if (statusFilter === 'REJECTED') {
      return matchesSearch && (currentStatus === 'REJECTED');
    }
    return matchesSearch;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(documents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `docaudit_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Histórico de Documentos Auditados</h3>
          <p className="text-xs text-slate-500">
            Base centralizada com rastreabilidade de decisões e checagem de duplicidade ativa.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportBatchAuditSummaryPdf(filteredDocs)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Exportar Livro Razão de Auditoria com todos os documentos em PDF"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Exportar Livro PDF ({filteredDocs.length})</span>
          </button>
          <button
            onClick={handleExportJson}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, fornecedor, fatura ou arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({documents.length})
          </button>
          <button
            onClick={() => setStatusFilter('REVIEW')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'REVIEW' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'APPROVED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'REJECTED' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejeitados
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="py-2.5 px-3 font-semibold">ID / Arquivo</th>
              <th className="py-2.5 px-3 font-semibold">Fornecedor</th>
              <th className="py-2.5 px-3 font-semibold">Nº Fatura</th>
              <th className="py-2.5 px-3 font-semibold">Emissão / Vencimento</th>
              <th className="py-2.5 px-3 font-semibold text-right">Total Faturado</th>
              <th className="py-2.5 px-3 font-semibold text-center">Status Auditoria</th>
              <th className="py-2.5 px-3 font-semibold text-center w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Nenhum documento encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedDocId === doc.id;
                const isReviewed = doc.humanReview !== undefined;
                const isApproved =
                  doc.humanReview?.status === 'APPROVED' ||
                  (!isReviewed && doc.validation.step6_reviewRouting.overallStatus === 'APPROVED_AUTOMATIC');
                const isRejected =
                  doc.humanReview?.status === 'REJECTED' ||
                  (!isReviewed && doc.validation.step6_reviewRouting.overallStatus === 'REJECTED');

                return (
                  <tr
                    key={doc.id}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                    }`}
                    onClick={() => onSelectDocument(doc)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{doc.id}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{doc.filename}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[160px]">
                        {doc.geminiExtraction.vendor_name || 'N/A'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {doc.geminiExtraction.vendor_tax_id || 'Sem Tax ID'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {doc.geminiExtraction.invoice_number || 'S/N'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{doc.geminiExtraction.issue_date || 'N/A'}</div>
                      <div className="text-[11px] text-slate-400">
                        Venc: {doc.geminiExtraction.due_date || 'À vista'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {doc.geminiExtraction.currency || '$'}{' '}
                      {doc.geminiExtraction.total !== null ? doc.geminiExtraction.total.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isApproved ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          {isReviewed ? 'Aprovado Manual' : 'Aprovado Auto'}
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                          Rejeitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                          Revisão ({doc.validation.step6_reviewRouting.discrepancies.length})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportDocumentAuditPdf(doc);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                          title="Exportar Laudo Fiscal em PDF"
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(doc);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                          title="Ver auditoria detalhada"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
