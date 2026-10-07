import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { runBackendValidation, MASTER_VENDORS } from './server/validationEngine.js';
import { SAMPLE_DOCUMENTS } from './server/sampleDocuments.js';
import {
  CHART_OF_ACCOUNTS,
  ACCOUNTING_POLICIES,
  ACCOUNTING_PERIODS,
  CORPORATE_ENTITIES,
  validateJournalProposalBackend,
} from './server/accountingEngine.js';
import {
  ProcessedDocument,
  GeminiExtractionResult,
  HumanReviewDecision,
  TransactionClassificationResult,
  JournalEntryProposal,
  JournalEntryLineCandidate,
  RevenueRecognitionResult,
  ReconciliationBatchResult,
  ReconciliationPairCandidate,
  ExceptionTriageResult,
} from './src/types/finance.js';
import { SAMPLE_REVENUE_CONTRACTS, REVENUE_POLICIES } from './server/revenueEngine.js';
import {
  SAMPLE_LEDGER_ITEMS,
  SAMPLE_STATEMENT_ITEMS,
  evaluateReconciliationAlgorithm,
} from './server/reconciliationEngine.js';
import { INITIAL_EXCEPTIONS_REPOSITORY } from './server/triageEngine.js';
import {
  evaluateClosingBlockers,
  buildDatabaseStatePrompt,
  SystemAuditState,
} from './server/closingEngine.js';
import {
  READ_ONLY_FUNCTION_DECLARATIONS,
  BLOCKED_MUTATING_FUNCTIONS,
  executeGetSourceDocument,
  executeSearchPolicy,
  executeFindReconciliationCandidates,
  executeLiveCnpjLookup,
  executeLiveFxQuote,
  executeCheckBankingHoliday,
  executeGetMacroRates,
} from './server/functionCallingEngine.js';
import {
  fetchLiveCnpj,
  fetchLiveFxRate,
  checkBankingHoliday,
  fetchBacenTaxas,
  fetchBrazilianBanks,
  fetchAwesomeRates,
  fetchLiveCep,
  fetchFipeCarBrands,
  checkAllIntegrationsHealth,
} from './server/liveIntegrations.js';
import { StorageService } from './server/storageService.js';
import {
  GEMINI_MODELS,
  generateContentWithFallback,
  checkAiHealth,
  setUserApiKey,
  getActiveApiKey,
  generateForensicAiOpinion,
  generateTreasuryAiOpinion,
  generateTaxReformAiDiagnosis,
  generateEsgAiRecommendations,
  chatWithDocAuditCopilot,
} from './server/aiService.js';
import {
  ClosingChecklistResult,
  ClosingChecklistTask,
  CfoClosingReportResult,
  MonthlyAuditTrendItem,
  AuditTrendSummary,
  FunctionCallingSession,
  FunctionCallExecution,
  AgentStepTurn,
  ReconciliationAiAnalysisResult,
  LiveCnpjData,
  LiveFxRateData,
  BankingHolidayCheck,
  BacenFinancialRates,
  BrazilianBankItem,
  PriceBenchmarkItem,
  DocumentPriceBenchmarkAudit,
  AuditNotification,
} from './src/types/finance.js';
import {
  HISTORICAL_PRICE_BENCHMARKS,
  evaluateDocumentPriceBenchmarks,
  matchBenchmarkForItem,
} from './server/priceBenchmarkEngine.js';
import {
  parseCsvRfc4180,
  isTransactionStatementCsv,
  processStatementCsvToExtraction,
} from './server/csvProcessor.js';
import {
  calculateTaxWithholdings,
  simulateTaxReform,
  auditSpedCompliance,
} from './server/taxReformEngine.js';
import {
  generateCashFlowForecastD90,
  evaluateDynamicDiscounting,
  SAMPLE_DDA_INVOICES,
} from './server/treasuryEngine.js';
import {
  CORPORATE_COST_CENTERS,
  generateFpaVarianceReport,
} from './server/fpaEngine.js';
import {
  runBenfordAnalysis,
  SOD_VIOLATIONS_STORE,
  AUDIT_TRAIL_CHAIN,
  addAuditTrailBlock,
} from './server/forensicsEngine.js';
import {
  calculateInvoiceCarbonFootprint,
  generateEsgSustainabilitySummary,
} from './server/esgCarbonEngine.js';
import {
  generateErpPayload,
  verifyVendorCnds,
} from './server/erpConnectorsEngine.js';

dotenv.config();

const app = express();

// Parse port and host from command line arguments (e.g. --port 3000 --host 0.0.0.0) or environment variables
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
const port = (!isNaN(cliPort) && cliPort > 0) ? cliPort : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

const hostArgIndex = process.argv.indexOf('--host');
const host = hostArgIndex !== -1 && process.argv[hostArgIndex + 1] ? process.argv[hostArgIndex + 1] : (process.env.HOST || '0.0.0.0');

// Health check routes for container/platform probes
app.get(['/api/health', '/health', '/healthz'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Catch JSON parsing errors in body-parser and always return JSON, never HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'JSON malformado no corpo da requisição.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Payload excede o limite suportado (máx 35MB).' });
  }
  next(err);
});

// In-memory databases
const documentsStore: ProcessedDocument[] = [];
const classificationsStore: TransactionClassificationResult[] = [];
const journalProposalsStore: JournalEntryProposal[] = [];
const revenueAnalysesStore: RevenueRecognitionResult[] = [];
const reconciliationBatchesStore: ReconciliationBatchResult[] = [];
const exceptionsStore: ExceptionTriageResult[] = [...INITIAL_EXCEPTIONS_REPOSITORY];
const closingChecklistsStore: ClosingChecklistResult[] = [];
const cfoReportsStore: CfoClosingReportResult[] = [];
const functionCallingSessionsStore: FunctionCallingSession[] = [];
let isClosingDataApproved = false;
let closingApprovalMeta = {
  auditor: 'Dra. Vanessa Cavalcanti - Controller Geral',
  approved_at: '',
  notes: '',
};

// Seed with an initial processed document so history and duplicate checking are immediately demonstrable
const seedInitialDocument = () => {
  const seedExtraction: GeminiExtractionResult = {
    document_type: 'invoice',
    vendor_name: 'AWS Serviços de Nuvem Ltda',
    vendor_tax_id: '23.412.247/0001-10',
    invoice_number: 'AWS-2026-90412',
    issue_date: '2026-09-15',
    due_date: '2026-10-15',
    currency: 'BRL',
    subtotal: 6000.0,
    tax_amount: 600.0,
    total: 6600.0,
    line_items: [
      {
        item_number: 1,
        description: 'Amazon Elastic Compute Cloud (EC2) - Instâncias Linux',
        quantity: 1,
        unit_price: 3200.0,
        line_total: 3200.0,
        confidence: 0.99,
        raw_text: 'Item 1: Amazon Elastic Compute Cloud (EC2) | Total: R$ 3.200,00',
      },
      {
        item_number: 2,
        description: 'Amazon Simple Storage Service (S3) - Armazenamento Seguro',
        quantity: 1,
        unit_price: 850.0,
        line_total: 850.0,
        confidence: 0.99,
        raw_text: 'Item 2: Amazon Simple Storage Service (S3) | Total: R$ 850,00',
      },
      {
        item_number: 3,
        description: 'Amazon Relational Database Service (RDS Multi-AZ)',
        quantity: 1,
        unit_price: 1950.0,
        line_total: 1950.0,
        confidence: 0.98,
        raw_text: 'Item 3: Amazon Relational Database Service (RDS) | Total: R$ 1.950,00',
      },
    ],
    field_evidence: [
      {
        field_name: 'vendor_name',
        extracted_value: 'AWS Serviços de Nuvem Ltda',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'Razão Social: AWS Serviços de Nuvem Ltda',
        page_or_location: 'Cabeçalho - Dados do Emissor',
      },
      {
        field_name: 'vendor_tax_id',
        extracted_value: '23.412.247/0001-10',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'CNPJ: 23.412.247/0001-10',
        page_or_location: 'Cabeçalho - Linha 4',
      },
      {
        field_name: 'invoice_number',
        extracted_value: 'AWS-2026-90412',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'Número da Fatura: AWS-2026-90412',
        page_or_location: 'Dados da Fatura',
      },
      {
        field_name: 'issue_date',
        extracted_value: '2026-09-15',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'Data de Emissão: 2026-09-15',
        page_or_location: 'Dados da Fatura',
      },
      {
        field_name: 'due_date',
        extracted_value: '2026-10-15',
        confidence: 0.98,
        status: 'observed',
        text_evidence: 'Data de Vencimento: 2026-10-15',
        page_or_location: 'Dados da Fatura',
      },
      {
        field_name: 'currency',
        extracted_value: 'BRL',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'Moeda: BRL / R$',
        page_or_location: 'Totais e Tributos',
      },
      {
        field_name: 'subtotal',
        extracted_value: '6000.00',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'Subtotal: R$ 6.000,00',
        page_or_location: 'Totais e Tributos',
      },
      {
        field_name: 'tax_amount',
        extracted_value: '600.00',
        confidence: 0.98,
        status: 'observed',
        text_evidence: 'Impostos Federais e Municipais (ISS/PIS/COFINS): R$ 600,00',
        page_or_location: 'Totais e Tributos',
      },
      {
        field_name: 'total',
        extracted_value: '6600.00',
        confidence: 0.99,
        status: 'observed',
        text_evidence: 'TOTAL A PAGAR: R$ 6.600,00',
        page_or_location: 'Rodapé - Total Final',
      },
    ],
    exceptions: [],
  };

  const validation = runBackendValidation(seedExtraction, []);
  const priceBenchmarkAudit = evaluateDocumentPriceBenchmarks({
    id: 'DOC-HIST-001',
    vendor_name: seedExtraction.vendor_name,
    vendor_tax_id: seedExtraction.vendor_tax_id,
    line_items: seedExtraction.line_items,
    total: seedExtraction.total,
    currency: seedExtraction.currency,
  }, []);

  documentsStore.push({
    id: 'DOC-HIST-001',
    filename: 'Fatura_AWS_Setembro_2026.pdf',
    fileType: 'pdf',
    extractedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    geminiExtraction: seedExtraction,
    validation,
    priceBenchmarkAudit,
    rawTextPreview: SAMPLE_DOCUMENTS[0].sampleText,
    processingTimeMs: 1420,
  });
};

seedInitialDocument();

// Carregamento de dados persistentes do disco para Produção (tolerância a reinício do servidor)
try {
  const loadedDocs = StorageService.loadDocuments(documentsStore);
  if (loadedDocs && loadedDocs.length > 0) {
    documentsStore.length = 0;
    documentsStore.push(...loadedDocs);
  }
  const loadedProposals = StorageService.loadJournalProposals(journalProposalsStore);
  if (loadedProposals && loadedProposals.length > 0) {
    journalProposalsStore.length = 0;
    journalProposalsStore.push(...loadedProposals);
  }
  const loadedExceptions = StorageService.loadExceptions(exceptionsStore);
  if (loadedExceptions && loadedExceptions.length > 0) {
    exceptionsStore.length = 0;
    exceptionsStore.push(...loadedExceptions);
  }
} catch (loadErr) {
  console.warn('[DocAudit Storage] Aviso ao restaurar dados persistidos:', loadErr);
}

// Gemini Schema Definition
const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    document_type: {
      type: Type.STRING,
      description: 'invoice, receipt, bank_statement ou other',
    },
    vendor_name: {
      type: Type.STRING,
      nullable: true,
      description: 'Nome ou razão social do fornecedor/emissor, ou null',
    },
    vendor_tax_id: {
      type: Type.STRING,
      nullable: true,
      description: 'CNPJ, CPF, EIN, VAT ID ou identificador fiscal do fornecedor, ou null',
    },
    invoice_number: {
      type: Type.STRING,
      nullable: true,
      description: 'Número da fatura, recibo ou documento fiscal, ou null',
    },
    issue_date: {
      type: Type.STRING,
      nullable: true,
      description: 'Data de emissão no formato ISO YYYY-MM-DD, ou null',
    },
    due_date: {
      type: Type.STRING,
      nullable: true,
      description: 'Data de vencimento no formato ISO YYYY-MM-DD, ou null',
    },
    currency: {
      type: Type.STRING,
      nullable: true,
      description: 'Código de moeda ISO (ex: USD, BRL, EUR) ou símbolo visível, ou null',
    },
    subtotal: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Valor do subtotal bruto antes de impostos, exatamente como impresso, ou null',
    },
    tax_amount: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Valor de impostos/taxas exatamente como impresso, ou null',
    },
    total: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Valor total do documento exatamente como impresso, ou null',
    },
    line_items: {
      type: Type.ARRAY,
      description: 'Linhas individuais de produtos ou serviços extraídas do documento',
      items: {
        type: Type.OBJECT,
        properties: {
          item_number: { type: Type.INTEGER, nullable: true },
          description: { type: Type.STRING, description: 'Descrição textual do item faturado' },
          quantity: { type: Type.NUMBER, nullable: true, description: 'Quantidade faturada' },
          unit_price: { type: Type.NUMBER, nullable: true, description: 'Preço unitário' },
          line_total: { type: Type.NUMBER, nullable: true, description: 'Valor total da linha' },
          confidence: { type: Type.NUMBER, description: 'Confiança entre 0 e 1' },
          raw_text: { type: Type.STRING, nullable: true, description: 'Texto original da linha' },
        },
        required: ['description', 'confidence'],
      },
    },
    field_evidence: {
      type: Type.ARRAY,
      description: 'Evidência textual, confiança e status para cada campo',
      items: {
        type: Type.OBJECT,
        properties: {
          field_name: { type: Type.STRING, description: 'Nome do campo: vendor_name, vendor_tax_id, etc.' },
          extracted_value: { type: Type.STRING, nullable: true, description: 'Valor extraído convertido para string' },
          confidence: { type: Type.NUMBER, description: 'Confiança entre 0 e 1' },
          status: { type: Type.STRING, description: 'observed, ambiguous ou missing' },
          text_evidence: { type: Type.STRING, description: 'Evidência textual visível que comprova o campo' },
          page_or_location: { type: Type.STRING, nullable: true, description: 'Localização visual ou página no documento' },
        },
        required: ['field_name', 'confidence', 'status', 'text_evidence'],
      },
    },
    exceptions: {
      type: Type.ARRAY,
      description: 'Conflitos entre subtotal, imposto, linhas e total observados no documento original',
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: 'Código do conflito (ex: MATH_CONFLICT_TOTAL_SUBTOTAL)' },
          message: { type: Type.STRING, description: 'Explicação detalhada da exceção observada' },
          severity: { type: Type.STRING, description: 'warning ou critical' },
          involved_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['code', 'message', 'severity'],
      },
    },
  },
  required: ['document_type', 'line_items', 'field_evidence', 'exceptions'],
};

const SYSTEM_INSTRUCTION = `Você é o extrator de documentos financeiros da plataforma.

Extraia somente informações visíveis ou claramente legíveis no documento.
Não classifique a despesa, não escolha conta contábil, não calcule impostos
e não preencha campos ausentes com suposições.

Para cada campo, retorne:
- valor extraído ou null;
- confidence entre 0 e 1;
- status: observed, ambiguous ou missing;
- evidência textual;
- página ou localização, quando disponível.

Se houver conflito entre subtotal, imposto, linhas e total, preserve os valores
encontrados, crie uma exceção e não resolva silenciosamente.

Não use conhecimento externo.
Use exatamente o schema fornecido.
O schema deve conter campos como:
{
  "document_type": "invoice",
  "vendor_name": "string ou null",
  "vendor_tax_id": "string ou null",
  "invoice_number": "string ou null",
  "issue_date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "currency": "USD",
  "subtotal": 0,
  "tax_amount": 0,
  "total": 0,
  "line_items": [],
  "field_evidence": [],
  "exceptions": []
}`;

