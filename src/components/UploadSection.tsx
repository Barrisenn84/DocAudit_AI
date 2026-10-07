import React, { useState } from 'react';
import { UploadCloud, FileText, Sparkles, Check, AlertCircle, ArrowRight, Play, RefreshCw, HelpCircle } from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocumentItem } from '../../server/sampleDocuments.js';

interface UploadSectionProps {
  onProcess: (payload: {
    filename: string;
    fileType: 'image' | 'pdf' | 'text' | 'csv';
    fileBase64?: string;
    mimeType?: string;
    textInput?: string;
    sampleId?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onProcess, isLoading }) => {
  const [selectedSample, setSelectedSample] = useState<SampleDocumentItem | null>(SAMPLE_DOCUMENTS[0]);
  const [activeInputMode, setActiveInputMode] = useState<'sample' | 'upload' | 'text'>('sample');
  const [customText, setCustomText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    base64: string;
    mimeType: string;
    csvText?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');

    if (isCsv) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const textContent = textReader.result as string;
        const base64Data = btoa(unescape(encodeURIComponent(textContent)));
        setUploadedFile({
          file,
          base64: base64Data,
          mimeType: 'text/csv',
          csvText: textContent,
        });
      };
      textReader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        setUploadedFile({
          file,
          base64: base64Data,
          mimeType: file.type || 'application/octet-stream',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadCsvSample = () => {
    const csvContent = `document_type,vendor_name,vendor_tax_id,invoice_number,issue_date,due_date,currency,subtotal,tax_amount,total
invoice,TechCom Telecomunicações do Brasil S.A.,18.234.567/0001-90,TC-2026-8819,2026-09-18,2026-10-18,BRL,5200.00,520.00,5720.00

item_number,description,quantity,unit_price,line_total
1,Circuito Dedicado de Internet Fibra 2Gbps,1,3800.00,3800.00
2,Hospedagem de Roteador BGP em Datacenter,1,1400.00,1400.00`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const mockFile = new File([blob], 'fatura_telecom_setembro_2026.csv', { type: 'text/csv' });
    const base64Data = btoa(unescape(encodeURIComponent(csvContent)));

    setUploadedFile({
      file: mockFile,
      base64: base64Data,
      mimeType: 'text/csv',
      csvText: csvContent,
    });
  };

  const handleExecute = async () => {
    if (activeInputMode === 'sample' && selectedSample) {
      await onProcess({
        filename: `${selectedSample.id}.txt`,
        fileType: selectedSample.id.includes('csv') ? 'csv' : 'text',
        sampleId: selectedSample.id,
        textInput: selectedSample.sampleText,
      });
    } else if (activeInputMode === 'upload' && uploadedFile) {
      const isImg = uploadedFile.mimeType.startsWith('image/');
      const isPdf = uploadedFile.mimeType.includes('pdf');
      const isCsv = uploadedFile.file.name.toLowerCase().endsWith('.csv') || uploadedFile.mimeType.includes('csv');
      await onProcess({
        filename: uploadedFile.file.name,
        fileType: isImg ? 'image' : isPdf ? 'pdf' : isCsv ? 'csv' : 'text',
        fileBase64: uploadedFile.base64,
        mimeType: isCsv ? 'text/csv' : uploadedFile.mimeType,
        textInput: uploadedFile.csvText,
      });
    } else if (activeInputMode === 'text' && customText.trim()) {
      await onProcess({
        filename: 'documento_digitado.txt',
        fileType: 'text',
        textInput: customText,
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Entrada do Documento Fiscal / Financeiro
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Selecione um cenário pré-configurado de teste para validar os 6 passos de auditoria ou faça upload de imagem, PDF ou texto de nota fiscal/fatura.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveInputMode('sample')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInputMode === 'sample'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Cenários de Teste (5)
            </button>
            <button
              onClick={() => setActiveInputMode('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInputMode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Upload de Arquivo
            </button>
            <button
              onClick={() => setActiveInputMode('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInputMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Colar Texto / OCR
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* MODE 1: PRE-LOADED TEST SCENARIOS */}
        {activeInputMode === 'sample' && (
          <div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Selecione o Caso de Teste Contábil:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SAMPLE_DOCUMENTS.map((sample) => {
                  const isSelected = selectedSample?.id === sample.id;
                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (sample.id.includes('clean')) {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else if (sample.id.includes('math')) {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (sample.id.includes('blocked') || sample.id.includes('duplicate')) {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  }

                  return (
                    <div
                      key={sample.id}
                      onClick={() => setSelectedSample(sample)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          {sample.documentType.toUpperCase()}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 leading-snug">
                        {sample.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {sample.description}
                      </p>
                      <div className="mt-2 text-[11px] font-medium text-indigo-700 bg-indigo-100/60 px-2 py-1 rounded">
                        🎯 {sample.expectedScenario}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document preview panel */}
            {selectedSample && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">
                      Prévia do Conteúdo do Documento ({selectedSample.name})
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedSample.sampleText.split('\n').length} linhas
                  </span>
                </div>
                <pre className="text-xs font-mono text-slate-700 bg-white p-3.5 rounded-lg border border-slate-200 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                  {selectedSample.sampleText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: FILE UPLOAD */}
        {activeInputMode === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  {uploadedFile ? uploadedFile.file.name : 'Clique para selecionar ou arraste o arquivo'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Suporta imagens (PNG, JPG, WEBP), faturas em PDF, arquivos de texto (.txt) e <strong>planilhas/faturas em CSV (.csv)</strong>.
                </p>

                {/* Formatos Suportados */}
                <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">PDF</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">PNG / JPG</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">TXT</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                    CSV (.csv)
                  </span>
                </div>

                {uploadedFile && (
                  <div className="mt-4 inline-flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Arquivo carregado: {uploadedFile.file.name} ({(uploadedFile.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Atalho para testar CSV de exemplo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
              <div className="flex items-center space-x-2 text-emerald-900">
                <span className="font-bold">Dica de Teste:</span>
                <span className="text-slate-600">Não tem um CSV em mãos? Carregue um exemplo estruturado de telecomunicações.</span>
              </div>
              <button
                type="button"
                onClick={handleLoadCsvSample}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-2xs cursor-pointer shrink-0"
              >
                Carregar CSV de Exemplo
              </button>
            </div>

            {/* Prévia textual se o arquivo for CSV */}
            {uploadedFile?.csvText && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Prévia das Linhas do CSV ({uploadedFile.file.name})</span>
                  <span className="font-mono text-slate-400">{uploadedFile.csvText.split('\n').length} linhas</span>
                </div>
                <pre className="text-[11px] font-mono bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto text-slate-700 whitespace-pre-wrap">
                  {uploadedFile.csvText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: TEXT OCR INPUT */}
        {activeInputMode === 'text' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              Cole o texto da Fatura, Recibo ou Extrato:
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Cole aqui o texto do documento fiscal ou conteúdo OCR da fatura..."
              rows={8}
              className="w-full text-xs font-mono p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Motor Gemini Structured Outputs pronto para extração e auditoria em 6 passos</span>
          </div>

          <button
            onClick={handleExecute}
            disabled={isLoading || (activeInputMode === 'upload' && !uploadedFile) || (activeInputMode === 'text' && !customText.trim())}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processando Extração & 6 Etapas...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Executar Extração com Gemini</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
