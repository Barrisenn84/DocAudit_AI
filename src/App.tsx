/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Header, AppTab } from './components/Header.js';
import { UploadSection } from './components/UploadSection.js';
import { StepVerificationPanel } from './components/StepVerificationPanel.js';
import { ExtractedFieldsEvidence } from './components/ExtractedFieldsEvidence.js';
import { LineItemsTable } from './components/LineItemsTable.js';
import { DocumentReviewModal } from './components/DocumentReviewModal.js';
import { DocumentsHistoryTable } from './components/DocumentsHistoryTable.js';
import { VendorDirectoryModal } from './components/VendorDirectoryModal.js';
import { JsonSchemaInspector } from './components/JsonSchemaInspector.js';
import { TransactionClassifierView } from './components/TransactionClassifierView.js';
import { JournalProposalView } from './components/JournalProposalView.js';
import { ChartOfAccountsView } from './components/ChartOfAccountsView.js';
import { RevenueRecognitionView } from './components/RevenueRecognitionView.js';
import { ReconciliationView } from './components/ReconciliationView.js';
import { ExceptionTriageView } from './components/ExceptionTriageView.js';
import { ClosingChecklistView } from './components/ClosingChecklistView.js';
import { CfoReportView } from './components/CfoReportView.js';
import { FunctionCallingConsoleView } from './components/FunctionCallingConsoleView.js';
import { PriceBenchmarkView } from './components/PriceBenchmarkView.js';
import { TaxAndSpedView } from './components/TaxAndSpedView.js';
import { TreasuryCashFlowView } from './components/TreasuryCashFlowView.js';
import { FpaBudgetView } from './components/FpaBudgetView.js';
import { ForensicsSoxView } from './components/ForensicsSoxView.js';
import { EsgCarbonView } from './components/EsgCarbonView.js';
import { ErpIntegrationsView } from './components/ErpIntegrationsView.js';
import { ToastNotifications } from './components/ToastNotifications.js';
import { NotificationCenterModal } from './components/NotificationCenterModal.js';
import { AiSettingsModal } from './components/AiSettingsModal.js';
import { IntegrationsHubModal } from './components/IntegrationsHubModal.js';
import { AiCopilotWidget } from './components/AiCopilotWidget.js';
import { NotificationProvider } from './context/NotificationContext.js';
import {
  ProcessedDocument,
  TransactionClassificationResult,
  JournalEntryProposal,
  ExtractionIntegrityCheck,
} from './types/finance.js';
import { safeFetchJson } from './utils/api.js';
import { exportDocumentAuditPdf } from './utils/pdfExport.js';
import {
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  CheckCircle,
  Eye,
  RefreshCw,
  Cpu,
  ArrowRight,
  Tag,
  Scale,
  Download,
} from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>('extraction');
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<ProcessedDocument | null>(null);
  const [proposals, setProposals] = useState<JournalEntryProposal[]>([]);
  const [activeClassification, setActiveClassification] = useState<TransactionClassificationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState<boolean>(false);
  const [isIntegrationsHubOpen, setIsIntegrationsHubOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch documents and proposals on initial load
  const fetchDocuments = async () => {
    try {
      const docRes = await safeFetchJson<{ success: boolean; documents: ProcessedDocument[] }>('/api/documents');
      if (docRes.success && Array.isArray(docRes.data?.documents)) {
        setDocuments(docRes.data.documents);
        if (!activeDocument && docRes.data.documents.length > 0) {
          setActiveDocument(docRes.data.documents[0]);
        }
      }

      const pRes = await safeFetchJson<{ success: boolean; proposals: JournalEntryProposal[] }>('/api/journal-proposals');
      if (pRes.success && Array.isArray(pRes.data?.proposals)) {
        setProposals(pRes.data.proposals);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleProcessDocument = async (payload: {
    filename: string;
    fileType: 'image' | 'pdf' | 'text' | 'csv';
    fileBase64?: string;
    mimeType?: string;
    textInput?: string;
    sampleId?: string;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const apiRes = await safeFetchJson<{ success: boolean; document?: ProcessedDocument; error?: string }>('/api/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!apiRes.success || !apiRes.data?.document) {
        throw new Error(apiRes.error || apiRes.data?.error || 'Erro durante extração do documento.');
      }

      const newDoc: ProcessedDocument = apiRes.data.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocument(newDoc);
      setActiveTab('extraction');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDocument = (doc: ProcessedDocument) => {
    setActiveDocument(doc);
    setActiveTab('extraction');
  };

  const handleForwardToClassification = (doc: ProcessedDocument) => {
    setActiveDocument(doc);
    setActiveTab('classification');
  };

  const handleProposeJournalForTransaction = (
    classification: TransactionClassificationResult,
    doc?: ProcessedDocument
  ) => {
    setActiveClassification(classification);
    if (doc) setActiveDocument(doc);
    setActiveTab('journal');
  };

  const handleSubmitReview = async (decision: {
    status: 'APPROVED' | 'REJECTED' | 'MODIFIED';
    reviewerName: string;
    notes: string;
  }) => {
    if (!activeDocument) return;

    try {
      const apiRes = await safeFetchJson<{ success: boolean; document?: ProcessedDocument }>(`/api/documents/${activeDocument.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      });

      if (apiRes.success && apiRes.data?.document) {
        const updated = apiRes.data.document;
        setActiveDocument(updated);
        setDocuments((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      }
    } catch (err) {
      console.error('Failed to submit review decision:', err);
    }
  };

  const pendingReviewCount = documents.filter(
    (d) =>
      d.validation.step6_reviewRouting.overallStatus === 'PENDING_REVIEW' &&
      !d.humanReview
  ).length;

  // Validador de integridade de extração: compara a soma dos line_items com o total declarado
  const extractionIntegrity: ExtractionIntegrityCheck | null = useMemo(() => {
    if (!activeDocument) return null;
    const items = activeDocument.geminiExtraction?.line_items || [];
    const declaredTotal = activeDocument.geminiExtraction?.total ?? null;

    let sum = 0;
    for (const item of items) {
      if (typeof item.line_total === 'number' && !isNaN(item.line_total)) {
        sum += item.line_total;
      } else if (
        typeof item.quantity === 'number' &&
        typeof item.unit_price === 'number' &&
        !isNaN(item.quantity) &&
        !isNaN(item.unit_price)
      ) {
        sum += item.quantity * item.unit_price;
      }
    }
    const calculatedLineItemsSum = Math.round((sum + Number.EPSILON) * 100) / 100;

    if (items.length === 0) {
      return {
        calculatedLineItemsSum: 0,
        declaredTotal,
        difference: null,
        percentageDiff: null,
        hasDiscrepancy: false,
        itemCount: 0,
        status: 'NO_ITEMS',
        details: 'Nenhum item individual (line_items) discriminado para validação matemática.',
      };
    }

    if (declaredTotal === null || isNaN(declaredTotal)) {
      return {
        calculatedLineItemsSum,
        declaredTotal: null,
        difference: null,
        percentageDiff: null,
        hasDiscrepancy: true,
        itemCount: items.length,
        status: 'NO_DECLARED_TOTAL',
        details: `Soma dos ${items.length} itens extraídos é de ${calculatedLineItemsSum.toFixed(2)}, porém o total declarado no documento está ausente.`,
      };
    }

    const difference = Math.round(Math.abs(calculatedLineItemsSum - declaredTotal) * 100) / 100;
    const hasDiscrepancy = difference > 0.02;
    const percentageDiff = declaredTotal !== 0 ? Math.round((difference / Math.abs(declaredTotal)) * 10000) / 100 : null;

    return {
      calculatedLineItemsSum,
      declaredTotal,
      difference,
      percentageDiff,
      hasDiscrepancy,
      itemCount: items.length,
      status: hasDiscrepancy ? 'DISCREPANT' : 'MATCH',
      details: hasDiscrepancy
        ? `Discrepância matemática detectada: A soma dos ${items.length} itens extraídos (${calculatedLineItemsSum.toFixed(2)}) diverge do total declarado no documento (${declaredTotal.toFixed(2)}) em ${difference.toFixed(2)}${percentageDiff !== null ? ` (${percentageDiff}%)` : ''}.`
        : `Integridade matemática 100% verificada: A soma dos ${items.length} itens extraídos (${calculatedLineItemsSum.toFixed(2)}) confere perfeitamente com o total declarado (${declaredTotal.toFixed(2)}).`,
    };
  }, [activeDocument]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Top Header with All Modules */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        pendingReviewCount={pendingReviewCount}
        proposalCount={proposals.length}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
        onOpenIntegrationsHub={() => setIsIntegrationsHubOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-bold underline ml-4 hover:text-rose-950"
            >
              Fechar
            </button>
          </div>
        )}

        {/* TAB 1: 1. EXTRAÇÃO DE FATURAS & AUDITORIA */}
        {activeTab === 'extraction' && (
          <div className="space-y-8">
            {/* Document Ingestion Card */}
            <UploadSection onProcess={handleProcessDocument} isLoading={isLoading} />

            {/* Active Document Details */}
            {activeDocument ? (
              <div className="space-y-6">
                {/* Document Subheader / Metadata */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs">
                      {activeDocument.fileType.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="font-bold text-base text-slate-900">
                          {activeDocument.filename}
                        </h2>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {activeDocument.id}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Auditado em{' '}
                            {new Date(activeDocument.extractedAt).toLocaleDateString()} às{' '}
                            {new Date(activeDocument.extractedAt).toLocaleTimeString()}
                          </span>
                        </span>
                        <span>•</span>
                        <span>Tempo: {activeDocument.processingTimeMs}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    <button
                      onClick={() => exportDocumentAuditPdf(activeDocument)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Exportar Dossiê de Auditoria e Parecer em PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Exportar PDF</span>
                    </button>
                    <button
                      onClick={() => handleForwardToClassification(activeDocument)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Classificar no Módulo 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
                    >
                      {activeDocument.humanReview ? 'Editar Parecer' : 'Abrir Parecer'}
                    </button>
                  </div>
                </div>

                {/* THE 6 MANDATORY BACKEND AUDIT STEPS */}
                <StepVerificationPanel
                  validation={activeDocument.validation}
                  extraction={activeDocument.geminiExtraction}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                  humanReviewDecision={activeDocument.humanReview}
                  extractionIntegrity={extractionIntegrity}
                  onExportPdf={() => exportDocumentAuditPdf(activeDocument)}
                />

                {/* Split layout: Original Document Preview vs Structured Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Document Original Source (Visual or Raw Text) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-20">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <h3 className="font-bold text-slate-900 text-sm">
                            Documento Original Ingerido
                          </h3>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          Fonte Legível
                        </span>
                      </div>

                      {activeDocument.previewDataUrl ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900/5 max-h-[550px] overflow-y-auto">
                          <img
                            src={activeDocument.previewDataUrl}
                            alt="Documento Original"
                            className="w-full object-contain"
                          />
                        </div>
                      ) : activeDocument.rawTextPreview ? (
                        <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-200 max-h-[550px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                          {activeDocument.rawTextPreview}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                          Prévia visual não disponível para este formato.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Structured Extracted Data & Evidences */}
                  <div className="lg:col-span-7 space-y-6">
                    <ExtractedFieldsEvidence extraction={activeDocument.geminiExtraction} />

                    <LineItemsTable
                      items={activeDocument.geminiExtraction.line_items}
                      currency={activeDocument.geminiExtraction.currency}
                      calculatedSum={
                        activeDocument.validation.step1_lineItemsCalculation
                          .calculatedLineItemsSum
                      }
                      extractedSubtotal={
                        activeDocument.validation.step1_lineItemsCalculation
                          .extractedSubtotal
                      }
                      extractedTotal={
                        activeDocument.validation.step1_lineItemsCalculation
                          .extractedTotal
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Nenhum documento selecionado para auditoria
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Utilize o painel acima para executar a extração de um cenário de teste ou faça upload de um documento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 2. CLASSIFICAÇÃO DE TRANSAÇÕES */}
        {activeTab === 'classification' && (
          <TransactionClassifierView
            documents={documents}
            onProposeJournalForTransaction={handleProposeJournalForTransaction}
          />
        )}

        {/* TAB 3: 3. PROPOSTA DE LANÇAMENTO CONTÁBIL */}
        {activeTab === 'journal' && (
          <JournalProposalView
            documents={documents}
            prefilledDoc={activeDocument}
            prefilledClassification={activeClassification}
          />
        )}

        {/* TAB 4: 4. REVENUE RECOGNITION (IFRS 15 / ASC 606) */}
        {activeTab === 'revenue' && <RevenueRecognitionView />}

        {/* TAB 5: 5. RECONCILIAÇÃO ASSISTIDA */}
        {activeTab === 'reconciliation' && <ReconciliationView />}

        {/* TAB 6: 6. TRIAGEM DE EXCEÇÕES */}
        {activeTab === 'triage' && <ExceptionTriageView />}

        {/* TAB 7: 7. CHECKLIST DO FECHAMENTO */}
        {activeTab === 'closing' && <ClosingChecklistView onNavigateToTab={(t) => setActiveTab(t)} />}

        {/* TAB 8: 8. RELATÓRIO PARA CFO OU CONTROLLER */}
        {activeTab === 'cfo' && <CfoReportView />}

        {/* TAB 9: 9. TRIBUTÁRIO & REFORMA TRIBUTÁRIA / SPED */}
        {activeTab === 'tax' && (
          <TaxAndSpedView documents={documents} activeDocument={activeDocument} />
        )}

        {/* TAB 10: 10. TESOURARIA D+90, FLUXO & DDA */}
        {activeTab === 'treasury' && <TreasuryCashFlowView documents={documents} />}

        {/* TAB 11: 11. FP&A & ORÇAMENTO CORPORATIVO */}
        {activeTab === 'fpa' && <FpaBudgetView documents={documents} />}

        {/* TAB 12: 12. AUDITORIA FORENSE & CONFORMIDADE SOX */}
        {activeTab === 'forensics' && <ForensicsSoxView documents={documents} />}

        {/* TAB 13: 13. ESG & CONTABILIDADE DE CARBONO */}
        {activeTab === 'esg' && <EsgCarbonView documents={documents} />}

        {/* TAB 14: 14. CONECTORES ERP & CERTIDÕES NEGATIVAS */}
        {activeTab === 'erp' && (
          <ErpIntegrationsView documents={documents} activeDocument={activeDocument} />
        )}

        {/* TAB 15: 15. BENCHMARK DE PREÇOS HISTÓRICOS & ANOMALIAS */}
        {activeTab === 'benchmarks' && (
          <PriceBenchmarkView
            documents={documents}
            activeDocument={activeDocument}
            onSelectDocument={handleSelectDocument}
          />
        )}

        {/* TAB 16: 16. FUNCTION CALLING (AÇÕES CONTROLADAS) */}
        {activeTab === 'tools' && <FunctionCallingConsoleView />}

        {/* TAB EXTRA: PLANO DE CONTAS, POLÍTICAS & PERÍODOS */}
        {activeTab === 'chart' && <ChartOfAccountsView />}

        {/* TAB EXTRA: HISTÓRICO DE FATURAS */}
        {activeTab === 'documents' && (
          <DocumentsHistoryTable
            documents={documents}
            onSelectDocument={handleSelectDocument}
            selectedDocId={activeDocument?.id}
          />
        )}

        {/* TAB EXTRA: BASE MESTRE DE FORNECEDORES */}
        {activeTab === 'vendors' && <VendorDirectoryModal />}
      </main>

      {/* Real-time Toast Notifications Floating System */}
      <ToastNotifications
        onNavigateToDocument={(docId) => {
          const doc = documents.find((d) => d.id === docId);
          if (doc) setActiveDocument(doc);
          setActiveTab('extraction');
        }}
        onNavigateToTab={(t) => setActiveTab(t)}
      />

      {/* Notification Center Modal / Drawer */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        onSelectDocument={(docId) => {
          const doc = documents.find((d) => d.id === docId);
          if (doc) setActiveDocument(doc);
          setActiveTab('extraction');
        }}
        onNavigateToTab={(t) => setActiveTab(t)}
      />

      {/* Human Review Decision Modal */}
      {activeDocument && (
        <DocumentReviewModal
          document={activeDocument}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* AI Engine Settings & Health Diagnostic Modal */}
      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
        onKeyUpdated={fetchDocuments}
      />

      {/* Public APIs Hub & Live Currencies Modal */}
      <IntegrationsHubModal
        isOpen={isIntegrationsHubOpen}
        onClose={() => setIsIntegrationsHubOpen(false)}
      />

      {/* Floating AI Copilot Widget */}
      <AiCopilotWidget
        currentModule={activeTab.toUpperCase()}
        onOpenAiSettings={() => setIsAiSettingsOpen(true)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-900">DocAudit AI v2.0 Enterprise</span>
            <span>•</span>
            <span>Gestão Contábil, Auditoria Fiscal & Tesouraria Automatizada</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Google Gemini 2.5 Flash & 2.5 Pro Ativos</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