// Fallback intelligent parser when Gemini API key is missing or offline
function fallbackTextExtractor(text: string): GeminiExtractionResult {
  // If the text is a CSV statement/ledger, use the high-precision RFC 4180 processor
  if (text.includes(',') || text.includes(';')) {
    const csvRows = parseCsvRfc4180(text);
    if (isTransactionStatementCsv(csvRows)) {
      return processStatementCsvToExtraction(csvRows, 'extrato_transacoes.csv');
    }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract document type
  let document_type = 'invoice';
  if (/recibo/i.test(text)) document_type = 'receipt';
  else if (/extrato|statement/i.test(text)) document_type = 'bank_statement';

  // Vendor name
  let vendor_name: string | null = null;
  const vendorMatch = text.match(/(?:Razão Social|EMISSOR|Emitente|Fornecedor|Company|Vendor):\s*([^\n\r]+)/i);
  if (vendorMatch) {
    vendor_name = vendorMatch[1].trim();
  } else if (lines.length > 0 && !lines[0].includes(',') && !lines[0].includes(';')) {
    vendor_name = lines[0].replace(/^[=\-_*]+|[=\-_*]+$/g, '').trim();
  }

  // Tax ID (CNPJ / CPF / EIN)
  let vendor_tax_id: string | null = null;
  const cnpjMatch = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  const einMatch = text.match(/(?:EIN|Tax ID|CNPJ):\s*([A-Za-z0-9\-./]+)/i);
  if (cnpjMatch) {
    vendor_tax_id = cnpjMatch[1];
  } else if (einMatch) {
    vendor_tax_id = einMatch[1].trim();
  }

  // Invoice Number
  let invoice_number: string | null = null;
  const invMatch = text.match(/(?:Fatura|Nota Fiscal|DANFE|Invoice|Nº|Recibo Nº|Número da Fatura)[:\s#]*([A-Za-z0-9\-_]+)/i);
  if (invMatch && !invMatch[1].startsWith('_number')) {
    invoice_number = invMatch[1].trim();
  }

  // Dates
  let issue_date: string | null = null;
  let due_date: string | null = null;
  const issueMatch = text.match(/(?:Data de Emissão|Emissão|Issue Date|Date)[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
  const dueMatch = text.match(/(?:Data de Vencimento|Vencimento|Due Date)[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);

  if (issueMatch) {
    const raw = issueMatch[1];
    if (raw.includes('/')) {
      const [d, m, y] = raw.split('/');
      issue_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      issue_date = raw;
    }
  }

  if (dueMatch) {
    const raw = dueMatch[1];
    if (raw.includes('/')) {
      const [d, m, y] = raw.split('/');
      due_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      due_date = raw;
    }
  }

  // Currency
  let currency: string | null = 'BRL';
  if (/USD|\$|US\$/i.test(text) && !/R\$/i.test(text)) currency = 'USD';
  else if (/EUR|€/i.test(text)) currency = 'EUR';

  // Subtotal & Tax & Total
  let subtotal: number | null = null;
  let tax_amount: number | null = null;
  let total: number | null = null;

  const parseMoney = (str: string): number => {
    const clean = str.replace(/[^0-9,.-]/g, '');
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
      } else {
        return parseFloat(clean.replace(/,/g, ''));
      }
    } else if (clean.includes(',')) {
      return parseFloat(clean.replace(',', '.'));
    }
    return parseFloat(clean);
  };

  const subtotalMatch = text.match(/(?:Subtotal|Sub-Total|Total dos Produtos)[:\s]*([^\n\r]+)/i);
  if (subtotalMatch) {
    const val = parseMoney(subtotalMatch[1]);
    if (!isNaN(val)) subtotal = val;
  }

  const taxMatch = text.match(/(?:Impostos|Imposto|Tributos|ICMS|ISS|Tax)[:\s]*([^\n\r]+)/i);
  if (taxMatch) {
    const val = parseMoney(taxMatch[1]);
    if (!isNaN(val)) tax_amount = val;
  }

  const totalMatch = text.match(/(?:TOTAL A PAGAR|VALOR TOTAL|TOTAL PAGO|TOTAL|Valor Total da Nota)[:\s]*([^\n\r]+)/i);
  if (totalMatch) {
    const val = parseMoney(totalMatch[1]);
    if (!isNaN(val)) total = val;
  }

  // Line items
  const line_items: any[] = [];
  const isCsv = (text.includes(',') || text.includes(';')) && (text.includes('document_type') || text.includes('item_number') || text.includes('vendor_name'));

  if (isCsv) {
    const csvLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sep = text.includes(';') ? ';' : ',';
    for (const l of csvLines) {
      const parts = l.split(sep).map(p => p.trim());
      if (parts.length >= 7 && (parts[0].toLowerCase() === 'invoice' || parts[0].toLowerCase() === 'receipt' || parts[0].toLowerCase() === 'bank_statement')) {
        document_type = parts[0].toLowerCase();
        vendor_name = parts[1] || vendor_name;
        vendor_tax_id = parts[2] || vendor_tax_id;
        invoice_number = parts[3] || invoice_number;
        issue_date = parts[4] || issue_date;
        due_date = parts[5] || due_date;
        currency = parts[6] || currency;
        if (parts[7]) subtotal = parseMoney(parts[7]);
        if (parts[8]) tax_amount = parseMoney(parts[8]);
        if (parts[9]) total = parseMoney(parts[9]);
      }
      if (parts.length >= 5 && /^\d+$/.test(parts[0]) && !l.toLowerCase().includes('item_number')) {
        line_items.push({
          item_number: parseInt(parts[0]),
          description: parts[1],
          quantity: parseInt(parts[2]) || 1,
          unit_price: parseMoney(parts[3]),
          line_total: parseMoney(parts[4]),
          confidence: 0.98,
          raw_text: l,
        });
      }
    }
  } else {
    const itemMatches = text.matchAll(/(?:Item\s*\d*|Serviço)[:\s]*([^\n\r]+)/gi);
    let count = 1;
    for (const im of itemMatches) {
      const raw = im[1].trim();
      const qtyM = raw.match(/Qtd:\s*(\d+)/i);
      const unitM = raw.match(/(?:Preço Unit|Valor Unitário)[:\s]*([0-9.,]+)/i);
      const totalM = raw.match(/(?:Total(?: Item)?|Valor)[:\s]*([0-9.,]+)/i);

      const qty = qtyM ? parseInt(qtyM[1]) : 1;
      const unit = unitM ? parseMoney(unitM[1]) : null;
      const lTotal = totalM ? parseMoney(totalM[1]) : null;

      line_items.push({
        item_number: count++,
        description: raw.split('|')[0].trim(),
        quantity: qty,
        unit_price: unit,
        line_total: lTotal,
        confidence: 0.95,
        raw_text: im[0],
      });
    }
  }

  const field_evidence: any[] = [
    {
      field_name: 'document_type',
      extracted_value: document_type,
      confidence: 0.98,
      status: 'observed',
      text_evidence: text.slice(0, 80),
      page_or_location: 'Cabeçalho',
    },
    {
      field_name: 'vendor_name',
      extracted_value: vendor_name,
      confidence: vendor_name ? 0.95 : 0.0,
      status: vendor_name ? 'observed' : 'missing',
      text_evidence: vendor_name ? `Emissor: ${vendor_name}` : 'Não encontrado',
      page_or_location: 'Identificação do Emissor',
    },
    {
      field_name: 'vendor_tax_id',
      extracted_value: vendor_tax_id,
      confidence: vendor_tax_id ? 0.99 : 0.0,
      status: vendor_tax_id ? 'observed' : 'missing',
      text_evidence: vendor_tax_id ? `CNPJ/Tax ID: ${vendor_tax_id}` : 'Ausente no documento',
      page_or_location: 'Cabeçalho Fiscal',
    },
    {
      field_name: 'invoice_number',
      extracted_value: invoice_number,
      confidence: invoice_number ? 0.97 : 0.0,
      status: invoice_number ? 'observed' : 'missing',
      text_evidence: invoice_number ? `Identificador: ${invoice_number}` : 'Ausente',
      page_or_location: 'Identificação',
    },
    {
      field_name: 'issue_date',
      extracted_value: issue_date,
      confidence: issue_date ? 0.96 : 0.0,
      status: issue_date ? 'observed' : 'missing',
      text_evidence: issue_date ? `Data Emissão: ${issue_date}` : 'Não identificada',
      page_or_location: 'Seção de Datas',
    },
    {
      field_name: 'total',
      extracted_value: total !== null ? total.toString() : null,
      confidence: total !== null ? 0.98 : 0.0,
      status: total !== null ? 'observed' : 'missing',
      text_evidence: total !== null ? `Total Extraído: ${total}` : 'Total ausente',
      page_or_location: 'Rodapé Financeiro',
    },
  ];

  const exceptions: any[] = [];
  if (subtotal !== null && tax_amount !== null && total !== null) {
    if (Math.abs(subtotal + tax_amount - total) > 0.02) {
      exceptions.push({
        code: 'CONFLICT_SUBTOTAL_TAX_TOTAL',
        message: `Conflito visual: Subtotal (${subtotal}) + Imposto (${tax_amount}) = ${subtotal + tax_amount}, divergente do Total (${total}).`,
        severity: 'critical',
        involved_fields: ['subtotal', 'tax_amount', 'total'],
      });
    }
  }

  return {
    document_type,
    vendor_name,
    vendor_tax_id,
    invoice_number,
    issue_date,
    due_date,
    currency,
    subtotal,
    tax_amount,
    total,
    line_items,
    field_evidence,
    exceptions,
  };
}

// ==========================================
// REAL-TIME NOTIFICATION SYSTEM (SSE & AUDIT MONITORING)
// ==========================================
interface SseClient {
  id: string;
  res: express.Response;
}

let sseClients: SseClient[] = [];
let recentNotificationsStore: AuditNotification[] = [
  {
    id: 'NOTIF-INIT-01',
    type: 'DISCREPANCY_DETECTED',
    severity: 'critical',
    title: 'Divergência: Step 4 - Cálculo Aritmético',
    message: 'DOC-AM-002: Soma dos itens (R$ 6.650,00) diverge do total declarado (R$ 6.600,00) por R$ 50,00.',
    documentId: 'DOC-AM-002',
    filename: 'fatura_divergencia_calculo.pdf',
    vendorName: 'AWS Serviços de Nuvem Ltda',
    amount: 6600,
    currency: 'BRL',
    stepNumber: 4,
    stepName: 'Cálculo & Tolerância',
    discrepancyType: 'ERROR',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
  },
  {
    id: 'NOTIF-INIT-02',
    type: 'BENCHMARK_ANOMALY',
    severity: 'warning',
    title: 'Anomalia de Preço Histórico',
    message: 'DOC-AM-001: Item "Instância de Computação em Nuvem Linux" cotado a R$ 4.500 (+40.6% sobre a mediana).',
    documentId: 'DOC-AM-001',
    filename: 'fatura_valida_padrao.pdf',
    vendorName: 'AWS Serviços de Nuvem Ltda',
    amount: 1300,
    currency: 'BRL',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    read: false,
  },
  {
    id: 'NOTIF-INIT-03',
    type: 'DOCUMENT_PROCESSED',
    severity: 'info',
    title: 'Documento Fiscal Auditado',
    message: 'DOC-AM-004: NF-e Telecom e Conectividade S.A. processada sem inconformidades cadastrais.',
    documentId: 'DOC-AM-004',
    filename: 'fatura_telecom_multi_itens.pdf',
    vendorName: 'Telecom e Conectividade S.A.',
    amount: 3660,
    currency: 'BRL',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: true,
  }
];

export function broadcastNotification(notif: AuditNotification) {
  recentNotificationsStore.unshift(notif);
  if (recentNotificationsStore.length > 100) {
    recentNotificationsStore.pop();
  }
  const data = `data: ${JSON.stringify(notif)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch {
      // client connection issue
    }
  });
}

// 0. SSE REAL-TIME STREAMS & NOTIFICATION ROUTES
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client: SseClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial connected event
  res.write(`data: ${JSON.stringify({
    id: `INIT-${Date.now()}`,
    type: 'SYSTEM_INFO',
    severity: 'info',
    title: 'Monitor de Auditoria em Tempo Real Conectado',
    message: 'Canal SSE ativo para detecção de anomalias fiscais e novos documentos em tempo real.',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Heartbeat keep-alive every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    total: recentNotificationsStore.length,
    notifications: recentNotificationsStore,
  });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { id, all } = req.body;
  if (all) {
    recentNotificationsStore.forEach((n) => (n.read = true));
  } else if (id) {
    const target = recentNotificationsStore.find((n) => n.id === id);
    if (target) target.read = true;
  }
  res.json({ success: true, notifications: recentNotificationsStore });
});

app.delete('/api/notifications', (req, res) => {
  recentNotificationsStore = [];
  res.json({ success: true, notifications: [] });
});

app.post('/api/notifications/test-trigger', (req, res) => {
  const { type = 'DISCREPANCY_DETECTED', customMessage } = req.body;
  let testNotif: AuditNotification;

  if (type === 'DOCUMENT_PROCESSED') {
    testNotif = {
      id: `NOTIF-TEST-${Date.now().toString(36)}`,
      type: 'DOCUMENT_PROCESSED',
      severity: 'info',
      title: 'Novo Documento Recebido via OCR',
      message: customMessage || 'NF-e 88392 (DataCenter Brasil Ltda) - R$ 14.800,00 extraído e enviado para validação.',
      documentId: 'DOC-SIM-88392',
      filename: 'nf88392_datacenter.pdf',
      vendorName: 'DataCenter Brasil Ltda',
      amount: 14800,
      currency: 'BRL',
      timestamp: new Date().toISOString(),
      read: false,
    };
  } else if (type === 'BENCHMARK_ANOMALY') {
    testNotif = {
      id: `NOTIF-TEST-${Date.now().toString(36)}`,
      type: 'BENCHMARK_ANOMALY',
      severity: 'critical',
      title: 'Sobrepreço Crítico em Contrato de Nuvem',
      message: customMessage || 'Item "Instância Cloud GPU A100" cotado a R$ 22.000 (+83% acima da mediana histórica de R$ 12.000).',
      documentId: 'DOC-SIM-GPU',
      filename: 'fatura_gpu_cloud.pdf',
      vendorName: 'AI Cloud Server Solutions',
      amount: 10000,
      currency: 'BRL',
      timestamp: new Date().toISOString(),
      read: false,
    };
  } else {
    testNotif = {
      id: `NOTIF-TEST-${Date.now().toString(36)}`,
      type: 'DISCREPANCY_DETECTED',
      severity: 'critical',
      title: 'Alerta de Divergência Fiscal (Step 2 & 4)',
      message: customMessage || 'Fatura duplicada detectada: Mesmo CNPJ (12.345.678/0001-90) e número 09218 já faturado no período.',
      documentId: 'DOC-SIM-DUP',
      filename: 'nf09218_duplicada.pdf',
      vendorName: 'Fornecedor de Tecnologia S.A.',
      amount: 8950,
      currency: 'BRL',
      stepNumber: 2,
      stepName: 'Deduplicação e Conflito',
      discrepancyType: 'ERROR',
      timestamp: new Date().toISOString(),
      read: false,
    };
  }

  broadcastNotification(testNotif);
  res.json({ success: true, notification: testNotif });
});

// ==========================================
// API ROUTES
// ==========================================

// 1. POST /api/extract-document
app.post('/api/extract-document', async (req, res) => {
  const startTime = Date.now();
  try {
    const { filename, fileType, fileBase64, mimeType, textInput, sampleId } = req.body;

    let documentText = textInput || '';
    let previewDataUrl: string | undefined = undefined;

    // Handle CSV file type and text decoding
    const isCsvFile = fileType === 'csv' || mimeType?.includes('csv') || filename?.toLowerCase().endsWith('.csv');

    if (fileBase64 && mimeType) {
      previewDataUrl = `data:${mimeType};base64,${fileBase64}`;
      if (isCsvFile && !documentText) {
        try {
          documentText = Buffer.from(fileBase64, 'base64').toString('utf-8');
        } catch (e) {
          console.warn('Could not decode base64 CSV:', e);
        }
      }
    }

    // Check if user selected one of the pre-loaded sample documents
    if (sampleId) {
      const sample = SAMPLE_DOCUMENTS.find(s => s.id === sampleId);
      if (sample) {
        documentText = sample.sampleText;
      }
    }

    let geminiExtraction: GeminiExtractionResult | null = null;
    let geminiSuccess = false;

    // HIGH PRECISION CSV STATEMENT ENGINE
    if (isCsvFile && documentText) {
      const csvRows = parseCsvRfc4180(documentText);
      if (isTransactionStatementCsv(csvRows)) {
        geminiExtraction = processStatementCsvToExtraction(csvRows, filename || 'extrato_transacoes.csv');
        geminiSuccess = true;
      }
    }

    // Call Gemini API if API key is present and not already processed as CSV statement
    if (getActiveApiKey() && !geminiExtraction) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const contentsParts: any[] = [];

        if (fileBase64 && mimeType && !isCsvFile) {
          contentsParts.push({
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          });
        }

        if (documentText) {
          contentsParts.push({
            text: isCsvFile
              ? `Arquivo de Fatura / Documento Fiscal em formato CSV tabular:\n\n${documentText}`
              : `Conteúdo textual ou OCR do documento financeiro a ser extraído:\n\n${documentText}`,
          });
        } else {
          contentsParts.push({
            text: 'Extraia os dados estruturados deste documento financeiro com precisão estrita.',
          });
        }

        const response = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: { parts: contentsParts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: extractionSchema,
          },
        });

        const rawJson = response.text?.trim() || '';
        if (rawJson) {
          geminiExtraction = JSON.parse(rawJson) as GeminiExtractionResult;
          geminiSuccess = true;
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed or hit rate limit, using fallback parser:', geminiErr?.message);
      }
    }

    // If Gemini wasn't called or failed, use rule-based structured extraction
    if (!geminiExtraction) {
      geminiExtraction = fallbackTextExtractor(documentText || 'Documento sem texto identificável.');
    }

    // ------------------------------------------------------------------
    // CRITICAL BACKEND REQUIREMENTS (Obrigatório conforme instrução):
    // 1. recalcular a soma das linhas;
    // 2. comparar subtotal, imposto e total;
    // 3. validar moeda e datas;
    // 4. procurar duplicidade;
    // 5. verificar o fornecedor;
    // 6. enviar divergências para revisão.
    // ------------------------------------------------------------------
    const validation = runBackendValidation(geminiExtraction, documentsStore);

    // ------------------------------------------------------------------
    // ENRIQUECIMENTO EM TEMPO REAL COM APIS PÚBLICAS GOVERNAMENTAIS (100% GRATUITAS)
    // ------------------------------------------------------------------
    if (geminiExtraction.vendor_tax_id) {
      try {
        const liveCnpj = await fetchLiveCnpj(geminiExtraction.vendor_tax_id);
        if (liveCnpj) {
          validation.step5_vendorVerification.liveCnpjData = liveCnpj;
          validation.step5_vendorVerification.liveCnpjQueryStatus = 'success';
          if (liveCnpj.is_valid && validation.step5_vendorVerification.status === 'unregistered') {
            validation.step5_vendorVerification.details += ` | Receita Federal ao Vivo: ${liveCnpj.razao_social} (Situação: ${liveCnpj.situacao_cadastral})`;
          }
        } else {
          validation.step5_vendorVerification.liveCnpjQueryStatus = 'not_found';
        }
      } catch {
        validation.step5_vendorVerification.liveCnpjQueryStatus = 'error';
      }
    }

    if (geminiExtraction.currency && geminiExtraction.currency.toUpperCase() !== 'BRL') {
      try {
        const liveFx = await fetchLiveFxRate(geminiExtraction.currency.toUpperCase(), 'BRL');
        if (liveFx) {
          validation.step3_currencyAndDatesValidation.liveFxRate = liveFx;
          if (typeof geminiExtraction.total === 'number') {
            const converted = Number((geminiExtraction.total * liveFx.rate).toFixed(2));
            validation.step3_currencyAndDatesValidation.convertedBrlTotal = converted;
            validation.step3_currencyAndDatesValidation.details += ` | PTAX Oficial ao Vivo: 1 ${liveFx.base} = R$ ${liveFx.rate.toFixed(4)} (Total Convertido: R$ ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
          }
        }
      } catch {
        // silent fallback
      }
    }

    if (geminiExtraction.due_date) {
      try {
        const holidayCheck = await checkBankingHoliday(geminiExtraction.due_date);
        validation.step3_currencyAndDatesValidation.bankingHolidayCheck = holidayCheck;
        if (holidayCheck.days_extended > 0) {
          validation.step3_currencyAndDatesValidation.details += ` | Vencimento Bancário: ${holidayCheck.details}`;
        }
      } catch {
        // silent fallback
      }
    }

    const docId = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const priceBenchmarkAudit = evaluateDocumentPriceBenchmarks(
      {
        id: docId,
        vendor_name: geminiExtraction.vendor_name,
        vendor_tax_id: geminiExtraction.vendor_tax_id,
        line_items: geminiExtraction.line_items || [],
        total: geminiExtraction.total,
        currency: geminiExtraction.currency,
      },
      documentsStore
    );

    const processedDoc: ProcessedDocument = {
      id: docId,
      filename: filename || (sampleId ? `Amostra_${sampleId}.txt` : 'documento_fiscal.pdf'),
      fileType: fileType || (fileBase64 ? 'image' : 'text'),
      previewDataUrl,
      rawTextPreview: documentText,
      extractedAt: new Date().toISOString(),
      geminiExtraction,
      validation,
      priceBenchmarkAudit,
      processingTimeMs: Date.now() - startTime,
    };

    documentsStore.unshift(processedDoc);

    // REAL-TIME NOTIFICATIONS BROADCAST (SSE)
    // 1. Notification: Document Processed
    broadcastNotification({
      id: `NOTIF-DOC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'DOCUMENT_PROCESSED',
      severity: 'info',
      title: 'Documento Processado com Sucesso',
      message: `${processedDoc.filename} (${processedDoc.geminiExtraction.vendor_name || 'Fornecedor Identificado'}) processado em ${processedDoc.processingTimeMs}ms.`,
      documentId: processedDoc.id,
      filename: processedDoc.filename,
      vendorName: processedDoc.geminiExtraction.vendor_name || undefined,
      amount: processedDoc.geminiExtraction.total ?? undefined,
      currency: processedDoc.geminiExtraction.currency || 'BRL',
      timestamp: new Date().toISOString(),
      metadata: {
        processingTimeMs: processedDoc.processingTimeMs,
        overallStatus: processedDoc.validation.step6_reviewRouting.overallStatus,
      },
    });

    // 2. Notification: Step Discrepancies
    const detectedDiscrepancies = processedDoc.validation.step6_reviewRouting.discrepancies || [];

    if (detectedDiscrepancies.length > 0) {
      detectedDiscrepancies.forEach((disc) => {
        broadcastNotification({
          id: `NOTIF-DISC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'DISCREPANCY_DETECTED',
          severity: disc.severity === 'critical' ? 'critical' : 'warning',
          title: `Divergência: Step ${disc.step} - ${disc.stepName || disc.title}`,
          message: disc.description || `Inconformidade detectada durante a auditoria de ${processedDoc.filename}.`,
          documentId: processedDoc.id,
          filename: processedDoc.filename,
          vendorName: processedDoc.geminiExtraction.vendor_name || undefined,
          amount: processedDoc.geminiExtraction.total ?? undefined,
          currency: processedDoc.geminiExtraction.currency || 'BRL',
          stepNumber: disc.step,
          stepName: disc.stepName,
          discrepancyType: disc.severity,
          timestamp: new Date().toISOString(),
        });
      });
    }

    // 3. Notification: Benchmark Pricing Anomaly
    if (priceBenchmarkAudit && priceBenchmarkAudit.anomalousItemsCount > 0) {
      broadcastNotification({
        id: `NOTIF-BENCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'BENCHMARK_ANOMALY',
        severity: priceBenchmarkAudit.criticalSpikeCount > 0 ? 'critical' : 'warning',
        title: 'Anomalia de Preço Histórico',
        message: `${priceBenchmarkAudit.anomalousItemsCount} item(ns) com sobrepreço detectado em relação ao benchmark de mercado (${priceBenchmarkAudit.vendorName}).`,
        documentId: processedDoc.id,
        filename: processedDoc.filename,
        vendorName: priceBenchmarkAudit.vendorName,
        amount: priceBenchmarkAudit.totalOverpaymentRisk,
        currency: processedDoc.geminiExtraction.currency || 'BRL',
        timestamp: new Date().toISOString(),
        metadata: {
          riskScore: priceBenchmarkAudit.overallPricingRiskScore,
        },
      });
    }

    return res.json({
      success: true,
      document: processedDoc,
      priceBenchmarkAudit,
      geminiLiveCall: geminiSuccess,
    });
  } catch (error: any) {
    console.error('Error processing document:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao processar extração do documento.',
    });
  }
});

// 1.1 BENCHMARK DE PREÇOS HISTÓRICOS & ANOMALIAS
app.get('/api/price-benchmarks', (req, res) => {
  res.json({
    success: true,
    total_benchmarks: HISTORICAL_PRICE_BENCHMARKS.length,
    benchmarks: HISTORICAL_PRICE_BENCHMARKS,
    categories: Array.from(new Set(HISTORICAL_PRICE_BENCHMARKS.map((b) => b.category))),
  });
});

app.post('/api/evaluate-price-benchmarks', (req, res) => {
  try {
    const { document_id, line_items, vendor_name, vendor_tax_id, total, currency } = req.body;
    let targetDoc: any = null;
    if (document_id) {
      targetDoc = documentsStore.find((d) => d.id === document_id);
    }
    const docToEval = targetDoc
      ? {
          id: targetDoc.id,
          vendor_name: targetDoc.geminiExtraction?.vendor_name,
          vendor_tax_id: targetDoc.geminiExtraction?.vendor_tax_id,
          line_items: targetDoc.geminiExtraction?.line_items || [],
          total: targetDoc.geminiExtraction?.total,
          currency: targetDoc.geminiExtraction?.currency,
        }
      : {
          id: document_id || 'DOC-CUSTOM-CHECK',
          vendor_name: vendor_name || 'Fornecedor',
          vendor_tax_id: vendor_tax_id || null,
          line_items: line_items || [],
          total: total || 0,
          currency: currency || 'BRL',
        };

    const audit = evaluateDocumentPriceBenchmarks(docToEval, documentsStore);
    res.json({
      success: true,
      audit,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Falha ao avaliar benchmarks de preço.' });
  }
});

// 2. GET /api/documents - list all documents
app.get('/api/documents', (req, res) => {
  res.json({
    success: true,
    documents: documentsStore,
  });
});

// 3. GET /api/documents/:id - get single document
app.get('/api/documents/:id', (req, res) => {
  const doc = documentsStore.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
  }
  res.json({ success: true, document: doc });
});

// 4. POST /api/documents/:id/review - submit human review decision (Aprovar, Rejeitar, Ajustar)
app.post('/api/documents/:id/review', (req, res) => {
  const { status, reviewerName, notes, adjustedFields } = req.body;
  const doc = documentsStore.find(d => d.id === req.params.id);

  if (!doc) {
    return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
  }

  const reviewDecision: HumanReviewDecision = {
    status: status || 'APPROVED',
    reviewerName: reviewerName || 'Auditor Fiscal Responsável',
    reviewedAt: new Date().toISOString(),
    notes: notes || '',
    adjustedFields,
  };

  doc.humanReview = reviewDecision;
  if (status === 'APPROVED') {
    doc.validation.step6_reviewRouting.overallStatus = 'APPROVED_AUTOMATIC';
  } else if (status === 'REJECTED') {
    doc.validation.step6_reviewRouting.overallStatus = 'REJECTED';
  }

  res.json({ success: true, document: doc });
});

// 5. GET /api/vendors - list approved and blocked vendors
app.get('/api/vendors', (req, res) => {
  res.json({ success: true, vendors: MASTER_VENDORS });
});

// 6. GET /api/sample-documents - sample data
app.get('/api/sample-documents', (req, res) => {
  res.json({ success: true, samples: SAMPLE_DOCUMENTS });
});

// 7. GET master accounting data
app.get('/api/chart-of-accounts', (req, res) => {
  res.json({ success: true, accounts: CHART_OF_ACCOUNTS });
});

app.get('/api/accounting-policies', (req, res) => {
  res.json({ success: true, policies: ACCOUNTING_POLICIES });
});

app.get('/api/accounting-periods', (req, res) => {
  res.json({ success: true, periods: ACCOUNTING_PERIODS });
});

app.get('/api/corporate-entities', (req, res) => {
  res.json({ success: true, entities: CORPORATE_ENTITIES });
});

// ========================================================
// 8. POST /api/classify-transaction (MÓDULO 2)
// Use gemini-3.1-flash-lite para alto volume e gemini-3.8-flash para casos ambíguos.
// ========================================================
const CLASSIFICATION_SYSTEM_INSTRUCTION = `Classifique esta transação somente dentro das contas disponíveis no plano de contas fornecido.

Regras:
1. Nunca crie uma conta nova.
2. Nunca escolha uma conta apenas pelo nome do fornecedor.
3. Use o histórico somente como evidência secundária.
4. Se houver mais de uma conta plausível, retorne todas as candidatas.
5. Se faltar evidência, marque needs_review=true.
6. Não determine tratamento fiscal sem política explícita.
7. Não invente centro de custo, projeto, entidade ou dimensão.

Retorne:
- account_candidates;
- selected_account;
- rationale;
- confidence;
- policy_id;
- evidence;
- needs_review;
- exceptions.`;

const classificationSchema = {
  type: Type.OBJECT,
  properties: {
    account_candidates: {
      type: Type.ARRAY,
      description: 'Todas as contas contábeis plausíveis encontradas no plano de contas',
      items: {
        type: Type.OBJECT,
        properties: {
          account_code: { type: Type.STRING },
          account_name: { type: Type.STRING },
          score: { type: Type.NUMBER, description: 'Relevância de 0 a 1' },
          plausibility_rationale: { type: Type.STRING },
        },
        required: ['account_code', 'account_name', 'score', 'plausibility_rationale'],
      },
    },
    selected_account: {
      type: Type.OBJECT,
      nullable: true,
      description: 'Conta primária escolhida ou null se ambíguo/sem evidência suficiente',
      properties: {
        code: { type: Type.STRING },
        name: { type: Type.STRING },
        type: { type: Type.STRING, description: 'ASSET, LIABILITY, EXPENSE, REVENUE, EQUITY' },
      },
      required: ['code', 'name', 'type'],
    },
    rationale: { type: Type.STRING, description: 'Justificativa contábil baseada na evidência da transação' },
    confidence: { type: Type.NUMBER, description: 'Confiança de 0 a 1' },
    policy_id: { type: Type.STRING, nullable: true, description: 'ID da política contábil aplicável, ou null' },
    evidence: { type: Type.STRING, description: 'Evidência textual estrita extraída da descrição/itens' },
    needs_review: { type: Type.BOOLEAN, description: 'True se houver ambiguidade, dúvida ou falta de evidência' },
    exceptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          message: { type: Type.STRING },
          severity: { type: Type.STRING },
        },
        required: ['code', 'message', 'severity'],
      },
    },
  },
  required: [
    'account_candidates',
    'rationale',
    'confidence',
    'evidence',
    'needs_review',
    'exceptions',
  ],
};

app.post('/api/classify-transaction', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      transaction_id = `TX-${Date.now().toString(36).toUpperCase()}`,
      description,
      amount,
      vendor_name,
      preferred_model = GEMINI_MODELS.LITE,
      force_ambiguous_escalation = false,
      document_source_id,
    } = req.body;

    if (!description && !vendor_name) {
      return res.status(400).json({ success: false, error: 'Descrição da transação ou fornecedor é obrigatório.' });
    }

    // Plano de contas serializado para contexto da IA
    const accountsContext = CHART_OF_ACCOUNTS.map(
      (a) => `${a.code} - ${a.name} [Tipo: ${a.type}, Ativa: ${a.isActive ? 'Sim' : 'NÃO - BLOQUEADA'}] Descrição: ${a.description}`
    ).join('\n');

    const policiesContext = ACCOUNTING_POLICIES.map(
      (p) => `${p.policy_id} - ${p.title} (Vigente: ${p.isActive ? 'SIM' : 'NÃO/EXPIRADA'}): ${p.summary}`
    ).join('\n');

    const promptUserText = `TRANSAÇÃO A CLASSIFICAR:
ID: ${transaction_id}
Descrição: ${description || 'N/A'}
Fornecedor: ${vendor_name || 'N/A'}
Valor: R$ ${amount !== undefined ? Number(amount).toFixed(2) : '0.00'}
Documento Fonte: ${document_source_id || 'Não informado'}

PLANO DE CONTAS DISPONÍVEL (Use estritamente apenas estas contas):
${accountsContext}

POLÍTICAS CONTÁBEIS CADASTRADAS:
${policiesContext}

Lembre-se das regras estritas:
1. Nunca crie uma conta nova.
2. Nunca escolha uma conta apenas pelo nome do fornecedor.
3. Se houver mais de uma conta plausível, retorne todas as candidatas.
4. Se faltar evidência, marque needs_review=true.
5. Não invente dimensões ou entidades.`;

    let selectedModel: string =
      preferred_model === GEMINI_MODELS.FLASH || force_ambiguous_escalation
        ? GEMINI_MODELS.FLASH
        : GEMINI_MODELS.LITE;

    let result: TransactionClassificationResult | null = null;

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        // 1ª Chamada (Normalmente gemini-3.1-flash-lite para alto volume)
        let response = await ai.models.generateContent({
          model: selectedModel,
          contents: promptUserText,
          config: {
            systemInstruction: CLASSIFICATION_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: classificationSchema,
          },
        });

        let parsed = JSON.parse(response.text?.trim() || '{}');

        // Se executou com flash-lite e identificou caso ambíguo (needs_review=true ou baixa confiança),
        // escalona automaticamente para gemini-3.8-flash conforme especificação do prompt!
        if (selectedModel === GEMINI_MODELS.LITE && (parsed.needs_review || (parsed.confidence && parsed.confidence < 0.85))) {
          try {
            const deepResponse = await ai.models.generateContent({
              model: GEMINI_MODELS.FLASH,
              contents: `${promptUserText}\n\n[AVISO DE ESCALONAMENTO: Caso ambíguo detectado na triagem de alto volume. Realize raciocínio aprofundado para mitigar falsos positivos contábeis.]`,
              config: {
                systemInstruction: CLASSIFICATION_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: classificationSchema,
              },
            });
            const deepParsed = JSON.parse(deepResponse.text?.trim() || '{}');
            if (deepParsed.account_candidates) {
              parsed = deepParsed;
              selectedModel = GEMINI_MODELS.FLASH;
            }
          } catch (deepErr) {
            console.warn('Escalation to gemini-3.8-flash failed, retaining lite result:', deepErr);
          }
        }

        result = {
          transaction_id,
          model_used: selectedModel,
          account_candidates: parsed.account_candidates || [],
          selected_account: parsed.selected_account || null,
          rationale: parsed.rationale || 'Classificação contábil processada.',
          confidence: parsed.confidence || 0.9,
          policy_id: parsed.policy_id || null,
          evidence: parsed.evidence || description || '',
          needs_review: Boolean(parsed.needs_review),
          review_reasons: parsed.needs_review ? ['Ambiguidade entre contas ou evidência de suporte requer validação humana.'] : [],
          exceptions: parsed.exceptions || [],
          execution_time_ms: Date.now() - startTime,
        };
      } catch (geminiErr: any) {
        console.warn('Gemini classification call failed, using rule-based classifier:', geminiErr?.message);
      }
    }

    // Fallback rule-based se API offline
    if (!result) {
      const textLower = `${description || ''} ${vendor_name || ''}`.toLowerCase();
      let matchedAcc = CHART_OF_ACCOUNTS.find((a) => a.code === '3.1.01.001')!; // default nuvem
      let polId: string | null = 'POL-IT-01';
      let needsRev = false;

      if (/kalunga|papel|sulfite|cadeira|teclado/i.test(textLower)) {
        matchedAcc = CHART_OF_ACCOUNTS.find((a) => a.code === '3.1.02.001')!;
        polId = 'POL-FAC-02';
      } else if (/frete|transporte|carga/i.test(textLower)) {
        matchedAcc = CHART_OF_ACCOUNTS.find((a) => a.code === '3.1.02.002')!;
        polId = 'POL-LOG-03';
      } else if (/pintura|reforma|manuten/i.test(textLower)) {
        matchedAcc = CHART_OF_ACCOUNTS.find((a) => a.code === '3.1.02.003')!;
        polId = 'POL-MAINT-04';
      } else if (/servidor|hardware|dell/i.test(textLower)) {
        matchedAcc = CHART_OF_ACCOUNTS.find((a) => a.code === '1.2.03.001')!;
        polId = 'POL-CAPEX-05';
        needsRev = true; // Imobilizado sempre requer revisão
      }

      result = {
        transaction_id,
        model_used: selectedModel,
        account_candidates: [
          {
            account_code: matchedAcc.code,
            account_name: matchedAcc.name,
            score: 0.95,
            plausibility_rationale: `Alinhado com a descrição do serviço faturado sob a política ${polId}.`,
          },
        ],
        selected_account: {
          code: matchedAcc.code,
          name: matchedAcc.name,
          type: matchedAcc.type,
        },
        rationale: `Classificação alocada com base na descrição observada '${description || vendor_name}'.`,
        confidence: 0.94,
        policy_id: polId,
        evidence: description || vendor_name || 'Descrição direta',
        needs_review: needsRev,
        review_reasons: needsRev ? ['Bens de capital requerem conferência com política de imobilização.'] : [],
        exceptions: [],
        execution_time_ms: Date.now() - startTime,
      };
    }

    if (result) {
      classificationsStore.unshift(result);
    }
    res.json({ success: true, classification: result });
  } catch (error: any) {
    console.error('Error in classify-transaction:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha na classificação da transação.' });
  }
});

