import React, { useState, useEffect } from 'react';
import {
  Server,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Download,
  Building,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Stamp,
  Award,
} from 'lucide-react';
import {
  ErpExportRecord,
  ErpSystemTarget,
  VendorCndCertificateStatus,
  ProcessedDocument,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface ErpIntegrationsViewProps {
  documents: ProcessedDocument[];
  activeDocument?: ProcessedDocument | null;
}

export const ErpIntegrationsView: React.FC<ErpIntegrationsViewProps> = ({
  documents,
  activeDocument,
}) => {
  const [selectedErp, setSelectedErp] = useState<ErpSystemTarget>('SAP_S4HANA');
  const [selectedDocId, setSelectedDocId] = useState<string>(activeDocument?.id || documents[0]?.id || '');
  const [payloadRecord, setPayloadRecord] = useState<ErpExportRecord | null>(null);
  const [cndStatus, setCndStatus] = useState<VendorCndCertificateStatus | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || activeDocument || documents[0];

  const fetchErpData = async () => {
    if (!selectedDoc) return;
    setIsLoading(true);
    try {
      const [erpRes, cndRes] = await Promise.all([
        safeFetchJson<{ success: boolean; payloadRecord: ErpExportRecord }>('/api/erp/generate-payload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: selectedDoc.id, erp_system: selectedErp }),
        }),
        safeFetchJson<{ success: boolean; cndStatus: VendorCndCertificateStatus }>(
          `/api/erp/cnd-status?cnpj=${encodeURIComponent(selectedDoc.geminiExtraction.vendor_tax_id || '')}&name=${encodeURIComponent(selectedDoc.geminiExtraction.vendor_name || '')}`
        ),
      ]);

      if (erpRes.success && erpRes.data?.payloadRecord) {
        setPayloadRecord(erpRes.data.payloadRecord);
      }
      if (cndRes.success && cndRes.data?.cndStatus) {
        setCndStatus(cndRes.data.cndStatus);
      }
    } catch (err) {
      console.error('Error fetching ERP integration data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoc) {
      fetchErpData();
    }
  }, [selectedDocId, selectedErp]);

  const handleCopyJson = () => {
    if (payloadRecord) {
      navigator.clipboard.writeText(JSON.stringify(payloadRecord.payloadFormatted, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Server className="w-3.5 h-3.5" />
            <span>Conectores ERP & Regularidade Cadastral (CNDs)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Integração SAP, TOTVS, NetSuite, Omie & Certidões Negativas
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Sincronização bidirecional de lançamentos aprovados com ERPs corporativos, validação de CNDs e autenticação com assinatura digital ICP-Brasil.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
          {(['SAP_S4HANA', 'TOTVS_PROTHEUS', 'ORACLE_NETSUITE', 'OMIE_CLOUD'] as ErpSystemTarget[]).map((erp) => (
            <button
              key={erp}
              onClick={() => setSelectedErp(erp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedErp === erp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {erp.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: CNDs Status & Document Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Documento Selecionado para Sincronização</span>
            </h3>

            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} - {d.geminiExtraction.vendor_name || 'Fornecedor'} (R$ {d.geminiExtraction.total?.toLocaleString('pt-BR')})
                </option>
              ))}
            </select>

            {selectedDoc && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fornecedor:</span>
                  <strong className="text-slate-900">{selectedDoc.geminiExtraction.vendor_name || 'N/A'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CNPJ:</span>
                  <span className="font-mono text-slate-700">{selectedDoc.geminiExtraction.vendor_tax_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total:</span>
                  <strong className="font-mono text-slate-900">
                    R$ {selectedDoc.geminiExtraction.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* CNDs Live Card */}
          {cndStatus && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Certidões de Regularidade Fiscal</span>
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    cndStatus.overallCompliance === 'FORNECEDOR_100_REGULAR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {cndStatus.overallCompliance === 'FORNECEDOR_100_REGULAR' ? '100% REGULAR' : 'RESTRIÇÃO FISCAL'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>1. CND Federal (Receita / PGFN):</span>
                    <span className="text-emerald-700">{cndStatus.cndFederalReceita.status}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {cndStatus.cndFederalReceita.code} • Val: {cndStatus.cndFederalReceita.validUntil}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>2. CRF Caixa (Regularidade FGTS):</span>
                    <span className="text-emerald-700">{cndStatus.cndFgtsCaixa.status}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {cndStatus.cndFgtsCaixa.code} • Val: {cndStatus.cndFgtsCaixa.validUntil}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>3. CNDT Trabalhista (TST):</span>
                    <span className="text-emerald-700">{cndStatus.cndTrabalhistaTst.status}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {cndStatus.cndTrabalhistaTst.code} • Val: {cndStatus.cndTrabalhistaTst.validUntil}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: ERP Payload Inspector */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Payload Formatado para {selectedErp.replace('_', ' ')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Transação / BAPI: <code className="font-mono font-bold text-indigo-700">{payloadRecord?.erpTransactionCode}</code>
              </p>
            </div>

            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto text-white font-mono text-xs max-h-96 shadow-inner border border-slate-800">
            <pre className="text-indigo-300">
              {JSON.stringify(payloadRecord?.payloadFormatted, null, 2)}
            </pre>
          </div>

          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-950">Assinatura Digital & Carimbo do Tempo ICP-Brasil</h4>
                <p className="text-indigo-800/80 text-[11px]">
                  Laudo pericial com certificado digital X.509 v3 e hash criptográfico SHA-256 anexado ao ERP
                </p>
              </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap">
              Transmitir ao ERP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
