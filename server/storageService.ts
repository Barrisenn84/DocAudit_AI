import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ProcessedDocument,
  JournalEntryProposal,
  RevenueRecognitionResult,
  ExceptionTriageResult,
  ClosingChecklistResult,
  CfoClosingReportResult,
} from '../src/types/finance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Assegura que o diretório de dados persistente exista
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeWriteJson(fileName: string, data: any): void {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, fileName);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[DocAudit Storage] Falha ao persistir ${fileName}:`, err);
  }
}

function safeReadJson<T>(fileName: string, fallback: T): T {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[DocAudit Storage] Falha ao ler ${fileName}, utilizando dados de contingência:`, err);
    return fallback;
  }
}

export const StorageService = {
  saveDocuments(docs: ProcessedDocument[]): void {
    safeWriteJson('documents.json', docs);
  },

  loadDocuments(fallback: ProcessedDocument[]): ProcessedDocument[] {
    const loaded = safeReadJson<ProcessedDocument[]>('documents.json', fallback);
    return loaded.length > 0 ? loaded : fallback;
  },

  saveJournalProposals(proposals: JournalEntryProposal[]): void {
    safeWriteJson('journal_proposals.json', proposals);
  },

  loadJournalProposals(fallback: JournalEntryProposal[]): JournalEntryProposal[] {
    return safeReadJson<JournalEntryProposal[]>('journal_proposals.json', fallback);
  },

  saveRevenueAnalyses(analyses: RevenueRecognitionResult[]): void {
    safeWriteJson('revenue_analyses.json', analyses);
  },

  loadRevenueAnalyses(fallback: RevenueRecognitionResult[]): RevenueRecognitionResult[] {
    return safeReadJson<RevenueRecognitionResult[]>('revenue_analyses.json', fallback);
  },

  saveExceptions(exceptions: ExceptionTriageResult[]): void {
    safeWriteJson('exceptions.json', exceptions);
  },

  loadExceptions(fallback: ExceptionTriageResult[]): ExceptionTriageResult[] {
    return safeReadJson<ExceptionTriageResult[]>('exceptions.json', fallback);
  },

  saveClosingChecklists(checklists: ClosingChecklistResult[]): void {
    safeWriteJson('closing_checklists.json', checklists);
  },

  loadClosingChecklists(fallback: ClosingChecklistResult[]): ClosingChecklistResult[] {
    return safeReadJson<ClosingChecklistResult[]>('closing_checklists.json', fallback);
  },

  saveCfoReports(reports: CfoClosingReportResult[]): void {
    safeWriteJson('cfo_reports.json', reports);
  },

  loadCfoReports(fallback: CfoClosingReportResult[]): CfoClosingReportResult[] {
    return safeReadJson<CfoClosingReportResult[]>('cfo_reports.json', fallback);
  },
};