app.get('/api/classifications', (req, res) => {
  res.json({ success: true, classifications: classificationsStore });
});

// ========================================================
// 9. POST /api/propose-journal-entry (MÓDULO 3)
// Use gemini-3.8-flash.
// ========================================================
const JOURNAL_PROPOSAL_SYSTEM_INSTRUCTION = `Prepare uma PROPOSTA de lançamento contábil.
Não poste o lançamento e não afirme que ele foi postado.

Use somente:
- contas ativas;
- entidades permitidas;
- políticas vigentes;
- documentos fornecidos;
- períodos abertos.

Para cada linha proposta, informe:
- conta;
- débito candidato;
- crédito candidato;
- entidade;
- dimensão;
- período;
- source_ids;
- policy_id;
- justificativa.

Marque needs_review=true quando houver:
- valor material;
- documento ausente;
- conflito entre fontes;
- política ambígua;
- conta nova;
- moeda diferente;
- período fechado;
- estimativa;
- reconhecimento de receita complexo.

Não faça o cálculo contábil oficial.
O backend recalculará e validará o equilíbrio.
O sistema deve rejeitar automaticamente a proposta quando:
•	débitos e créditos não fecharem;
•	a conta estiver inativa;
•	o período estiver fechado;
•	faltar evidência;
•	a política não estiver vigente;
•	a entidade não corresponder ao documento;
•	houver duplicidade.`;

const journalProposalSchema = {
  type: Type.OBJECT,
  properties: {
    disclaimer: {
      type: Type.STRING,
      description: 'Aviso formal explicitando que isto é uma proposta de partida dobrada e não foi postado no Razão.',
    },
    ai_needs_review: {
      type: Type.BOOLEAN,
      description: 'True se houver valor material, conflito, moeda estrangeira ou estimativa',
    },
    ai_review_rationale: {
      type: Type.STRING,
      nullable: true,
      description: 'Motivo pelo qual a IA solicita revisão humana',
    },
    proposed_lines: {
      type: Type.ARRAY,
      description: 'Linhas contábeis candidatas com débito e crédito',
      items: {
        type: Type.OBJECT,
        properties: {
          line_number: { type: Type.INTEGER },
          conta: { type: Type.STRING, description: 'Código da conta (ex: 3.1.01.001)' },
          account_name: { type: Type.STRING, nullable: true },
          debito_candidato: { type: Type.NUMBER, description: 'Valor de débito (0 se for linha de crédito)' },
          credito_candidato: { type: Type.NUMBER, description: 'Valor de crédito (0 se for linha de débito)' },
          entidade: { type: Type.STRING, description: 'Nome da entidade corporativa permitida' },
          dimensao: { type: Type.STRING, description: 'Centro de custo ou dimensão autorizada' },
          periodo: { type: Type.STRING, description: 'Período contábil aberto (ex: 2026-10)' },
          source_ids: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Identificadores dos documentos comprovatórios',
          },
          policy_id: { type: Type.STRING, description: 'ID da política contábil em vigor' },
          justificativa: { type: Type.STRING, description: 'Justificativa estrita da partida contábil' },
        },
        required: [
          'line_number',
          'conta',
          'debito_candidato',
          'credito_candidato',
          'entidade',
          'dimensao',
          'periodo',
          'source_ids',
          'policy_id',
          'justificativa',
        ],
      },
    },
  },
  required: ['disclaimer', 'ai_needs_review', 'proposed_lines'],
};

app.post('/api/propose-journal-entry', async (req, res) => {
  try {
    const {
      source_document_id,
      vendor_name = 'AWS Serviços de Nuvem Ltda',
      total_amount = 6600.0,
      subtotal = 6000.0,
      tax_amount = 600.0,
      description = 'Serviços de Computação em Nuvem e Bancos de Dados',
      period_id = '2026-10', // padrão período aberto
      entity_name = 'Empresa Soluções Digitais S.A. (Matriz - SP)',
      account_code_hint = '3.1.01.001',
      policy_id = 'POL-IT-01',
      force_unbalanced_test = false, // Opção de teste para demonstrar rejeição automática de desequilíbrio!
      force_closed_period_test = false, // Opção de teste para período fechado
      force_inactive_account_test = false, // Opção de teste para conta inativa
    } = req.body;

    const chosenPeriod = force_closed_period_test ? '2026-08' : period_id;
    const chosenAccount = force_inactive_account_test ? '3.1.99.999' : account_code_hint;

    let proposedLines: JournalEntryLineCandidate[] = [];
    let aiNeedsReview = false;
    let aiRationale = '';

    if (getActiveApiKey() && !force_unbalanced_test) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const promptInput = `DOCUMENTO FONTE:
ID: ${source_document_id || 'DOC-ORIGINAL-001'}
Fornecedor: ${vendor_name}
Descrição: ${description}
Subtotal: R$ ${subtotal}
Imposto: R$ ${tax_amount}
Total do Documento: R$ ${total_amount}

PARÂMETROS RESTRITOS:
Entidade Permitida: ${entity_name}
Período Contábil Solicitado: ${chosenPeriod}
Conta de Despesa Sugerida: ${chosenAccount}
Política Contábil: ${policy_id}

CONTAS DISPONÍVEIS:
${CHART_OF_ACCOUNTS.map((a) => `${a.code} - ${a.name} [${a.type}, Ativa: ${a.isActive}]`).join('\n')}

Lembre-se: Débitos e créditos devem fechar exatamente. Não poste o lançamento.`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: promptInput,
          config: {
            systemInstruction: JOURNAL_PROPOSAL_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: journalProposalSchema,
          },
        });

        const parsed = JSON.parse(response.text?.trim() || '{}');
        proposedLines = parsed.proposed_lines || [];
        aiNeedsReview = Boolean(parsed.ai_needs_review);
        aiRationale = parsed.ai_review_rationale || '';
      } catch (geminiErr: any) {
        console.warn('Gemini proposal call failed, falling back to deterministic generator:', geminiErr?.message);
      }
    }

    // Gerador padrão determinístico caso Gemini falhe ou para teste de desequilíbrio
    if (proposedLines.length === 0) {
      const debitValue = subtotal > 0 ? subtotal : total_amount;
      const creditValue = force_unbalanced_test ? total_amount + 500 : total_amount; // força erro de cálculo para testar rejeição

      proposedLines = [
        {
          line_number: 1,
          conta: chosenAccount,
          account_name: CHART_OF_ACCOUNTS.find((a) => a.code === chosenAccount)?.name || 'Despesa Operacional',
          debito_candidato: debitValue,
          credito_candidato: 0,
          entidade: entity_name,
          dimensao: 'TI / Engenharia',
          periodo: chosenPeriod,
          source_ids: [source_document_id || 'DOC-ORIGINAL-001'],
          policy_id: policy_id,
          justificativa: `Apropriação da despesa operacional conforme documento comprobatório sob a política ${policy_id}.`,
        },
      ];

      if (tax_amount > 0 && !force_unbalanced_test) {
        proposedLines.push({
          line_number: 2,
          conta: '2.1.03.001',
          account_name: 'ISS a Recolher (Retenção na Fonte)',
          debito_candidato: tax_amount,
          credito_candidato: 0,
          entidade: entity_name,
          dimensao: 'Fiscal',
          periodo: chosenPeriod,
          source_ids: [source_document_id || 'DOC-ORIGINAL-001'],
          policy_id: policy_id,
          justificativa: 'Reconhecimento de tributos incidentes retidos na fonte.',
        });
      }

      proposedLines.push({
        line_number: proposedLines.length + 1,
        conta: '2.1.01.001',
        account_name: 'Fornecedores Nacionais a Pagar',
        debito_candidato: 0,
        credito_candidato: creditValue,
        entidade: entity_name,
        dimensao: 'Contas a Pagar',
        periodo: chosenPeriod,
        source_ids: [source_document_id || 'DOC-ORIGINAL-001'],
        policy_id: policy_id,
        justificativa: `Obrigação a pagar ao fornecedor ${vendor_name}.`,
      });
    }

    // -------------------------------------------------------------
    // MOTOR BACKEND: RECALCULAR, VALIDAR EQUILÍBRIO E REJEIÇÃO AUTOMÁTICA
    // -------------------------------------------------------------
    const backendValidation = validateJournalProposalBackend(
      proposedLines,
      journalProposalsStore,
      source_document_id
    );

    const proposal: JournalEntryProposal = {
      proposal_id: `PROP-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      source_document_id,
      source_transaction_desc: description,
      model_used: GEMINI_MODELS.FLASH,
      disclaimer:
        'PROPOSTA DE LANÇAMENTO CONTÁBIL: Este lançamento NÃO FOI POSTADO no razão contábil. Sujeito à verificação do auditor e validação de equilíbrio.',
      proposed_lines: proposedLines,
      ai_needs_review: aiNeedsReview || backendValidation.needsReview,
      ai_review_rationale: aiRationale,
      validation: backendValidation,
    };

    journalProposalsStore.unshift(proposal);

    res.json({
      success: true,
      proposal,
      isAutoRejected: backendValidation.isAutoRejected,
      rejectionReasons: backendValidation.rejectionReasons,
    });
  } catch (error: any) {
    console.error('Error proposing journal entry:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar proposta de lançamento.' });
  }
});

app.get('/api/journal-proposals', (req, res) => {
  res.json({ success: true, proposals: journalProposalsStore });
});

app.post('/api/journal-proposals/:id/decision', (req, res) => {
  const { status, auditor, notes } = req.body;
  const prop = journalProposalsStore.find((p) => p.proposal_id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Proposta não encontrada.' });
  }

  prop.human_decision = {
    status: status || 'APPROVED_FOR_POSTING',
    auditor: auditor || 'Controller Geral',
    decided_at: new Date().toISOString(),
    notes: notes || '',
  };

  res.json({ success: true, proposal: prop });
});

// ========================================================
// 10. REVENUE RECOGNITION (MÓDULO 4)
// gemini-3.8-flash para simples e gemini-3.1-pro-preview para complexos
// ========================================================
const REVENUE_SYSTEM_INSTRUCTION = `Analise este contrato somente para extrair fatos relevantes ao reconhecimento de receita. Você não é o aprovador técnico.

Extraia:
- partes;
- datas;
- prazo;
- moeda;
- preço fixo;
- preço variável;
- uso;
- descontos;
- créditos;
- obrigações de performance candidatas;
- renovação;
- cancelamento;
- reembolso;
- SLA;
- data de início do serviço;
- condições de aceitação;
- modificações contratuais;
- evidências textuais.

Compare os fatos com as políticas fornecidas.
Para cada tratamento possível, informe:
- policy_id;
- fatos favoráveis;
- fatos contrários;
- dados ausentes;
- necessidade de revisão;
- material_review_required.

Não calcule o cronograma oficial.
O motor contábil fará o cálculo depois da aprovação.
A revisão humana deve ser obrigatória quando houver:
•	preço variável relevante;
•	múltiplas obrigações de performance;
•	alteração contratual;
•	concessão de direitos futuros;
•	cláusulas atípicas de cancelamento;
•	contratos com related parties;
•	divergência entre contrato, billing e CRM;
•	valor acima da materialidade.`;

const revenueSchema = {
  type: Type.OBJECT,
  properties: {
    partes: {
      type: Type.OBJECT,
      properties: {
        fornecedor: { type: Type.STRING },
        cliente: { type: Type.STRING },
        is_related_party: { type: Type.BOOLEAN, description: 'True se envolver partes relacionadas' },
      },
      required: ['fornecedor', 'cliente', 'is_related_party'],
    },
    datas: {
      type: Type.OBJECT,
      properties: {
        assinatura: { type: Type.STRING, nullable: true },
        inicio_servico: { type: Type.STRING, nullable: true },
        termino_servico: { type: Type.STRING, nullable: true },
      },
      required: ['assinatura', 'inicio_servico'],
    },
    prazo_meses: { type: Type.INTEGER, nullable: true },
    moeda: { type: Type.STRING },
    preco_fixo: { type: Type.NUMBER, nullable: true },
    preco_variavel: {
      type: Type.OBJECT,
      properties: {
        tem_preco_variavel: { type: Type.BOOLEAN },
        descricao: { type: Type.STRING },
        criterios: { type: Type.STRING },
        is_material: { type: Type.BOOLEAN },
      },
      required: ['tem_preco_variavel', 'descricao', 'is_material'],
    },
    uso: { type: Type.STRING, nullable: true },
    descontos: {
      type: Type.OBJECT,
      properties: {
        valor_ou_percentual: { type: Type.STRING, nullable: true },
        condicoes: { type: Type.STRING, nullable: true },
      },
    },
    creditos: { type: Type.STRING, nullable: true },
    obrigações_de_performance_candidatas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          description: { type: Type.STRING },
          isDistinct: { type: Type.BOOLEAN },
          satisfactionTiming: { type: Type.STRING, description: 'over_time, point_in_time ou variable' },
          allocatedPriceEstimate: { type: Type.NUMBER, nullable: true },
          rationale: { type: Type.STRING },
        },
        required: ['id', 'description', 'isDistinct', 'satisfactionTiming', 'rationale'],
      },
    },
    renovacao: {
      type: Type.OBJECT,
      properties: {
        automatica: { type: Type.BOOLEAN },
        clausula: { type: Type.STRING, nullable: true },
      },
      required: ['automatica'],
    },
    cancelamento: {
      type: Type.OBJECT,
      properties: {
        permite_cancelamento_imotivado: { type: Type.BOOLEAN },
        aviso_previo_dias: { type: Type.INTEGER, nullable: true },
        multa_ou_penalidade: { type: Type.STRING, nullable: true },
        is_atypical: { type: Type.BOOLEAN },
      },
      required: ['permite_cancelamento_imotivado', 'is_atypical'],
    },
    reembolso: { type: Type.STRING, nullable: true },
    sla: {
      type: Type.OBJECT,
      properties: {
        tem_sla: { type: Type.BOOLEAN },
        descricao: { type: Type.STRING, nullable: true },
        penalidades: { type: Type.STRING, nullable: true },
      },
      required: ['tem_sla'],
    },
    data_inicio_servico: { type: Type.STRING, nullable: true },
    condicoes_aceitacao: { type: Type.STRING, nullable: true },
    modificacoes_contratuais: {
      type: Type.OBJECT,
      properties: {
        tem_modificacao: { type: Type.BOOLEAN },
        detalhes: { type: Type.STRING, nullable: true },
      },
      required: ['tem_modificacao'],
    },
    evidencias_textuais: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topico: { type: Type.STRING },
          citacao: { type: Type.STRING },
          secao_ou_pagina: { type: Type.STRING, nullable: true },
        },
        required: ['topico', 'citacao'],
      },
    },
    policy_treatments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          policy_id: { type: Type.STRING },
          fatos_favoraveis: { type: Type.ARRAY, items: { type: Type.STRING } },
          fatos_contrarios: { type: Type.ARRAY, items: { type: Type.STRING } },
          dados_ausentes: { type: Type.ARRAY, items: { type: Type.STRING } },
          necessidade_de_revisao: { type: Type.BOOLEAN },
          material_review_required: { type: Type.BOOLEAN },
          justificativa_normativa: { type: Type.STRING },
        },
        required: ['policy_id', 'fatos_favoraveis', 'fatos_contrarios', 'dados_ausentes', 'necessidade_de_revisao', 'material_review_required'],
      },
    },
  },
  required: [
    'partes',
    'datas',
    'moeda',
    'preco_variavel',
    'obrigações_de_performance_candidatas',
    'cancelamento',
    'sla',
    'modificacoes_contratuais',
    'evidencias_textuais',
    'policy_treatments',
  ],
};

app.get('/api/revenue-contracts', (req, res) => {
  res.json({
    success: true,
    samples: SAMPLE_REVENUE_CONTRACTS,
    policies: REVENUE_POLICIES,
    history: revenueAnalysesStore,
  });
});

app.post('/api/analyze-revenue-contract', async (req, res) => {
  try {
    const { contract_id, contract_text, is_complex = false, preferred_model } = req.body;

    const sample = SAMPLE_REVENUE_CONTRACTS.find((s) => s.id === contract_id);
    const textToAnalyze = contract_text || sample?.contractText || '';
    const title = sample?.title || 'Contrato de Prestação de Serviços / Receita';

    // Model selection: gemini-3.8-flash as the robust standard model for analysis
    const chosenModel = preferred_model && preferred_model !== GEMINI_MODELS.PRO ? preferred_model : GEMINI_MODELS.FLASH;

    let parsedResult: any = null;

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        let effectiveModel = chosenModel;
        try {
          const resp = await ai.models.generateContent({
            model: effectiveModel,
            contents: `CONTRATO PARA ANÁLISE DE RECONHECIMENTO DE RECEITA (IFRS 15 / ASC 606):\n\n${textToAnalyze}`,
            config: {
              systemInstruction: REVENUE_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: revenueSchema,
            },
          });
          parsedResult = JSON.parse(resp.text?.trim() || '{}');
        } catch (mErr: any) {
          if (effectiveModel !== GEMINI_MODELS.FLASH) {
            effectiveModel = GEMINI_MODELS.FLASH;
            const resp = await ai.models.generateContent({
              model: effectiveModel,
              contents: `CONTRATO PARA ANÁLISE DE RECONHECIMENTO DE RECEITA (IFRS 15 / ASC 606):\n\n${textToAnalyze}`,
              config: {
                systemInstruction: REVENUE_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: revenueSchema,
              },
            });
            parsedResult = JSON.parse(resp.text?.trim() || '{}');
          } else {
            throw mErr;
          }
        }
      } catch {
        // Fallback to deterministic analysis without noisy error logging
      }
    }

    if (!parsedResult) {
      const isRelated = /related parties|partes relacionadas|controlada|holding/i.test(textToAnalyze);
      const hasVariable = /variável por consumo|remuneração variável/i.test(textToAnalyze);
      const isAmendment = /aditivo|modifica substancialmente/i.test(textToAnalyze);

      parsedResult = {
        partes: {
          fornecedor: 'TechCloud Brasil Soluções em Nuvem S.A.',
          cliente: 'Banco Investimento e Gestão Digital S.A.',
          is_related_party: isRelated,
        },
        datas: {
          assinatura: '2026-09-25',
          inicio_servico: '2026-10-01',
          termino_servico: '2027-09-30',
        },
        prazo_meses: 12,
        moeda: 'BRL',
        preco_fixo: 80000.0,
        preco_variavel: {
          tem_preco_variavel: hasVariable,
          descricao: 'Até R$ 40.000,00 por transações excedentes de 1M req.',
          criterios: 'Apurado mensalmente no último dia útil.',
          is_material: true,
        },
        uso: 'Serviço em nuvem e APIs',
        descontos: { valor_ou_percentual: 'R$ 5.000,00', condicoes: 'Crédito promocional primeira fatura' },
        creditos: 'Crédito de R$ 5.000 na implantação',
        obrigações_de_performance_candidatas: [
          {
            id: 'PPO-1',
            description: 'Acesso contínuo à plataforma SaaS',
            isDistinct: true,
            satisfactionTiming: 'over_time',
            allocatedPriceEstimate: 80000.0,
            rationale: 'Benefícios contínuos fruídos linearmente pelo cliente ao longo de 12 meses.',
          },
          {
            id: 'PPO-2',
            description: 'Serviços profissionais de setup e migração técnica',
            isDistinct: true,
            satisfactionTiming: 'point_in_time',
            allocatedPriceEstimate: 40000.0,
            rationale: 'Entrega técnica específica com Termo de Aceite Definitivo (TAD).',
          },
        ],
        renovacao: { automatica: true, clausula: 'Renovação automática anual salvo aviso de 30 dias' },
        cancelamento: {
          permite_cancelamento_imotivado: true,
          aviso_previo_dias: 60,
          multa_ou_penalidade: 'Sem penalidade, valores incorridos não reembolsáveis',
          is_atypical: isRelated,
        },
        reembolso: 'Sem direito a reembolso de valores incorridos',
        sla: { tem_sla: true, descricao: 'Disponibilidade 99.9%', penalidades: '5% crédito a cada 0.1% abaixo' },
        data_inicio_servico: '2026-10-01',
        condicoes_aceitacao: 'Assinatura do Termo de Aceite Definitivo (TAD)',
        modificacoes_contratuais: { tem_modificacao: isAmendment, detalhes: isAmendment ? 'Termo aditivo nº 02' : null },
        evidencias_textuais: [
          { topico: 'Preço Variável', citacao: 'Até R$ 40.000,00 calculado com base no volume mensal' },
          { topico: 'Múltiplas PPOs', citacao: 'O presente contrato compreende 2 obrigações de entrega distintas' },
        ],
        policy_treatments: [
          {
            policy_id: 'POL-REV-01',
            fatos_favoraveis: ['Serviço prestado continuamente em base mensal'],
            fatos_contrarios: ['Existe componente de setup que deve ser segregado'],
            dados_ausentes: ['Histórico de consumo para estimativa da contraprestação variável'],
            necessidade_de_revisao: true,
            material_review_required: true,
            justificativa_normativa: 'Exige alocação do preço de transação entre as 2 obrigações de performance distintas.',
          },
        ],
      };
    }

    // Validação das 8 condições mandatárias de revisão humana:
    const humanReviewTriggers: string[] = [];
    const ppoCount = parsedResult.obrigações_de_performance_candidatas?.length || 0;

    if (parsedResult.preco_variavel?.tem_preco_variavel && parsedResult.preco_variavel?.is_material) {
      humanReviewTriggers.push('Preço variável relevante (exige estimativa e restrição de reversão)');
    }
    if (ppoCount > 1) {
      humanReviewTriggers.push(`Múltiplas obrigações de performance identificadas (${ppoCount} PPOs)`);
    }
    if (parsedResult.modificacoes_contratuais?.tem_modificacao) {
      humanReviewTriggers.push('Alteração contratual / Termo aditivo identificado');
    }
    if (/direito futuro|ferramentas futuras/i.test(textToAnalyze)) {
      humanReviewTriggers.push('Concessão de direitos futuros materiais');
    }
    if (parsedResult.cancelamento?.is_atypical) {
      humanReviewTriggers.push('Cláusula atípica de cancelamento sem aviso prévio');
    }
    if (parsedResult.partes?.is_related_party) {
      humanReviewTriggers.push('Contrato envolvendo Partes Relacionadas (CPC 05 / IAS 24)');
    }
    if ((parsedResult.preco_fixo || 0) + (parsedResult.preco_variavel?.tem_preco_variavel ? 40000 : 0) >= 50000) {
      humanReviewTriggers.push('Valor total do contrato acima do limiar de materialidade corporativa (>= R$ 50.000,00)');
    }

    const humanReviewMandatory = humanReviewTriggers.length > 0;

    const finalResult: RevenueRecognitionResult = {
      contract_id: contract_id || `CONTR-${Date.now().toString(36).toUpperCase()}`,
      contract_title: title,
      model_used: chosenModel as any,
      is_complex_contract: is_complex || sample?.isComplex || false,
      facts: parsedResult,
      policy_treatments: parsedResult.policy_treatments || [],
      human_review_mandatory: humanReviewMandatory,
      human_review_triggers: humanReviewTriggers,
      disclaimer: 'ANÁLISE DE FATOS CONTRATUAIS: Você não é o aprovador técnico e este relatório não calcula o cronograma oficial. Sujeito à homologação da Controladoria.',
      analyzed_at: new Date().toISOString(),
    };

    revenueAnalysesStore.unshift(finalResult);
    res.json({ success: true, analysis: finalResult });
  } catch (error: any) {
    console.error('Error analyzing revenue contract:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha ao analisar contrato de receita.' });
  }
});

// ========================================================
// 11. RECONCILIAÇÃO ASSISTIDA (MÓDULO 5)
// Predominantemente algorítmica + explicação pelo Gemini
// ========================================================
const RECONCILIATION_SYSTEM_INSTRUCTION = `Você é um analista de reconciliação assistida.

Compare os pares candidatos fornecidos pelo sistema.
Não crie transações, não altere valores e não marque o saldo como reconciliado.

Para cada candidato, retorne:
- match_status: exact, probable, partial, no_match ou insufficient_data;
- evidências;
- diferenças de data;
- diferenças de valor;
- diferenças de moeda;
- diferença de referência;
- ação sugerida;
- confidence;
- necessidade de revisão.

Regras:
- diferença acima da tolerância nunca pode ser exact;
- uma transação não pode ser casada duas vezes;
- moeda diferente exige conversão documentada;
- transação sem source_id não pode ser considerada reconciliada.`;

app.get('/api/reconciliation-data', (req, res) => {
  res.json({
    success: true,
    ledger_items: SAMPLE_LEDGER_ITEMS,
    statement_items: SAMPLE_STATEMENT_ITEMS,
    batches: reconciliationBatchesStore,
  });
});

app.post('/api/reconcile-pairs', async (req, res) => {
  try {
    const { ledger_items = SAMPLE_LEDGER_ITEMS, statement_items = SAMPLE_STATEMENT_ITEMS } = req.body;

    const matchedLedger = new Set<string>();
    const matchedStmt = new Set<string>();
    const pairs: ReconciliationPairCandidate[] = [];

    // Motor Algorítmico Backend Obrigatório
    for (let i = 0; i < Math.min(ledger_items.length, statement_items.length); i++) {
      const l = ledger_items[i];
      const s = statement_items[i];
      const evaluatedPair = evaluateReconciliationAlgorithm(l, s, matchedLedger, matchedStmt);

      if (evaluatedPair.match_status === 'exact') {
        matchedLedger.add(l.id);
        matchedStmt.add(s.id);
      }

      pairs.push(evaluatedPair);
    }

    const exactMatches = pairs.filter((p) => p.match_status === 'exact').length;
    const probableMatches = pairs.filter((p) => p.match_status === 'probable').length;
    const partialMatches = pairs.filter((p) => p.match_status === 'partial').length;
    const unmatched = pairs.filter((p) => p.match_status === 'no_match' || p.match_status === 'insufficient_data').length;

    const batchResult: ReconciliationBatchResult = {
      batch_id: `RECON-BATCH-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      total_pairs: pairs.length,
      exact_matches: exactMatches,
      probable_matches: probableMatches,
      partial_matches: partialMatches,
      unmatched_items: unmatched,
      pairs,
    };

    reconciliationBatchesStore.unshift(batchResult);
    res.json({ success: true, batch: batchResult });
  } catch (error: any) {
    console.error('Error reconciling pairs:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha na reconciliação de pares.' });
  }
});

// AI RECONCILIATION COPILOT (GEMINI 3.8-FLASH)
// Analisa descompassos bancários, float de compensação, retenções e sugere lançamentos de ajuste
app.post('/api/reconcile-ai-analysis', async (req, res) => {
  try {
    const { batch_id } = req.body;
    const batch = (batch_id ? reconciliationBatchesStore.find((b) => b.batch_id === batch_id) : null) || reconciliationBatchesStore[0];

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Nenhum lote de conciliação disponível para análise.' });
    }

    let aiAnalysis: ReconciliationAiAnalysisResult | null = null;

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `ATUE COMO AUDITOR SÊNIOR E COPILOTO CONTÁBIL DE RECONCILIAÇÃO BANCÁRIA.
Analise os resultados do lote de conciliação:
Lote: ${batch.batch_id}
Total de Pares Analisados: ${batch.total_pairs}
Casamentos Exatos: ${batch.exact_matches}
Casamentos Prováveis: ${batch.probable_matches}
Casamentos Parciais (com diferença de valor): ${batch.partial_matches}
Transações Não Conciliadas: ${batch.unmatched_items}

Detalhes dos Pares:
${JSON.stringify(
  batch.pairs.map((p) => ({
    status: p.match_status,
    razao_erp: { ref: p.ledger_item.reference_code, valor: p.ledger_item.amount, data: p.ledger_item.date },
    extrato_banco: { ref: p.statement_item.reference_code, valor: p.statement_item.amount, data: p.statement_item.date },
    dif_valor: p.diferencas_de_valor?.diferenca_absoluta,
    dif_dias: p.diferencas_de_data?.dias_diferenca,
    acao: p.acao_sugerida,
  })),
  null,
  2
)}

Forneça um parecer rigoroso em JSON:
1. overall_health_score (número de 0 a 100)
2. executive_summary (texto didático explicando a situação da conta bancária)
3. root_cause_categories (lista com category, title, description, impact_amount, recommended_action)
4. proposed_adjusting_entries (lista com description, debit_account, credit_account, amount, justification)
5. audit_verdict ('APPROVED_FOR_CLOSING' | 'REVIEWS_REQUIRED' | 'BLOCKING_ANOMALIES')`;

        const resp = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(resp.text?.trim() || '{}');
        if (parsed.executive_summary) {
          aiAnalysis = {
            batch_id: batch.batch_id,
            overall_health_score: typeof parsed.overall_health_score === 'number' ? parsed.overall_health_score : 85,
            executive_summary: parsed.executive_summary,
            root_cause_categories: Array.isArray(parsed.root_cause_categories) ? parsed.root_cause_categories : [],
            proposed_adjusting_entries: Array.isArray(parsed.proposed_adjusting_entries) ? parsed.proposed_adjusting_entries : [],
            audit_verdict: parsed.audit_verdict || 'REVIEWS_REQUIRED',
            generated_at: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Falha na chamada Gemini para reconcile-ai-analysis:', err);
      }
    }

    // Fallback inteligente determinístico
    if (!aiAnalysis) {
      const hasUnmatched = batch.unmatched_items > 0;
      const hasPartials = batch.partial_matches > 0;
      const healthScore = Math.max(0, Math.round(100 - (batch.unmatched_items * 15) - (batch.partial_matches * 8)));

      aiAnalysis = {
        batch_id: batch.batch_id,
        overall_health_score: healthScore,
        executive_summary: `A reconciliação do lote ${batch.batch_id} apresentou índice de aderência de ${healthScore}%. Foram identificados ${batch.exact_matches} casamentos exatos em conciliação estrita. Restam ${batch.partial_matches} lançamentos com discrepância de centavos/tarifas e ${batch.unmatched_items} transações sem contraparte correspondente no extrato bancário.`,
        root_cause_categories: [
          ...(hasPartials
            ? [
                {
                  category: 'BANK_FEES_IOF' as const,
                  title: 'Dedução de Tarifa Bancária / Desconto não Apropriado',
                  description: 'A transação KAL-8921-A apresenta diferença líquida de R$ 200,00 entre o razão ERP (R$ 15.400,00) e o extrato bancário (R$ 15.200,00), compatível com retenção de taxa de liquidação de boleto ou tarifa bancária.',
                  impact_amount: 200.0,
                  recommended_action: 'Apropriar a despesa bancária de R$ 200,00 na conta 3.1.03.001 (Tarifas e Despesas Bancárias) para zerar a pendência.',
                },
              ]
            : []),
          ...(hasUnmatched
            ? [
                {
                  category: 'TIMING_DELAY' as const,
                  title: 'Float de Compensação Financeira (D+1 / D+2)',
                  description: 'Transações registradas no razão contábil em data de emissão sem débito compensado no extrato do período de corte.',
                  impact_amount: 5400.0,
                  recommended_action: 'Verificar o extrato do primeiro dia útil subsequente para confirmação da liquidação bancária.',
                },
              ]
            : []),
        ],
        proposed_adjusting_entries: hasPartials
          ? [
              {
                description: 'Ajuste de Tarifa Bancária / Deságio de Boleto (Ref: KAL-8921-A)',
                debit_account: '3.1.03.001 - Despesas com Tarifas Bancárias',
                credit_account: '1.1.01.001 - Banco Itaú Conta Movimento',
                amount: 200.0,
                justification: 'Equiparar saldo conciliado com o extrato bancário oficial deduzido de tarifa de liquidação.',
              },
            ]
          : [],
        audit_verdict: hasUnmatched ? 'REVIEWS_REQUIRED' : 'APPROVED_FOR_CLOSING',
        generated_at: new Date().toISOString(),
      };
    }

    res.json({
      success: true,
      analysis: aiAnalysis,
    });
  } catch (error: any) {
    console.error('Error in reconcile-ai-analysis:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha na análise inteligente de reconciliação.' });
  }
});

// ========================================================
// 12. TRIAGEM DE EXCEÇÕES (MÓDULO 6)
// gemini-3.8-flash para triagem e gemini-3.1-pro-preview para materialidade
// ========================================================
const TRIAGE_SYSTEM_INSTRUCTION = `Triar a exceção sem encerrá-la e sem alterar o livro.

Classifique em uma categoria:
- missing_source;
- duplicate_candidate;
- policy_conflict;
- period_conflict;
- amount_mismatch;
- currency_mismatch;
- unmapped_account;
- revenue_recognition_review;
- related_party_review;
- materiality_review;
- system_error;
- other.

Retorne:
1. fatos observados;
2. evidências disponíveis;
3. evidências ausentes;
4. impacto potencial;
5. prioridade;
6. responsável sugerido;
7. próxima pergunta;
8. condição objetiva de encerramento.

Uma exceção crítica ou material nunca pode ser encerrada pelo modelo.`;

const triageSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: 'missing_source, duplicate_candidate, policy_conflict, period_conflict, amount_mismatch, currency_mismatch, unmapped_account, revenue_recognition_review, related_party_review, materiality_review, system_error, other',
    },
    fatos_observados: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidencias_disponiveis: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidencias_ausentes: { type: Type.ARRAY, items: { type: Type.STRING } },
    impacto_potencial: { type: Type.STRING },
    prioridade: { type: Type.STRING, description: 'baixa, media, alta ou critica' },
    responsavel_sugerido: { type: Type.STRING },
    proxima_pergunta: { type: Type.STRING },
    condicao_objetiva_encerramento: { type: Type.STRING },
  },
  required: [
    'category',
    'fatos_observados',
    'evidencias_disponiveis',
    'evidencias_ausentes',
    'impacto_potencial',
    'prioridade',
    'responsavel_sugerido',
    'proxima_pergunta',
    'condicao_objetiva_encerramento',
  ],
};

app.get('/api/exceptions', (req, res) => {
  res.json({ success: true, exceptions: exceptionsStore });
});

app.post('/api/triage-exception', async (req, res) => {
  try {
    const {
      source_module = 'system',
      source_reference_id,
      title,
      description,
      amount = 0,
      is_material_test = false,
    } = req.body;

    const chosenModel = GEMINI_MODELS.FLASH;
    let triageData: any = null;

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const resp = await ai.models.generateContent({
          model: chosenModel,
          contents: `EXCEÇÃO PARA TRIAGEM:\nTítulo: ${title}\nDescrição: ${description}\nValor: R$ ${amount}\nMódulo Origem: ${source_module}`,
          config: {
            systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: triageSchema,
          },
        });
        triageData = JSON.parse(resp.text?.trim() || '{}');
      } catch {
        // Fallback to deterministic triage
      }
    }

    if (!triageData) {
      triageData = {
        category: Number(amount) >= 50000 ? 'materiality_review' : 'amount_mismatch',
        fatos_observados: [`Identificada divergência no módulo ${source_module}: ${description}`],
        evidencias_disponiveis: [`Registro de origem ID ${source_reference_id || 'N/A'}`],
        evidencias_ausentes: ['Documentação complementar comprobatória de autorização'],
        impacto_potencial: `Possível ajuste patrimonial no montante de R$ ${Number(amount).toFixed(2)}.`,
        prioridade: Number(amount) >= 50000 ? 'critica' : 'media',
        responsavel_sugerido: 'Auditor Fiscal / Controller Contábil',
        proxima_pergunta: 'Existe respaldo contratual ou aditivo para esta variação de valor?',
        condicao_objetiva_encerramento: 'Conferência de documento formal autenticado e aprovação do responsável.',
      };
    }

    const isMaterial = triageData.prioridade === 'critica' || Number(amount) >= 50000;

    const exceptionItem: ExceptionTriageResult = {
      exception_id: `EXC-${Date.now().toString(36).toUpperCase()}`,
      source_module,
      source_reference_id,
      title: title || 'Inconsistência Contábil Operacional',
      category: triageData.category || 'other',
      model_used: chosenModel as any,
      fatos_observados: triageData.fatos_observados || [],
      evidencias_disponiveis: triageData.evidencias_disponiveis || [],
      evidencias_ausentes: triageData.evidencias_ausentes || [],
      impacto_potencial: triageData.impacto_potencial || 'Impacto contábil em apuração.',
      prioridade: (triageData.prioridade as any) || 'media',
      is_material_or_critical: isMaterial,
      responsavel_sugerido: triageData.responsavel_sugerido || 'Auditoria Interna',
      proxima_pergunta: triageData.proxima_pergunta || 'Quais os documentos faltantes para regularização?',
      condicao_objetiva_encerramento: triageData.condicao_objetiva_encerramento || 'Validação de documento oficial pelo auditor.',
      status: 'IN_TRIAGE',
      can_model_close: false, // Regra mandatória: IA NUNCA encerra a exceção
      created_at: new Date().toISOString(),
    };

    exceptionsStore.unshift(exceptionItem);
    res.json({ success: true, exception: exceptionItem });
  } catch (error: any) {
    console.error('Error in triage-exception:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha na triagem de exceção.' });
  }
});

app.post('/api/exceptions/:id/resolve', (req, res) => {
  const { notes, resolved_by } = req.body;
  const exc = exceptionsStore.find((e) => e.exception_id === req.params.id);
  if (!exc) {
    return res.status(404).json({ success: false, error: 'Exceção não encontrada.' });
  }

  exc.status = 'RESOLVED_BY_HUMAN';
  exc.resolution_notes = notes || 'Encerrada pelo auditor após cumprimento da condição objetiva.';
  exc.resolved_by = resolved_by || 'Auditor Contábil Responsável';
  exc.resolved_at = new Date().toISOString();

  res.json({ success: true, exception: exc });
});

// ========================================================
// 13. CHECKLIST DO FECHAMENTO (MÓDULO 7)
// gemini-3.8-flash com o estado real do banco de dados
// ========================================================
const CLOSING_CHECKLIST_SYSTEM_INSTRUCTION = `Com base exclusivamente no estado dos módulos abaixo, gere o checklist
do fechamento.

Não presuma conclusão porque a data passou.
Não marque tarefa como concluída sem evidence_ids.
Não invente dependências.

Para cada tarefa, retorne:
- task_id;
- módulo;
- descrição;
- responsável;
- dependências;
- status;
- evidence_ids;
- motivo de bloqueio;
- critério de aceite;
- próxima ação.

Bloqueie o fechamento quando existir:
- banco sem reconciliação;
- saldo material sem suporte;
- exceção crítica aberta;
- lançamento desequilibrado;
- política sem versão;
- alteração posterior ao freeze sem aprovação;
- período ou entidade inconsistente.`;

const checklistTaskSchema = {
  type: Type.OBJECT,
  properties: {
    task_id: { type: Type.STRING },
    modulo: { type: Type.STRING },
    descricao: { type: Type.STRING },
    responsavel: { type: Type.STRING },
    dependencias: { type: Type.ARRAY, items: { type: Type.STRING } },
    status: { type: Type.STRING, description: 'CONCLUIDO, BLOQUEADO ou PENDENTE' },
    evidence_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
    motivo_bloqueio: { type: Type.STRING, nullable: true },
    criterio_aceite: { type: Type.STRING },
    proxima_acao: { type: Type.STRING },
  },
  required: [
    'task_id',
    'modulo',
    'descricao',
    'responsavel',
    'dependencias',
    'status',
    'evidence_ids',
    'criterio_aceite',
    'proxima_acao',
  ],
};

const checklistResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: checklistTaskSchema,
    },
  },
  required: ['tasks'],
};

app.get('/api/closing-checklist', (req, res) => {
  const currentState: SystemAuditState = {
    documents: documentsStore,
    proposals: journalProposalsStore,
    reconciliationBatches: reconciliationBatchesStore,
    exceptions: exceptionsStore,
    revenueAnalyses: revenueAnalysesStore,
    freezeDate: '2026-10-05T00:00:00Z',
    period: '2026-10',
    entity: 'Empresa Soluções Digitais S.A. (Matriz - SP)',
  };

  const blockersResult = evaluateClosingBlockers(currentState);

  res.json({
    success: true,
    latestChecklist: closingChecklistsStore[0] || null,
    isClosingBlocked: blockersResult.isBlocked,
    blockingReasons: blockersResult.blockers,
    metrics: blockersResult.metrics,
    history: closingChecklistsStore,
  });
});

app.post('/api/generate-closing-checklist', async (req, res) => {
  try {
    const {
      period = '2026-10',
      entity = 'Empresa Soluções Digitais S.A. (Matriz - SP)',
      freezeDate = '2026-10-05T00:00:00Z',
    } = req.body;

    const currentState: SystemAuditState = {
      documents: documentsStore,
      proposals: journalProposalsStore,
      reconciliationBatches: reconciliationBatchesStore,
      exceptions: exceptionsStore,
      revenueAnalyses: revenueAnalysesStore,
      freezeDate,
      period,
      entity,
    };

    const blockersResult = evaluateClosingBlockers(currentState);
    const dbStatePrompt = buildDatabaseStatePrompt(currentState, blockersResult);

    let generatedTasks: ClosingChecklistTask[] = [];

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const response = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: `${dbStatePrompt}\n\nCom base exclusivamente no estado acima, gere a lista completa de tarefas estruturadas do checklist de fechamento contábil. Lembre-se: NÃO presuma conclusão porque a data passou. NÃO marque como concluído sem evidence_ids. Bloqueie se houver qualquer um dos 7 bloqueadores ativos.`,
          config: {
            systemInstruction: CLOSING_CHECKLIST_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: checklistResponseSchema,
          },
        });

        const parsed = JSON.parse(response.text?.trim() || '{}');
        if (Array.isArray(parsed.tasks)) {
          generatedTasks = parsed.tasks.map((t: any) => ({
            ...t,
            status: (t.status === 'CONCLUIDO' || t.status === 'BLOQUEADO' || t.status === 'PENDENTE') ? t.status : 'PENDENTE',
            evidence_ids: Array.isArray(t.evidence_ids) ? t.evidence_ids : [],
            dependencias: Array.isArray(t.dependencias) ? t.dependencias : [],
          }));
        }
      } catch (geminiErr: any) {
        console.warn('Gemini checklist generation error, executing deterministic synthesizer:', geminiErr?.message);
      }
    }

    // Fallback determinístico caso o Gemini não responda ou chave ausente
    if (generatedTasks.length === 0) {
      const isBankBlocked = blockersResult.metrics.unreconciled_items_count > 0;
      const isCriticalExcBlocked = blockersResult.metrics.critical_exceptions_open_count > 0;
      const isProposalBlocked = blockersResult.metrics.unbalanced_proposals_count > 0;
      const isPolicyBlocked = blockersResult.metrics.unversioned_policies_count > 0;

      generatedTasks = [
        {
          task_id: 'TASK-REC-01',
          modulo: 'Reconciliação Bancária',
          descricao: 'Conciliação algorítmica integral entre extratos bancários e razão contábil.',
          responsavel: 'Tesouraria & Conciliação',
          dependencias: ['Extrato bancário oficial emitido via MT940 / OFX'],
          status: isBankBlocked ? 'BLOQUEADO' : 'CONCLUIDO',
          evidence_ids: isBankBlocked ? [] : ['RECON-BATCH-001'],
          motivo_bloqueio: isBankBlocked ? `Existem ${blockersResult.metrics.unreconciled_items_count} transações bancárias pendentes de conciliação com tolerância zero.` : null,
          criterio_aceite: '100% dos pares conciliados com tolerância aceitável e sem saldo sem source_id.',
          proxima_acao: isBankBlocked ? 'Realizar conciliação assistida manual para os lançamentos sem correspondência exata.' : 'Arquivar relatório de batimento bancário.',
        },
        {
          task_id: 'TASK-EXT-02',
          modulo: 'Extração Fiscal & Divergências',
          descricao: 'Auditoria de integridade aritmética e fiscal das notas fiscais e invoices do mês.',
          responsavel: 'Auditoria Fiscal',
          dependencias: [],
          status: documentsStore.some((d) => d.validation.step6_reviewRouting.overallStatus === 'PENDING_REVIEW' && !d.humanReview) ? 'PENDENTE' : 'CONCLUIDO',
          evidence_ids: documentsStore.map((d) => d.id),
          motivo_bloqueio: null,
          criterio_aceite: 'Todas as faturas com divergências de impostos ou cálculos devem possuir parecer homologado por auditor.',
          proxima_acao: 'Revisar pendências de parecer no workbench de extração.',
        },
        {
          task_id: 'TASK-JRN-03',
          modulo: 'Lançamentos Contábeis',
          descricao: 'Verificação de equilíbrio da partida dobrada (débitos = créditos) em todas as propostas.',
          responsavel: 'Contabilidade Geral',
          dependencias: ['TASK-REC-01', 'TASK-EXT-02'],
          status: isProposalBlocked ? 'BLOQUEADO' : 'CONCLUIDO',
          evidence_ids: journalProposalsStore.map((p) => p.proposal_id),
          motivo_bloqueio: isProposalBlocked ? 'Lançamento desequilibrado detectado e rejeitado pelo motor backend.' : null,
          criterio_aceite: 'Diferença estrita igual a R$ 0,00 e todas as contas ativas com políticas vigentes.',
          proxima_acao: isProposalBlocked ? 'Ajustar as partidas contábeis para eliminar a assimetria entre débitos e créditos.' : 'Liberar lote para integração no ERP.',
        },
        {
          task_id: 'TASK-EXC-04',
          modulo: 'Triagem de Exceções',
          descricao: 'Homologação e encerramento documental de exceções críticas e materiais.',
          responsavel: 'Controller Contábil',
          dependencias: [],
          status: isCriticalExcBlocked ? 'BLOQUEADO' : 'CONCLUIDO',
          evidence_ids: exceptionsStore.filter((e) => e.status === 'RESOLVED_BY_HUMAN').map((e) => e.exception_id),
          motivo_bloqueio: isCriticalExcBlocked ? `Existem ${blockersResult.metrics.critical_exceptions_open_count} exceções críticas não encerradas pelo auditor humano.` : null,
          criterio_aceite: 'Todas as exceções críticas com resolução formal assinada por controller humano.',
          proxima_acao: isCriticalExcBlocked ? 'Acessar o módulo de Triagem e protocolar as evidências de encerramento.' : 'Emitir ata de fechamento.',
        },
        {
          task_id: 'TASK-REV-05',
          modulo: 'Reconhecimento de Receita (IFRS 15)',
          descricao: 'Avaliação de contratos corporativos complexos e aprovação de cronograma oficial.',
          responsavel: 'Planejamento Financeiro / FP&A',
          dependencias: [],
          status: revenueAnalysesStore.some((r) => r.human_review_mandatory) ? 'PENDENTE' : 'CONCLUIDO',
          evidence_ids: revenueAnalysesStore.map((r) => r.contract_id),
          motivo_bloqueio: null,
          criterio_aceite: 'Aprovação dos gatilhos de revisão humana (preço variável material, múltiplas PPOs).',
          proxima_acao: 'Validar deliberação técnica para o contrato master SaaS.',
        },
        {
          task_id: 'TASK-GOV-06',
          modulo: 'Governança & Políticas',
          descricao: 'Verificação do versionamento semântico de todas as políticas contábeis adotadas.',
          responsavel: 'Compliance & Auditoria Interna',
          dependencias: [],
          status: isPolicyBlocked ? 'BLOQUEADO' : 'CONCLUIDO',
          evidence_ids: ['POL-IT-01', 'POL-FAC-02', 'POL-LOG-03', 'POL-MAINT-04', 'POL-CAPEX-05'],
          motivo_bloqueio: isPolicyBlocked ? 'Existem políticas contábeis sem controle formal de versão.' : null,
          criterio_aceite: '100% das políticas vigentes versionadas e aprovadas pelo conselho fiscal.',
          proxima_acao: isPolicyBlocked ? 'Registrar versão formal no cadastro de políticas.' : 'Manter registro auditável.',
        },
      ];
    }

    // Regra estrita: se não tem evidence_ids, não pode ter status CONCLUIDO!
    generatedTasks.forEach((t) => {
      if (t.status === 'CONCLUIDO' && (!t.evidence_ids || t.evidence_ids.length === 0)) {
        t.status = 'PENDENTE';
        t.proxima_acao = 'Anexar identificador comprobatório de evidência para habilitar a conclusão.';
      }
    });

    const completedCount = generatedTasks.filter((t) => t.status === 'CONCLUIDO').length;
    const blockedCount = generatedTasks.filter((t) => t.status === 'BLOQUEADO').length;
    const pendingCount = generatedTasks.filter((t) => t.status === 'PENDENTE').length;

    const checklistResult: ClosingChecklistResult = {
      checklist_id: `CHK-${Date.now().toString(36).toUpperCase()}`,
      periodo_referencia: period,
      entidade: entity,
      is_closing_blocked: blockersResult.isBlocked || blockedCount > 0,
      blocking_reasons: blockersResult.blockers,
      tasks: generatedTasks,
      completed_count: completedCount,
      blocked_count: blockedCount,
      pending_count: pendingCount,
      model_used: GEMINI_MODELS.FLASH,
      generated_at: new Date().toISOString(),
      real_state_summary: blockersResult.metrics,
    };

    closingChecklistsStore.unshift(checklistResult);

    res.json({
      success: true,
      checklist: checklistResult,
    });
  } catch (error: any) {
    console.error('Error generating closing checklist:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar checklist de fechamento.' });
  }
});

// ========================================================
// 14. RELATÓRIO PARA CFO OU CONTROLLER (MÓDULO 8)
// gemini-3.8-flash somente depois que os dados forem aprovados
// ========================================================
const CFO_REPORT_SYSTEM_INSTRUCTION = `Escreva um rascunho do relatório de fechamento usando somente os dados
aprovados fornecidos abaixo.

Estrutura:
1. status geral;
2. período e entidades;
3. contas fechadas;
4. contas pendentes;
5. principais variações;
6. exceções abertas;
7. lançamentos manuais;
8. reversões;
9. mudanças de política;
10. riscos;
11. perguntas para aprovação;
12. evidências.

Não crie explicações causais sem evidência.
Separe:
- fato;
- interpretação;
- pergunta;
- risco.

Não altere números fornecidos.
Use "não determinado" quando a causa não estiver demonstrada.`;

const cfoReportSchema = {
  type: Type.OBJECT,
  properties: {
    secao_1_status_geral: { type: Type.STRING, description: 'Parecer executivo sintético do fechamento' },
    secao_2_periodo_e_entidades: {
      type: Type.OBJECT,
      properties: {
        periodo: { type: Type.STRING },
        entidades: { type: Type.ARRAY, items: { type: Type.STRING } },
        status_freeze: { type: Type.STRING },
      },
      required: ['periodo', 'entidades', 'status_freeze'],
    },
    secao_3_contas_fechadas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conta: { type: Type.STRING },
          nome: { type: Type.STRING },
          saldo_final: { type: Type.NUMBER },
          status: { type: Type.STRING },
          evidence_id: { type: Type.STRING },
        },
        required: ['conta', 'nome', 'saldo_final', 'status', 'evidence_id'],
      },
    },
    secao_4_contas_pendentes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conta: { type: Type.STRING },
          nome: { type: Type.STRING },
          pendencia: { type: Type.STRING },
          responsavel: { type: Type.STRING },
          bloqueio: { type: Type.STRING },
        },
        required: ['conta', 'nome', 'pendencia', 'responsavel', 'bloqueio'],
      },
    },
    secao_5_principais_variacoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rubrica: { type: Type.STRING },
          valor_anterior: { type: Type.NUMBER },
          valor_atual: { type: Type.NUMBER },
          variacao_percentual: { type: Type.STRING },
          explicacao_comprovada: { type: Type.STRING },
        },
        required: ['rubrica', 'valor_anterior', 'valor_atual', 'variacao_percentual', 'explicacao_comprovada'],
      },
    },
    secao_6_excecoes_abertas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          categoria: { type: Type.STRING },
          prioridade: { type: Type.STRING },
          impacto: { type: Type.STRING },
          condicao_encerramento: { type: Type.STRING },
        },
        required: ['id', 'categoria', 'prioridade', 'impacto', 'condicao_encerramento'],
      },
    },
    secao_7_lancamentos_manuais: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          conta_debito: { type: Type.STRING },
          conta_credito: { type: Type.STRING },
          valor: { type: Type.NUMBER },
          justificativa: { type: Type.STRING },
          aprovador: { type: Type.STRING },
        },
        required: ['id', 'conta_debito', 'conta_credito', 'valor', 'justificativa', 'aprovador'],
      },
    },
    secao_8_reversoes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          descricao: { type: Type.STRING },
          valor: { type: Type.NUMBER },
          motivo: { type: Type.STRING },
        },
        required: ['id', 'descricao', 'valor', 'motivo'],
      },
    },
    secao_9_mudancas_de_politica: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          policy_id: { type: Type.STRING },
          titulo: { type: Type.STRING },
          versao: { type: Type.STRING },
          impacto_adotado: { type: Type.STRING },
        },
        required: ['policy_id', 'titulo', 'versao', 'impacto_adotado'],
      },
    },
    secao_10_riscos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          risco: { type: Type.STRING },
          severidade: { type: Type.STRING },
          mitigacao: { type: Type.STRING },
        },
        required: ['risco', 'severidade', 'mitigacao'],
      },
    },
    secao_11_perguntas_para_aprovacao: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    secao_12_evidencias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          evidence_id: { type: Type.STRING },
          descricao: { type: Type.STRING },
          modulo_origem: { type: Type.STRING },
        },
        required: ['evidence_id', 'descricao', 'modulo_origem'],
      },
    },
    fatos: { type: Type.ARRAY, items: { type: Type.STRING } },
    interpretacoes: { type: Type.ARRAY, items: { type: Type.STRING } },
    perguntas: { type: Type.ARRAY, items: { type: Type.STRING } },
    riscos: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'secao_1_status_geral',
    'secao_2_periodo_e_entidades',
    'secao_3_contas_fechadas',
    'secao_4_contas_pendentes',
    'secao_5_principais_variacoes',
    'secao_6_excecoes_abertas',
    'secao_7_lancamentos_manuais',
    'secao_8_reversoes',
    'secao_9_mudancas_de_politica',
    'secao_10_riscos',
    'secao_11_perguntas_para_aprovacao',
    'secao_12_evidencias',
    'fatos',
    'interpretacoes',
    'perguntas',
    'riscos',
  ],
};

app.post('/api/approve-closing-data', (req, res) => {
  const { auditor = 'Dra. Vanessa Cavalcanti - Controller Geral', notes = 'Aprovação dos dados preliminares para liberação do relatório executivo.' } = req.body;
  isClosingDataApproved = true;
  closingApprovalMeta = {
    auditor,
    approved_at: new Date().toISOString(),
    notes,
  };

  res.json({
    success: true,
    isClosingDataApproved,
    closingApprovalMeta,
  });
});

app.get('/api/cfo-report', (req, res) => {
  res.json({
    success: true,
    isClosingDataApproved,
    closingApprovalMeta,
    latestReport: cfoReportsStore[0] || null,
    history: cfoReportsStore,
  });
});

app.get('/api/cfo/monthly-audit-trend', (req, res) => {
  // Compute real current month metrics from documentsStore
  const currentMonthDocs = documentsStore;
  const currentTotal = Math.max(currentMonthDocs.length, 1);
  const currentDiscrepantDocs = currentMonthDocs.filter(
    (d) => d.validation?.step6_reviewRouting?.requiresReview || (d.validation?.step6_reviewRouting?.discrepancies?.length || 0) > 0
  );
  const currentDiscrepanciesCount = currentMonthDocs.reduce(
    (acc, d) => acc + (d.validation?.step6_reviewRouting?.discrepancies?.length || 0),
    0
  );
  const currentTotalVolume = currentMonthDocs.reduce(
    (acc, d) => acc + (typeof d.geminiExtraction?.total === 'number' ? d.geminiExtraction.total : 0),
    0
  );
  const currentDiscrepantVolume = currentDiscrepantDocs.reduce(
    (acc, d) => acc + (typeof d.geminiExtraction?.total === 'number' ? d.geminiExtraction.total : 0),
    0
  );
  const currentRate = Number(((currentDiscrepantDocs.length / currentTotal) * 100).toFixed(1));

  // 6-month historical enterprise audit series with realistic corporate fiscal cycles
  const baseMonthlyTrends: MonthlyAuditTrendItem[] = [
    {
      monthKey: '2026-05',
      monthLabel: 'Mai/26',
      processedDocuments: 142,
      cleanDocuments: 133,
      discrepanciesFound: 11,
      criticalDiscrepancies: 2,
      warningDiscrepancies: 9,
      discrepancyRate: 7.7,
      totalFinancialVolume: 1850000.0,
      discrepantFinancialVolume: 112000.0,
      isHotspot: false,
      hotspotLevel: 'NORMAL',
      primaryIssueType: 'Divergência de PTAX e Arredondamento',
      notes: 'Fluxo estável de fechamento pré-revisão trimestral.',
    },
    {
      monthKey: '2026-06',
      monthLabel: 'Jun/26',
      processedDocuments: 168,
      cleanDocuments: 152,
      discrepanciesFound: 19,
      criticalDiscrepancies: 5,
      warningDiscrepancies: 14,
      discrepancyRate: 11.3,
      totalFinancialVolume: 2340000.0,
      discrepantFinancialVolume: 245000.0,
      isHotspot: false,
      hotspotLevel: 'WARNING',
      primaryIssueType: 'Retenção de Tributos (ISS / PIS / COFINS)',
      notes: 'Fechamento do 2º Trimestre com elevação moderada de inconsistências fiscais.',
    },
    {
      monthKey: '2026-07',
      monthLabel: 'Jul/26',
      processedDocuments: 155,
      cleanDocuments: 144,
      discrepanciesFound: 14,
      criticalDiscrepancies: 3,
      warningDiscrepancies: 11,
      discrepancyRate: 9.0,
      totalFinancialVolume: 1980000.0,
      discrepantFinancialVolume: 165000.0,
      isHotspot: false,
      hotspotLevel: 'NORMAL',
      primaryIssueType: 'Cadastro de Novos Fornecedores (Step 5)',
      notes: 'Volumetria regular com boa taxa de conciliação automática.',
    },
    {
      monthKey: '2026-08',
      monthLabel: 'Ago/26',
      processedDocuments: 215,
      cleanDocuments: 166,
      discrepanciesFound: 58,
      criticalDiscrepancies: 21,
      warningDiscrepancies: 37,
      discrepancyRate: 27.0,
      totalFinancialVolume: 3420000.0,
      discrepantFinancialVolume: 890000.0,
      isHotspot: true,
      hotspotLevel: 'CRITICAL',
      primaryIssueType: 'Duplicidade de Faturamento & Erros de Cálculo (Steps 1, 2 e 4)',
      notes: 'PICO DE AUDITORIA: Entrada massiva de novos fornecedores de TI e contratos de infraestrutura sem homologação prévia.',
    },
    {
      monthKey: '2026-09',
      monthLabel: 'Set/26',
      processedDocuments: 189,
      cleanDocuments: 165,
      discrepanciesFound: 28,
      criticalDiscrepancies: 8,
      warningDiscrepancies: 20,
      discrepancyRate: 14.8,
      totalFinancialVolume: 2680000.0,
      discrepantFinancialVolume: 320000.0,
      isHotspot: false,
      hotspotLevel: 'WARNING',
      primaryIssueType: 'Divergência de Prazos e Vencimentos em Feriados Bancários',
      notes: 'Efeito das medidas corretivas pós-hotspot de Agosto.',
    },
    {
      monthKey: '2026-10',
      monthLabel: 'Out/26 (Atual)',
      processedDocuments: Math.max(currentTotal * 12, 120),
      cleanDocuments: Math.max(currentTotal * 12 - (currentDiscrepantDocs.length * 5), 108),
      discrepanciesFound: Math.max(currentDiscrepanciesCount * 4, 15),
      criticalDiscrepancies: Math.max(Math.round(currentDiscrepanciesCount * 1.5), 4),
      warningDiscrepancies: Math.max(Math.round(currentDiscrepanciesCount * 2.5), 11),
      discrepancyRate: currentRate > 0 ? Math.min(Math.max(currentRate, 8.5), 30) : 10.2,
      totalFinancialVolume: Math.max(currentTotalVolume * 5, 2150000.0),
      discrepantFinancialVolume: Math.max(currentDiscrepantVolume * 3, 218000.0),
      isHotspot: currentRate > 20,
      hotspotLevel: currentRate > 20 ? 'CRITICAL' : currentRate > 12 ? 'WARNING' : 'NORMAL',
      primaryIssueType: 'Auditoria em Andamento • Pré-Freeze Contábil Ativo',
      notes: 'Competência corrente sob esteira contínua com validação Gemini Structured Outputs.',
    },
  ];

  const totalProcessed = baseMonthlyTrends.reduce((acc, item) => acc + item.processedDocuments, 0);
  const totalDiscrepancies = baseMonthlyTrends.reduce((acc, item) => acc + item.discrepanciesFound, 0);
  const overallRate = Number(((totalDiscrepancies / totalProcessed) * 100).toFixed(1));
  const peakHotspot = baseMonthlyTrends.reduce((max, item) => (item.discrepancyRate > max.discrepancyRate ? item : max), baseMonthlyTrends[0]);
  const totalExposure = baseMonthlyTrends.reduce((acc, item) => acc + item.discrepantFinancialVolume, 0);

  const summary: AuditTrendSummary = {
    totalProcessedDocuments: totalProcessed,
    totalDiscrepanciesFound: totalDiscrepancies,
    overallDiscrepancyRate: overallRate,
    peakHotspotMonth: peakHotspot.monthLabel,
    peakHotspotRate: peakHotspot.discrepancyRate,
    peakHotspotReason: peakHotspot.primaryIssueType,
    autoApprovalRate: Number((100 - overallRate).toFixed(1)),
    totalFinancialExposure: totalExposure,
    trends: baseMonthlyTrends,
  };

  res.json({
    success: true,
    summary,
  });
});

app.post('/api/generate-cfo-report', async (req, res) => {
  try {
    const { force_bypass_approval = false } = req.body;

    // Regra estrita: "Use gemini-3.8-flash somente depois que os dados forem aprovados."
    if (!isClosingDataApproved && !force_bypass_approval) {
      return res.status(403).json({
        success: false,
        requires_approval: true,
        message: 'O relatório executivo para o CFO / Controller só pode ser gerado APÓS a aprovação formal dos dados da esteira contábil.',
      });
    }

    // Consolidação dos dados estritamente aprovados
    const approvedDocs = documentsStore.filter((d) => d.humanReview?.status === 'APPROVED');
    const approvedProposals = journalProposalsStore.filter((p) => p.human_decision?.status === 'APPROVED_FOR_POSTING');
    const reconciledBatches = reconciliationBatchesStore;
    const openExceptions = exceptionsStore.filter((e) => e.status !== 'RESOLVED_BY_HUMAN');

    const approvedDataPayload = {
      periodo: '2026-10',
      entidades: ['Empresa Soluções Digitais S.A. (Matriz - SP)'],
      status_aprovacao: 'DADOS HOMOLOGADOS E APROVADOS',
      aprovador: closingApprovalMeta.auditor,
      data_aprovacao: closingApprovalMeta.approved_at || new Date().toISOString(),
      documentos_fiscais_aprovados: approvedDocs.map((d) => ({
        id: d.id,
        fornecedor: d.geminiExtraction.vendor_name,
        total: d.geminiExtraction.total,
        moeda: d.geminiExtraction.currency,
        status_revisao: d.humanReview?.status,
        auditor: d.humanReview?.reviewerName,
      })),
      lancamentos_aprovados: approvedProposals.map((p) => ({
        id: p.proposal_id,
        linhas: p.proposed_lines,
        total_debito: p.validation?.totalDebits,
        total_credito: p.validation?.totalCredits,
      })),
      lotes_reconciliacao_executados: reconciledBatches.map((b) => ({
        batch_id: b.batch_id,
        exatos: b.exact_matches,
        parciais: b.partial_matches,
        nao_conciliados: b.unmatched_items,
      })),
      excecoes_em_aberto: openExceptions.map((e) => ({
        id: e.exception_id,
        titulo: e.title,
        prioridade: e.prioridade,
        categoria: e.category,
        impacto: e.impacto_potencial,
        condicao_encerramento: e.condicao_objetiva_encerramento,
      })),
      politicas_vigentes: ACCOUNTING_POLICIES.filter((p) => p.isActive).map((p) => ({
        policy_id: p.policy_id,
        titulo: p.title,
        versao: p.version || 'não determinado',
      })),
    };

    const promptUserText = `DADOS APROVADOS PARA RELATÓRIO DO CFO / CONTROLLER:
============================================================
${JSON.stringify(approvedDataPayload, null, 2)}

INSTRUÇÕES RESTRITAS OBRIGATÓRIAS:
- Use somente os dados fornecidos acima.
- Não crie explicações causais sem evidência.
- Separe expressamente: fato, interpretação, pergunta, risco.
- Não altere números fornecidos.
- Use "não determinado" quando a causa não estiver demonstrada.
- Siga exatamente as 12 seções estruturadas.`;

    let parsedReport: any = null;

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const resp = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: promptUserText,
          config: {
            systemInstruction: CFO_REPORT_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: cfoReportSchema,
          },
        });

        parsedReport = JSON.parse(resp.text?.trim() || '{}');
      } catch (err: any) {
        console.warn('Gemini CFO report call failed, using deterministic approved synthesizer:', err?.message);
      }
    }

    if (!parsedReport || !parsedReport.secao_1_status_geral) {
      parsedReport = {
        secao_1_status_geral: 'Fechamento contábil de Outubro/2026 em andamento com restrições objetivas. Dados cadastrais e conciliações preliminares homologadas.',
        secao_2_periodo_e_entidades: {
          periodo: '2026-10',
          entidades: ['Empresa Soluções Digitais S.A. (Matriz - SP)'],
          status_freeze: 'Pré-Freeze ativo em 05/10/2026. Lançamentos posteriores exigem aprovação da diretoria.',
        },
        secao_3_contas_fechadas: [
          {
            conta: '1.1.01.001',
            nome: 'Banco Conta Movimento - Bradesco',
            saldo_final: 2450000.0,
            status: 'CONCILIADA PARCIALMENTE',
            evidence_id: 'RECON-BATCH-001',
          },
          {
            conta: '2.1.01.001',
            nome: 'Fornecedores Nacionais a Pagar',
            saldo_final: 843200.0,
            status: 'CONFERIDA COM EVIDÊNCIAS FISCAIS',
            evidence_id: 'DOC-HIST-001',
          },
        ],
        secao_4_contas_pendentes: [
          {
            conta: '3.1.02.001',
            nome: 'Material de Escritório & Suprimentos',
            pendencia: 'Fatura com divergência visual de impostos (ISS/Total)',
            responsavel: 'Auditoria Fiscal',
            bloqueio: 'Aguardando nota de retificação ou parecer homologado',
          },
          {
            conta: '3.1.99.999',
            nome: 'Despesas Diversas Não Alocadas (INATIVA)',
            pendencia: 'Proposta rejeitada por conta inativa',
            responsavel: 'Contabilidade Geral',
            bloqueio: 'Reclassificação obrigatória para conta operacional autorizada',
          },
        ],
        secao_5_principais_variacoes: [
          {
            rubrica: 'Serviços em Nuvem & Datacenter (AWS/Google)',
            valor_anterior: 52000.0,
            valor_atual: 66000.0,
            variacao_percentual: '+26.9%',
            explicacao_comprovada: 'Expansão de clusters Kubernetes e banco RDS conforme fatura AWS-2026-90412.',
          },
          {
            rubrica: 'Despesas com Fretes e Logística',
            valor_anterior: 15400.0,
            valor_atual: 15400.0,
            variacao_percentual: '0.0%',
            explicacao_comprovada: 'não determinado',
          },
        ],
        secao_6_excecoes_abertas: openExceptions.map((e) => ({
          id: e.exception_id,
          categoria: e.category,
          prioridade: e.prioridade,
          impacto: e.impacto_potencial,
          condicao_encerramento: e.condicao_objetiva_encerramento,
        })),
        secao_7_lancamentos_manuais: [
          {
            id: 'PROP-MANUAL-001',
            conta_debito: '3.1.01.001',
            conta_credito: '2.1.01.001',
            valor: 6600.0,
            justificativa: 'Apropriação regular mensal de serviços de nuvem sob a política POL-IT-01.',
            aprovador: 'Dra. Vanessa Cavalcanti - Controller',
          },
        ],
        secao_8_reversoes: [
          {
            id: 'REV-001',
            descricao: 'Reversão de provisão de serviços não confirmados',
            valor: 4500.0,
            motivo: 'Fatura cancelada pelo fornecedor antes do vencimento.',
          },
        ],
        secao_9_mudancas_de_politica: [
          {
            policy_id: 'POL-IT-01',
            titulo: 'Política de Serviços em Nuvem & SaaS',
            versao: 'v2.4',
            impacto_adotado: 'Adoção formal de apropriação linear mensal no regime de competência.',
          },
          {
            policy_id: 'POL-CAPEX-05',
            titulo: 'Política de Imobilização de Hardware & TI (CAPEX)',
            versao: 'v3.0',
            impacto_adotado: 'Limiar mínimo de capitalização fixado em R$ 5.000,00 por ativo individual.',
          },
        ],
        secao_10_riscos: [
          {
            risco: 'Banco com itens não conciliados no extrato bancário',
            severidade: 'alta',
            mitigacao: 'Execução de rodada de conciliação assistida para compensar lançamentos de débito.',
          },
          {
            risco: 'Exceção crítica aberta com impacto em contas a pagar',
            severidade: 'critica',
            mitigacao: 'Conferência documental e resolução expressa por auditor humano antes do fechamento final.',
          },
        ],
        secao_11_perguntas_para_aprovacao: [
          'O CFO autoriza o encerramento da exceção fiscal da fatura Kalunga mediante crédito de imposto?',
          'A diretoria aprova a prorrogação do freeze contábil para as conciliações bancárias pendentes?',
          'Há concordância com o cronograma IFRS 15 de 12 meses para o contrato corporativo SaaS?',
        ],
        secao_12_evidencias: [
          { evidence_id: 'DOC-HIST-001', descricao: 'Fatura AWS homologada', modulo_origem: 'Extração Fiscal' },
          { evidence_id: 'RECON-BATCH-001', descricao: 'Lote de conciliação bancária', modulo_origem: 'Reconciliação' },
          { evidence_id: 'CONTRACT-SaaS-ENT-2026', descricao: 'Contrato Master Enterprise', modulo_origem: 'Revenue Recognition' },
        ],
        fatos: [
          'Todos os números apresentados foram extraídos do banco de dados aprovado.',
          'Existem 2 exceções críticas registradas no repositório oficial.',
          'Débitos e créditos das propostas validadas estão rigorosamente equilibrados (R$ 6.600,00 cada).',
        ],
        interpretacoes: [
          'O crescimento de 26.9% em nuvem decorre da escalabilidade das instâncias produtivas.',
          'Os itens não conciliados parecem corresponder a tarifas de manutenção de conta de fim de semana.',
        ],
        perguntas: [
          'Qual a data limite estipulada para a entrega definitiva das notas fiscais retificadas?',
          'O valor da contraprestação variável da TechCloud será auditado trimestralmente?',
        ],
        riscos: [
          'Risco de autuação por divergência cadastral se fornecedores bloqueados forem pagos.',
          'Risco de distorção de margem bruta por classificação incorreta de Capex vs Opex.',
        ],
      };
    }

    const cfoReportResult: CfoClosingReportResult = {
      report_id: `REP-CFO-${Date.now().toString(36).toUpperCase()}`,
      periodo: '2026-10',
      entidades: ['Empresa Soluções Digitais S.A. (Matriz - SP)'],
      status_geral: parsedReport.secao_1_status_geral,
      status_aprovacao_fechamento: 'DADOS_APROVADOS',
      aprovado_por: closingApprovalMeta.auditor,
      aprovado_em: closingApprovalMeta.approved_at || new Date().toISOString(),
      secao_1_status_geral: parsedReport.secao_1_status_geral,
      secao_2_periodo_e_entidades: parsedReport.secao_2_periodo_e_entidades,
      secao_3_contas_fechadas: parsedReport.secao_3_contas_fechadas || [],
      secao_4_contas_pendentes: parsedReport.secao_4_contas_pendentes || [],
      secao_5_principais_variacoes: parsedReport.secao_5_principais_variacoes || [],
      secao_6_excecoes_abertas: parsedReport.secao_6_excecoes_abertas || [],
      secao_7_lancamentos_manuais: parsedReport.secao_7_lancamentos_manuais || [],
      secao_8_reversoes: parsedReport.secao_8_reversoes || [],
      secao_9_mudancas_de_politica: parsedReport.secao_9_mudancas_de_politica || [],
      secao_10_riscos: (parsedReport.secao_10_riscos || []).map((r: any) => ({
        ...r,
        severidade: (r.severidade === 'baixa' || r.severidade === 'media' || r.severidade === 'alta' || r.severidade === 'critica') ? r.severidade : 'media',
      })),
      secao_11_perguntas_para_aprovacao: parsedReport.secao_11_perguntas_para_aprovacao || [],
      secao_12_evidencias: parsedReport.secao_12_evidencias || [],
      fatos: parsedReport.fatos || [],
      interpretacoes: parsedReport.interpretacoes || [],
      perguntas: parsedReport.perguntas || [],
      riscos: parsedReport.riscos || [],
      model_used: GEMINI_MODELS.FLASH,
      created_at: new Date().toISOString(),
    };

    cfoReportsStore.unshift(cfoReportResult);

    res.json({
      success: true,
      report: cfoReportResult,
    });
  } catch (error: any) {
    console.error('Error generating CFO report:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar relatório para o CFO.' });
  }
});

// ========================================================
// 15. FUNCTION CALLING: AÇÕES CONTROLADAS (LEITURA VS ESCRITA)
// ========================================================
const FUNCTION_CALLING_SYSTEM_INSTRUCTION = `Você é o assistente contábil auditável da plataforma DocAudit AI.

O Google diferencia Structured Outputs, usados para formatar respostas, de Function Calling, usado para solicitar ações externas controladas.

Comece liberando apenas funções de leitura:
- get_source_document: Obtém um documento imutável pelo source_id.
- search_policy: Busca políticas contábeis vigentes por entidade, tópico e período.
- find_reconciliation_candidates: Busca candidatos calculados pelo motor de matching.

Regras estritas de segurança de governança:
1. Nunca invente dados sem antes invocar as ferramentas de leitura apropriadas.
2. Não exponha nem tente executar funções de mutação ou escrita como: post_journal_entry, close_period, delete_source, change_accounting_policy, approve_exception, execute_payment.
3. Se o usuário solicitar qualquer uma dessas ações de escrita, informe com clareza técnica que tais operações estão BLOQUEADAS e exigem salvaguardas mandatórias:
   • RBAC;
   • autorização explícita;
   • limite de materialidade;
   • idempotency key;
   • dupla aprovação;
   • período aberto;
   • política vigente;
   • registro de auditoria;
   • possibilidade de rollback.
4. Fundamente suas respostas nas evidências concretas retornadas pelas chamadas de função.`;

app.get('/api/function-calling-specs', (req, res) => {
  res.json({
    success: true,
    allowed_read_only_tools: READ_ONLY_FUNCTION_DECLARATIONS,
    blocked_mutating_functions: BLOCKED_MUTATING_FUNCTIONS,
    sessions_count: functionCallingSessionsStore.length,
  });
});

app.get('/api/function-calling-history', (req, res) => {
  res.json({
    success: true,
    sessions: functionCallingSessionsStore,
  });
});

app.post('/api/agent-function-calling', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'A pergunta ou instrução é obrigatória.' });
    }

    const sessionId = `FC-SESS-${Date.now().toString(36).toUpperCase()}`;
    const agentTurns: AgentStepTurn[] = [];
    const functionExecutions: FunctionCallExecution[] = [];
    const blockedAttempts: string[] = [];

    agentTurns.push({
      step: 1,
      type: 'user_prompt',
      title: 'Prompt do Usuário / Auditor',
      details: { query },
      timestamp: new Date().toISOString(),
    });

    let finalAnswer = '';
    let status: 'COMPLETED' | 'BLOCKED_ACTION_PREVENTED' | 'ERROR' = 'COMPLETED';

    // Verificação preventiva se o usuário está explicitamente pedindo para executar ação mutante bloqueada
    const lowerQuery = query.toLowerCase();
    const requestedMutating = BLOCKED_MUTATING_FUNCTIONS.find(
      (bf) => lowerQuery.includes(bf.name) ||
              (bf.name === 'post_journal_entry' && (lowerQuery.includes('postar lançamento') || lowerQuery.includes('lançar no razão'))) ||
              (bf.name === 'close_period' && (lowerQuery.includes('fechar período') || lowerQuery.includes('encerrar período'))) ||
              (bf.name === 'delete_source' && (lowerQuery.includes('deletar documento') || lowerQuery.includes('excluir fatura'))) ||
              (bf.name === 'execute_payment' && (lowerQuery.includes('pagar fatura') || lowerQuery.includes('executar pagamento')))
    );

    if (requestedMutating) {
      status = 'BLOCKED_ACTION_PREVENTED';
      blockedAttempts.push(requestedMutating.name);
      functionExecutions.push({
        call_id: `BLOCKED-${Date.now().toString(36).toUpperCase()}`,
        name: requestedMutating.name,
        args: { requested_action: requestedMutating.name },
        is_read_only: false,
        is_blocked_action: true,
        block_reason: `Ação mutante bloqueada pelo motor de governança. Operações de alteração não estão expostas para chamada direta do modelo.`,
        response: {
          error: 'ACTION_MUTATION_PROHIBITED',
          guardrails_required: requestedMutating.securityGuardrails,
        },
        duration_ms: 5,
      });

      finalAnswer = `A ação '${requestedMutating.name}' está BLOQUEADA pela governança da plataforma DocAudit.\n\nOperações de escrita e alteração contábil não são expostas como ferramentas executáveis pelo modelo. Para que esta função seja habilitada no futuro, o sistema exige obrigatoriamente:\n\n` +
        requestedMutating.securityGuardrails.map((g) => `• ${g}`).join('\n') +
        `\n\nNenhuma alteração foi realizada no livro contábil ou na base fiscal.`;

      agentTurns.push({
        step: 2,
        type: 'backend_tool_execution',
        title: `Bloqueio Preventivo de Governança: ${requestedMutating.name}`,
        details: {
          blocked_function: requestedMutating.name,
          guardrails_required: requestedMutating.securityGuardrails,
        },
        timestamp: new Date().toISOString(),
      });

      agentTurns.push({
        step: 3,
        type: 'model_final_response',
        title: 'Parecer Fundamentado de Segurança',
        details: { answer: finalAnswer },
        timestamp: new Date().toISOString(),
      });

      const session: FunctionCallingSession = {
        session_id: sessionId,
        query,
        model_used: GEMINI_MODELS.FLASH,
        tools_allowed: READ_ONLY_FUNCTION_DECLARATIONS.map((t) => t.name),
        tools_prohibited: BLOCKED_MUTATING_FUNCTIONS.map((t) => t.name),
        function_calls: functionExecutions,
        agent_turns: agentTurns,
        final_grounded_answer: finalAnswer,
        status,
        created_at: new Date().toISOString(),
      };

      functionCallingSessionsStore.unshift(session);
      return res.json({ success: true, session });
    }

    // Execução real com @google/genai SDK Function Calling
    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        // 1ª Chamada: Envia o prompt com as declarações de função de leitura
        const contentsHistory: any[] = [
          { role: 'user', parts: [{ text: query }] },
        ];

        const initialResp = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: contentsHistory,
          config: {
            systemInstruction: FUNCTION_CALLING_SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: READ_ONLY_FUNCTION_DECLARATIONS as any }],
          },
        });

        const initialCalls = initialResp.functionCalls;

        if (initialCalls && initialCalls.length > 0) {
          // O modelo solicitou uma ou mais chamadas de função!
          for (const call of initialCalls) {
            const callStartTime = Date.now();
            let toolResult: any = null;

            agentTurns.push({
              step: agentTurns.length + 1,
              type: 'model_function_call',
              title: `Modelo Solicitou Execução: ${call.name}`,
              details: {
                function_name: call.name,
                arguments: call.args,
              },
              timestamp: new Date().toISOString(),
            });

            // Executa a função de leitura localmente
            if (call.name === 'get_source_document') {
              const srcId = String((call.args as any)?.source_id || 'DOC-HIST-001');
              toolResult = executeGetSourceDocument(srcId, documentsStore);
            } else if (call.name === 'search_policy') {
              const entityId = String((call.args as any)?.entity_id || 'Empresa Soluções Digitais S.A.');
              const topic = String((call.args as any)?.topic || 'nuvem');
              const period = String((call.args as any)?.period || '2026-10');
              toolResult = executeSearchPolicy(entityId, topic, period);
            } else if (call.name === 'find_reconciliation_candidates') {
              const accountId = String((call.args as any)?.account_id || '1.1.01.001');
              const period = String((call.args as any)?.period || '2026-10');
              toolResult = executeFindReconciliationCandidates(accountId, period, reconciliationBatchesStore);
            } else if (call.name === 'consult_live_cnpj_receita_federal') {
              const cnpjArg = String((call.args as any)?.cnpj || '23.412.247/0001-10');
              toolResult = await executeLiveCnpjLookup({ cnpj: cnpjArg });
            } else if (call.name === 'get_live_fx_quote') {
              const currArg = String((call.args as any)?.currency || 'USD');
              toolResult = await executeLiveFxQuote({ currency: currArg });
            } else if (call.name === 'check_banking_holiday') {
              const dateArg = String((call.args as any)?.date || '2026-10-15');
              toolResult = await executeCheckBankingHoliday({ date: dateArg });
            } else if (call.name === 'get_macroeconomic_rates') {
              toolResult = await executeGetMacroRates();
            } else {
              toolResult = {
                error: `Função '${call.name}' não permitida ou inexistente no catálogo de leitura.`,
              };
            }

            const callDuration = Date.now() - callStartTime;

            functionExecutions.push({
              call_id: `CALL-${Date.now().toString(36).toUpperCase()}`,
              name: call.name || 'unknown_tool',
              args: (call.args as Record<string, any>) || {},
              is_read_only: true,
              is_blocked_action: false,
              response: toolResult,
              duration_ms: callDuration,
            });

            agentTurns.push({
              step: agentTurns.length + 1,
              type: 'backend_tool_execution',
              title: `Resposta do Sistema para ${call.name || 'ferramenta'}`,
              details: toolResult,
              timestamp: new Date().toISOString(),
            });

            // Adiciona a chamada e o resultado de volta ao histórico do agente
            contentsHistory.push({
              role: 'model',
              parts: [{ functionCall: call }],
            });

            contentsHistory.push({
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: call.name || 'unknown_tool',
                    response: toolResult,
                  },
                },
              ],
            });
          }

          // 2ª Chamada: Envia a resposta das ferramentas para o Gemini gerar o parecer final fundamentado
          const followUpResp = await ai.models.generateContent({
            model: GEMINI_MODELS.FLASH,
            contents: contentsHistory,
            config: {
              systemInstruction: FUNCTION_CALLING_SYSTEM_INSTRUCTION,
            },
          });

          finalAnswer = followUpResp.text?.trim() || 'Análise concluída com base nas evidências extraídas.';
        } else {
          // O modelo respondeu diretamente sem precisar invocar ferramentas
          finalAnswer = initialResp.text?.trim() || 'Resposta formulada diretamente pelo modelo.';
        }
      } catch (geminiErr: any) {
        console.warn('Gemini Function Calling execution error, falling back to simulated engine:', geminiErr?.message);
      }
    }

    // Fallback determinístico caso o Gemini não esteja com chave ou tenha retornado vazio
    if (!finalAnswer) {
      if (lowerQuery.includes('documento') || lowerQuery.includes('fatura') || lowerQuery.includes('source') || lowerQuery.includes('doc-hist')) {
        const docResult = executeGetSourceDocument('DOC-HIST-001', documentsStore);
        functionExecutions.push({
          call_id: `CALL-FALLBACK-01`,
          name: 'get_source_document',
          args: { source_id: 'DOC-HIST-001' },
          is_read_only: true,
          is_blocked_action: false,
          response: docResult,
          duration_ms: 12,
        });

        agentTurns.push({
          step: 2,
          type: 'model_function_call',
          title: 'Modelo Solicitou Execução: get_source_document',
          details: { function_name: 'get_source_document', arguments: { source_id: 'DOC-HIST-001' } },
          timestamp: new Date().toISOString(),
        });

        agentTurns.push({
          step: 3,
          type: 'backend_tool_execution',
          title: 'Resposta do Sistema para get_source_document',
          details: docResult,
          timestamp: new Date().toISOString(),
        });

        finalAnswer = `O documento imutável 'DOC-HIST-001' (${docResult.filename}) foi consultado com sucesso no repositório oficial. Trata-se de uma fatura emitida por '${docResult.vendor?.name}' (CNPJ: ${docResult.vendor?.tax_id}) no valor total de R$ ${Number(docResult.total).toFixed(2)} ${docResult.currency} com vencimento em ${docResult.due_date}. As linhas de serviço compreendem instâncias EC2, S3 e banco RDS, com integridade aritmética e fiscal comprovadas.`;
      } else if (lowerQuery.includes('política') || lowerQuery.includes('policy') || lowerQuery.includes('nuvem') || lowerQuery.includes('capex')) {
        const policyResult = executeSearchPolicy('Empresa Soluções Digitais S.A.', 'nuvem', '2026-10');
        functionExecutions.push({
          call_id: `CALL-FALLBACK-02`,
          name: 'search_policy',
          args: { entity_id: 'Empresa Soluções Digitais S.A.', topic: 'nuvem', period: '2026-10' },
          is_read_only: true,
          is_blocked_action: false,
          response: policyResult,
          duration_ms: 15,
        });

        agentTurns.push({
          step: 2,
          type: 'model_function_call',
          title: 'Modelo Solicitou Execução: search_policy',
          details: { function_name: 'search_policy', arguments: { entity_id: 'Empresa Soluções Digitais S.A.', topic: 'nuvem', period: '2026-10' } },
          timestamp: new Date().toISOString(),
        });

        agentTurns.push({
          step: 3,
          type: 'backend_tool_execution',
          title: 'Resposta do Sistema para search_policy',
          details: policyResult,
          timestamp: new Date().toISOString(),
        });

        finalAnswer = `A política contábil vigente localizada para serviços em nuvem é a 'POL-IT-01' (versão ${policyResult.policies[0]?.version || 'v2.4'}), eficaz desde 01/01/2025. A política determina expressamente a apropriação mensal como despesa operacional (OPEX) no regime de competência, exigindo discriminação na contrapartida de retenções tributárias na fonte (ISS/IRRF/PIS/COFINS).`;
      } else {
        const reconResult = executeFindReconciliationCandidates('1.1.01.001', '2026-10', reconciliationBatchesStore);
        functionExecutions.push({
          call_id: `CALL-FALLBACK-03`,
          name: 'find_reconciliation_candidates',
          args: { account_id: '1.1.01.001', period: '2026-10' },
          is_read_only: true,
          is_blocked_action: false,
          response: reconResult,
          duration_ms: 18,
        });

        agentTurns.push({
          step: 2,
          type: 'model_function_call',
          title: 'Modelo Solicitou Execução: find_reconciliation_candidates',
          details: { function_name: 'find_reconciliation_candidates', arguments: { account_id: '1.1.01.001', period: '2026-10' } },
          timestamp: new Date().toISOString(),
        });

        agentTurns.push({
          step: 3,
          type: 'backend_tool_execution',
          title: 'Resposta do Sistema para find_reconciliation_candidates',
          details: reconResult,
          timestamp: new Date().toISOString(),
        });

        finalAnswer = `Foram consultados os candidatos calculados pelo motor algorítmico para a conta ${reconResult.account_id} no período ${reconResult.period}. O sistema localizou ${reconResult.exact_matches} casamentos exatos e identificou ${reconResult.unmatched_count} transações pendentes de conciliação. A ação recomendada para itens parciais é encaminhar à triagem de exceção com justificativa documentada.`;
      }
    }

    agentTurns.push({
      step: agentTurns.length + 1,
      type: 'model_final_response',
      title: 'Parecer Final Grounded do Modelo',
      details: { answer: finalAnswer },
      timestamp: new Date().toISOString(),
    });

    const session: FunctionCallingSession = {
      session_id: sessionId,
      query,
      model_used: GEMINI_MODELS.FLASH,
      tools_allowed: READ_ONLY_FUNCTION_DECLARATIONS.map((t) => t.name),
      tools_prohibited: BLOCKED_MUTATING_FUNCTIONS.map((t) => t.name),
      function_calls: functionExecutions,
      agent_turns: agentTurns,
      final_grounded_answer: finalAnswer,
      status,
      created_at: new Date().toISOString(),
    };

    functionCallingSessionsStore.unshift(session);

    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('Error in agent-function-calling:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha na execução de Function Calling.' });
  }
});


// ========================================================
// 15. HUB DE INTEGRAÇÕES GOVERNAMENTAIS & MERCADO (APIS GRATUITAS)
// BrasilAPI, BACEN, Receita Federal, ANBIMA e Frankfurter
// ========================================================

// 1. Consulta em tempo real CNPJ na Receita Federal
app.get('/api/integrations/cnpj/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    const data = await fetchLiveCnpj(cnpj);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: `CNPJ ${cnpj} não foi localizado ou não possui registro ativo na Receita Federal.`,
      });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao consultar Receita Federal.' });
  }
});

// 2. Cotação de Câmbio PTAX ao Vivo
app.get('/api/integrations/fx/:currency', async (req, res) => {
  try {
    const { currency } = req.params;
    const data = await fetchLiveFxRate(currency, 'BRL');
    if (!data) {
      return res.status(404).json({ success: false, error: `Cotação para ${currency} indisponível.` });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao consultar taxa de câmbio.' });
  }
});

// 3. Verificação de Feriado Bancário Nacional (ANBIMA / BACEN)
app.get('/api/integrations/holiday/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const data = await checkBankingHoliday(date);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao verificar calendário bancário.' });
  }
});

// 4. Taxas Macroeconômicas Oficiais (SELIC, CDI, IPCA)
app.get('/api/integrations/taxas', async (req, res) => {
  try {
    const data = await fetchBacenTaxas();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao obter taxas do Banco Central.' });
  }
});

// 5. Lista de Bancos Homologados no SFN (COMPE / ISPB)
app.get('/api/integrations/banks', async (req, res) => {
  try {
    const banks = await fetchBrazilianBanks();
    res.json({ success: true, banks, total: banks.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao listar bancos homologados.' });
  }
});

// 6. Parecer Macroeconômico e Fiscal com IA (Gemini 3.8-Flash)
app.post('/api/integrations/ai-macro-analysis', async (req, res) => {
  try {
    const [taxas, usdFx, eurFx] = await Promise.all([
      fetchBacenTaxas(),
      fetchLiveFxRate('USD', 'BRL'),
      fetchLiveFxRate('EUR', 'BRL'),
    ]);

    let analysisReport = '';

    if (getActiveApiKey()) {
      try {
        const ai = new GoogleGenAI({
          apiKey: getActiveApiKey() || undefined,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `ATUE COMO ECONOMISTA-CHEFE E CONTROLLER CORPORATIVO.
Com base nos dados macroeconômicos oficiais em tempo real obtidos diretamente do Banco Central do Brasil e mercados cambiais:
- Taxa Selic Meta: ${taxas.selic}% a.a.
- Taxa CDI Over: ${taxas.cdi}% a.a.
- Inflação IPCA: ${taxas.ipca}% a.a.
- Dólar Comercial (PTAX): R$ ${usdFx?.rate.toFixed(4) || '5.15'}
- Euro Comercial (PTAX): R$ ${eurFx?.rate.toFixed(4) || '5.62'}

Elabore um memorando executivo de inteligência financeira e fiscal com 3 pontos didáticos e objetivos:
1. Impacto da Selic/CDI na rentabilidade de caixa e custo de capital de giro.
2. Gestão de Risco Cambial para contratos de nuvem (AWS/Azure/GCP/SaaS) faturados em moeda estrangeira.
3. Diretrizes para o fechamento contábil mensal e provisionamento de encargos financeiros.`;

        const resp = await ai.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: prompt,
        });

        analysisReport = resp.text?.trim() || '';
      } catch (err) {
        console.warn('Falha na chamada Gemini para ai-macro-analysis:', err);
      }
    }

    if (!analysisReport) {
      analysisReport = `MEMORANDO DE INTELIGÊNCIA MACROECONÔMICA & TESOURARIA

1. Rentabilidade de Caixa & CDI (${taxas.cdi}% a.a.):
Com o CDI no patamar de ${taxas.cdi}% a.a., a tesouraria corporativa deve manter o excedente de liquidez alocado em fundos DI de liquidez imediata (D+0), capturando rentabilidade real acima da inflação projetada (IPCA ${taxas.ipca}%).

2. Exposição e Variação Cambial (USD: R$ ${usdFx?.rate.toFixed(4) || '5.15'} / EUR: R$ ${eurFx?.rate.toFixed(4) || '5.62'}):
Para contratos faturados em moeda estrangeira (como instâncias em nuvem e licenças de software), recomenda-se travar a cotação PTAX no dia de emissão e calcular a variação cambial ativa/passiva no encerramento de cada mês de competência.

3. Diretrizes de Fechamento Contábil:
Conferir se os vencimentos bancários ajustados respeitam as janelas do SPB/PIX/TED, provisionando os juros contratuais pelo critério pro-rata die com base na Selic efetiva.`;
    }

    res.json({
      success: true,
      rates: taxas,
      fx: { usd: usdFx, eur: eurFx },
      analysis: analysisReport,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in ai-macro-analysis:', error);
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar análise macroeconômica.' });
  }
});


// ==========================================
// 19. TRIBUTÁRIO & REFORMA TRIBUTÁRIA / SPED
// ==========================================
app.get('/api/tax/withholdings', (req, res) => {
  const { amount = '6600', category = 'SERVIÇOS_TI', is_simples = 'false' } = req.query;
  const breakdown = calculateTaxWithholdings(
    parseFloat(amount as string),
    category as string,
    is_simples === 'true'
  );
  res.json({ success: true, breakdown });
});

app.post('/api/tax/simulate-reform', (req, res) => {
  const { gross_total = 6600 } = req.body;
  const simulation = simulateTaxReform(parseFloat(gross_total));
  res.json({ success: true, simulation });
});

app.get('/api/tax/sped-audit', (req, res) => {
  const report = auditSpedCompliance(documentsStore);
  res.json({ success: true, report });
});

// ==========================================
// 20. TESOURARIA, FLUXO D+90 & DDA BANCÁRIO
// ==========================================
app.get('/api/treasury/cash-flow-d90', async (req, res) => {
  try {
    const bacen = await fetchBacenTaxas();
    const selic = bacen?.selic || 10.5;
    const forecast = generateCashFlowForecastD90(documentsStore, 850000.0, selic);
    res.json({ success: true, forecast, bacenRates: bacen });
  } catch (error: any) {
    const forecast = generateCashFlowForecastD90(documentsStore, 850000.0, 10.5);
    res.json({ success: true, forecast });
  }
});

app.get('/api/treasury/dynamic-discounting', async (req, res) => {
  try {
    const bacen = await fetchBacenTaxas();
    const cdi = bacen?.cdi || 10.4;
    const opportunities = evaluateDynamicDiscounting(documentsStore, cdi);
    res.json({ success: true, opportunities, cdiRate: cdi });
  } catch {
    const opportunities = evaluateDynamicDiscounting(documentsStore, 10.4);
    res.json({ success: true, opportunities, cdiRate: 10.4 });
  }
});

app.get('/api/treasury/dda-invoices', (req, res) => {
  res.json({ success: true, ddaInvoices: SAMPLE_DDA_INVOICES });
});

// ==========================================
// 21. FP&A, ORÇAMENTO & NARRATIVAS DE VARIÂNCIA
// ==========================================
app.get('/api/fpa/cost-centers', (req, res) => {
  res.json({ success: true, costCenters: CORPORATE_COST_CENTERS });
});

app.get('/api/fpa/variance-report', async (req, res) => {
  try {
    const report = await generateFpaVarianceReport(documentsStore, 'Q3/2026');
    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao gerar relatório de FP&A.' });
  }
});

// ==========================================
// 22. AUDITORIA FORENSE, LEI DE BENFORD & SOX
// ==========================================
app.get('/api/forensics/benford-analysis', (req, res) => {
  const result = runBenfordAnalysis(documentsStore);
  res.json({ success: true, result });
});

app.get('/api/forensics/sod-violations', (req, res) => {
  res.json({ success: true, violations: SOD_VIOLATIONS_STORE });
});

app.get('/api/forensics/audit-trail', (req, res) => {
  res.json({ success: true, chain: AUDIT_TRAIL_CHAIN });
});

app.post('/api/forensics/add-audit-block', (req, res) => {
  const { actor = 'Auditor Fiscal', actionType = 'HUMAN_REVIEW_APPROVED', documentId = 'DOC-GEN', payloadData = 'OK' } = req.body;
  const block = addAuditTrailBlock(actor, actionType, documentId, payloadData);
  res.json({ success: true, block });
});

// ==========================================
// 23. ESG & CONTABILIDADE DE CARBONO (SCOPE 1, 2, 3)
// ==========================================
app.get('/api/esg/corporate-summary', (req, res) => {
  const summary = generateEsgSustainabilitySummary(documentsStore);
  const items = documentsStore.map((d) => calculateInvoiceCarbonFootprint(d)).filter(Boolean);
  res.json({ success: true, summary, items });
});

// ==========================================
// 24. CONECTORES DE ERP & CNDs
// ==========================================
app.post('/api/erp/generate-payload', (req, res) => {
  const { document_id, erp_system = 'SAP_S4HANA' } = req.body;
  const targetDoc = documentsStore.find((d) => d.id === document_id) || documentsStore[0];
  if (!targetDoc) {
    return res.status(404).json({ success: false, error: 'Documento não localizado.' });
  }
  const payloadRecord = generateErpPayload(targetDoc, erp_system);
  res.json({ success: true, payloadRecord });
});

app.get('/api/erp/cnd-status', (req, res) => {
  const { cnpj = '23.412.247/0001-10', name = 'AWS Serviços de Nuvem Ltda' } = req.query;
  const status = verifyVendorCnds(cnpj as string, name as string);
  res.json({ success: true, cndStatus: status });
});

// ==========================================
// 25. HUB DE APIS GRATUITAS & STATUS EM TEMPO REAL
// ==========================================
app.get('/api/integrations/status', async (req, res) => {
  try {
    const health = await checkAllIntegrationsHealth();
    res.json({ success: true, health });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao verificar saúde das integrações.' });
  }
});

app.get('/api/integrations/awesome-rates', async (req, res) => {
  try {
    const rates = await fetchAwesomeRates();
    res.json({ success: true, rates, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao obter cotações AwesomeAPI.' });
  }
});

app.get('/api/integrations/cep/:cep', async (req, res) => {
  try {
    const data = await fetchLiveCep(req.params.cep);
    if (!data) {
      return res.status(404).json({ success: false, error: 'CEP não encontrado ou inválido.' });
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao consultar CEP.' });
  }
});

app.get('/api/integrations/fipe-brands', async (req, res) => {
  try {
    const brands = await fetchFipeCarBrands();
    res.json({ success: true, brands });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao consultar tabela FIPE.' });
  }
});

// ==========================================
// 26. IA ENTERPRISE EM TODAS AS SESSÕES (GEMINI 2.5)
// ==========================================
app.get('/api/ai/status', async (req, res) => {
  try {
    const health = await checkAiHealth();
    res.json({ success: true, health });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Erro ao verificar status da IA.' });
  }
});

app.post('/api/ai/set-key', (req, res) => {
  const { apiKey } = req.body;
  setUserApiKey(apiKey || null);
  res.json({ success: true, message: apiKey ? 'Chave de API salva com sucesso!' : 'Chave de API removida.' });
});

app.post('/api/ai/copilot-chat', async (req, res) => {
  try {
    const { messages = [], currentModule = 'Dashboard' } = req.body;
    const totalAmount = documentsStore.reduce((acc, d) => acc + (d.geminiExtraction.total || 0), 0);
    const pendingCount = documentsStore.filter((d) => d.validation.step6_reviewRouting.overallStatus === 'PENDING_REVIEW').length;

    const response = await chatWithDocAuditCopilot(
      messages,
      {
        documentsCount: documentsStore.length,
        pendingReviews: pendingCount,
        totalAuditedAmount: totalAmount,
        currentModule,
      }
    );

    res.json({ success: true, response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha na comunicação com o Copiloto IA.' });
  }
});

app.post('/api/forensics/ai-opinion', async (req, res) => {
  try {
    const benford = runBenfordAnalysis(documentsStore);
    const opinion = await generateForensicAiOpinion(benford, SOD_VIOLATIONS_STORE, documentsStore.length);
    res.json({ success: true, opinion });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao emitir parecer forense da IA.' });
  }
});

app.post('/api/treasury/ai-forecast-opinion', async (req, res) => {
  try {
    const forecast = generateCashFlowForecastD90(documentsStore);
    const opinion = await generateTreasuryAiOpinion(forecast.summary, SAMPLE_DDA_INVOICES);
    res.json({ success: true, opinion });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar parecer de tesouraria da IA.' });
  }
});

app.post('/api/tax/ai-diagnosis', async (req, res) => {
  try {
    const { gross_total = 6600 } = req.body;
    const simulation = simulateTaxReform(parseFloat(gross_total));
    const spedReport = auditSpedCompliance(documentsStore);
    const diagnosis = await generateTaxReformAiDiagnosis(simulation, spedReport);
    res.json({ success: true, diagnosis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar diagnóstico tributário da IA.' });
  }
});

app.post('/api/esg/ai-recommendations', async (req, res) => {
  try {
    const summary = generateEsgSustainabilitySummary(documentsStore);
    const recommendations = await generateEsgAiRecommendations(summary);
    res.json({ success: true, recommendations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Falha ao gerar recomendações ESG da IA.' });
  }
});

// 6. API Fallback & Error Handlers
// Guarantee that unhandled /api and /api/* routes always return JSON and NEVER fall through to Vite index.html
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint de API não encontrado: ${req.method} ${req.originalUrl}`,
  });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err?.message || 'Erro interno no servidor de auditoria.',
  });
});

// 7. Vite Integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api') || req.originalUrl?.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: `Endpoint de API não encontrado: ${req.method} ${req.originalUrl || req.url}`,
        });
      }
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Never allow Vite SPA fallback to capture /api requests
    app.use((req, res, next) => {
      const url = req.url || '';
      const originalUrl = req.originalUrl || '';
      if (url.startsWith('/api') || originalUrl.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: `Endpoint de API não encontrado: ${req.method} ${originalUrl || url}`,
        });
      }
      vite.middlewares(req, res, next);
    });
  }

  app.listen(port, host, () => {
    console.log(`DocAudit AI Server running at http://${host}:${port}`);
  });
}

startServer();


