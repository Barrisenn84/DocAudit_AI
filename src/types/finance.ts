export type DocumentType = 'invoice' | 'receipt' | 'bank_statement' | 'other';

export type FieldStatus = 'observed' | 'ambiguous' | 'missing';

export interface LineItem {
  item_number?: number | null;
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
  confidence: number;
  raw_text?: string | null;
}

export interface FieldEvidence {
  field_name: string;
  extracted_value: string | null;
  confidence: number;
  status: FieldStatus;
  text_evidence: string;
  page_or_location?: string | null;
}

export interface DocumentException {
  code: string;
  message: string;
  severity: 'warning' | 'critical';
  involved_fields?: string[];
}

export interface GeminiExtractionResult {
  document_type: string;
  vendor_name: string | null;
  vendor_tax_id: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  line_items: LineItem[];
  field_evidence: FieldEvidence[];
  exceptions: DocumentException[];
}

export interface Discrepancy {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  stepName: string;
  code: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  suggestedAction?: string;
  involvedFields?: string[];
}

export interface LineItemsCalculationCheck {
  calculatedLineItemsSum: number;
  extractedSubtotal: number | null;
  extractedTotal: number | null;
  differenceWithSubtotal: number | null;
  differenceWithTotal: number | null;
  isConsistent: boolean;
  itemCount: number;
  details: string;
}

export interface ExtractionIntegrityCheck {
  calculatedLineItemsSum: number;
  declaredTotal: number | null;
  difference: number | null;
  percentageDiff: number | null;
  hasDiscrepancy: boolean;
  itemCount: number;
  status: 'MATCH' | 'DISCREPANT' | 'NO_ITEMS' | 'NO_DECLARED_TOTAL';
  details: string;
}

export interface SubtotalTaxTotalComparisonCheck {
  subtotal: number | null;
  taxAmount: number | null;
  calculatedSum: number | null;
  extractedTotal: number | null;
  difference: number | null;
  isConsistent: boolean;
  details: string;
}

export interface LiveCnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral: string;
  data_situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  cnae_fiscal?: string;
  capital_social?: number;
  natureza_juridica?: string;
  municipio?: string;
  uf?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  qsa?: Array<{
    nome_socio: string;
    qual_socio: string;
    faixa_etaria?: string;
  }>;
  queried_at: string;
  is_valid: boolean;
  fonte?: string;
}

export interface LiveFxRateData {
  base: string;
  target: string;
  rate: number;
  date: string;
  provider: string;
  updated_at: string;
}

export interface BankingHolidayCheck {
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  original_date: string;
  adjusted_business_date: string;
  days_extended: number;
  details: string;
}

export interface BacenFinancialRates {
  selic: number;
  cdi: number;
  ipca: number;
  updated_at: string;
  fonte?: string;
}

export interface BrazilianBankItem {
  code: number;
  name: string;
  fullName: string;
  ispb: string;
}

export interface AwesomeCurrencyQuote {
  code: string;
  codein: string;
  name: string;
  high: number;
  low: number;
  varBid: number;
  pctChange: number;
  bid: number;
  ask: number;
  timestamp: string;
  create_date: string;
}

export interface LiveCepData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  ibge?: string;
  location?: {
    type: string;
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

export interface FipeVehicleBrand {
  nome: string;
  valor: string;
}

export interface IntegrationHealthItem {
  service: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  description: string;
  providerUrl: string;
  lastChecked: string;
}

export interface IntegrationsHealthStatus {
  overallStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  timestamp: string;
  totalIntegrations: number;
  onlineCount: number;
  services: IntegrationHealthItem[];
}


export interface ReconciliationAiAnalysisResult {
  batch_id: string;
  overall_health_score: number;
  executive_summary: string;
  root_cause_categories: Array<{
    category: 'TIMING_DELAY' | 'BANK_FEES_IOF' | 'POTENTIAL_DUPLICATE' | 'CURRENCY_VARIANCE' | 'SYSTEM_UNMATCH';
    title: string;
    description: string;
    impact_amount: number;
    recommended_action: string;
  }>;
  proposed_adjusting_entries: Array<{
    description: string;
    debit_account: string;
    credit_account: string;
    amount: number;
    justification: string;
  }>;
  audit_verdict: 'APPROVED_FOR_CLOSING' | 'REVIEWS_REQUIRED' | 'BLOCKING_ANOMALIES';
  generated_at: string;
}

export interface CurrencyAndDatesCheck {
  currency: string | null;
  isCurrencyValid: boolean;
  normalizedCurrency: string | null;
  issueDate: string | null;
  dueDate: string | null;
  isIssueDateValid: boolean;
  isDueDateValid: boolean;
  isChronologyValid: boolean;
  isDatesValid: boolean;
  daysUntilDue?: number | null;
  liveFxRate?: LiveFxRateData | null;
  convertedBrlTotal?: number | null;
  bankingHolidayCheck?: BankingHolidayCheck | null;
  details: string;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateRisk: 'none' | 'low' | 'high';
  matchedDocumentId?: string | null;
  matchedInvoiceNumber?: string | null;
  matchedVendor?: string | null;
  details: string;
}

export type VendorStatus = 'approved' | 'unregistered' | 'blocked' | 'incomplete_data';

export interface VendorMaster {
  id: string;
  name: string;
  taxId: string;
  status: VendorStatus;
  category: string;
  paymentTermsDays?: number;
  notes?: string;
}

export interface VendorVerificationCheck {
  vendorName: string | null;
  vendorTaxId: string | null;
  status: VendorStatus;
  matchedVendor?: VendorMaster | null;
  taxIdFormatValid: boolean;
  liveCnpjData?: LiveCnpjData | null;
  liveCnpjQueryStatus?: 'success' | 'not_found' | 'error' | 'unqueried';
  details: string;
}

export interface HumanReviewDecision {
  status: 'APPROVED' | 'REJECTED' | 'MODIFIED';
  reviewerName: string;
  reviewedAt: string;
  notes: string;
  adjustedFields?: Partial<Record<string, any>>;
}

export interface BackendValidationResult {
  step1_lineItemsCalculation: LineItemsCalculationCheck;
  step2_subtotalTaxTotalComparison: SubtotalTaxTotalComparisonCheck;
  step3_currencyAndDatesValidation: CurrencyAndDatesCheck;
  step4_duplicateCheck: DuplicateCheck;
  step5_vendorVerification: VendorVerificationCheck;
  step6_reviewRouting: {
    overallStatus: 'APPROVED_AUTOMATIC' | 'PENDING_REVIEW' | 'REJECTED';
    requiresReview: boolean;
    criticalIssuesCount: number;
    warningIssuesCount: number;
    discrepancies: Discrepancy[];
  };
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  fileType: 'image' | 'pdf' | 'text' | 'csv';
  previewDataUrl?: string;
  rawTextPreview?: string;
  extractedAt: string;
  geminiExtraction: GeminiExtractionResult;
  validation: BackendValidationResult;
  humanReview?: HumanReviewDecision;
  priceBenchmarkAudit?: DocumentPriceBenchmarkAudit;
  processingTimeMs: number;
}

// ========================================================
// 2. CLASSIFICAÇÃO DE TRANSAÇÕES
// ========================================================

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ChartOfAccountItem {
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  description: string;
  permittedDimensions?: string[];
  applicablePolicyIds?: string[];
}

export interface AccountCandidate {
  account_code: string;
  account_name: string;
  score: number;
  plausibility_rationale: string;
}

export interface TransactionClassificationResult {
  transaction_id: string;
  model_used: string;
  account_candidates: AccountCandidate[];
  selected_account: {
    code: string;
    name: string;
    type: AccountType;
  } | null;
  rationale: string;
  confidence: number;
  policy_id: string | null;
  evidence: string;
  needs_review: boolean;
  review_reasons: string[];
  exceptions: Array<{
    code: string;
    message: string;
    severity: 'warning' | 'critical';
  }>;
  execution_time_ms?: number;
}

// ========================================================
// 3. PROPOSTA DE LANÇAMENTO CONTÁBIL
// ========================================================

export interface AccountingPeriod {
  period_id: string; // ex: "2026-10", "2026-09"
  name: string;
  status: 'open' | 'closed';
  startDate: string;
  endDate: string;
}

export interface AccountingPolicy {
  policy_id: string;
  title: string;
  version?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  summary: string;
  rules: string[];
}

export interface CorporateEntity {
  id: string;
  name: string;
  taxId: string;
  isAllowed: boolean;
}

export interface JournalEntryLineCandidate {
  line_number: number;
  conta: string; // account code
  account_name?: string;
  debito_candidato: number;
  credito_candidato: number;
  entidade: string;
  dimensao: string;
  periodo: string;
  source_ids: string[];
  policy_id: string;
  justificativa: string;
}

export interface JournalProposalValidation {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  balanceDifference: number;
  isAutoRejected: boolean;
  rejectionReasons: string[];
  needsReview: boolean;
  reviewTriggers: string[];
  status: 'AUTOMATICALLY_REJECTED' | 'PENDING_HUMAN_REVIEW' | 'PROPOSAL_VALIDATED';
  details: string;
}

export interface JournalEntryProposal {
  proposal_id: string;
  created_at: string;
  source_document_id?: string;
  source_transaction_desc?: string;
  model_used: string;
  disclaimer: string;
  proposed_lines: JournalEntryLineCandidate[];
  ai_needs_review: boolean;
  ai_review_rationale?: string;
  validation: JournalProposalValidation;
  human_decision?: {
    status: 'APPROVED_FOR_POSTING' | 'REJECTED' | 'MODIFIED';
    auditor: string;
    decided_at: string;
    notes: string;
  };
}

// ========================================================
// 4. REVENUE RECOGNITION (IFRS 15 / ASC 606)
// ========================================================

export interface PerformanceObligationCandidate {
  id: string;
  description: string;
  isDistinct: boolean;
  satisfactionTiming: 'over_time' | 'point_in_time' | 'variable';
  allocatedPriceEstimate?: number | null;
  rationale: string;
}

export interface RevenueRecognitionFactSheet {
  partes: {
    fornecedor: string;
    cliente: string;
    is_related_party: boolean;
  };
  datas: {
    assinatura: string | null;
    inicio_servico: string | null;
    termino_servico: string | null;
  };
  prazo_meses: number | null;
  moeda: string;
  preco_fixo: number | null;
  preco_variavel: {
    tem_preco_variavel: boolean;
    descricao: string;
    criterios: string;
    is_material: boolean;
  };
  uso: string | null;
  descontos: {
    valor_ou_percentual: string | null;
    condicoes: string | null;
  };
  creditos: string | null;
  obrigações_de_performance_candidatas: PerformanceObligationCandidate[];
  renovacao: {
    automatica: boolean;
    clausula: string | null;
  };
  cancelamento: {
    permite_cancelamento_imotivado: boolean;
    aviso_previo_dias: number | null;
    multa_ou_penalidade: string | null;
    is_atypical: boolean;
  };
  reembolso: string | null;
  sla: {
    tem_sla: boolean;
    descricao: string | null;
    penalidades: string | null;
  };
  data_inicio_servico: string | null;
  condicoes_aceitacao: string | null;
  modificacoes_contratuais: {
    tem_modificacao: boolean;
    detalhes: string | null;
  };
  evidencias_textuais: Array<{
    topico: string;
    citacao: string;
    secao_ou_pagina: string | null;
  }>;
}

export interface RevenuePolicyTreatment {
  policy_id: string;
  fatos_favoraveis: string[];
  fatos_contrarios: string[];
  dados_ausentes: string[];
  necessidade_de_revisao: boolean;
  material_review_required: boolean;
  justificativa_normativa: string;
}

export interface RevenueRecognitionResult {
  contract_id: string;
  contract_title: string;
  model_used: string;
  is_complex_contract: boolean;
  facts: RevenueRecognitionFactSheet;
  policy_treatments: RevenuePolicyTreatment[];
  human_review_mandatory: boolean;
  human_review_triggers: string[];
  disclaimer: string;
  analyzed_at: string;
}

// ========================================================
// 5. RECONCILIAÇÃO ASSISTIDA
// ========================================================

export type MatchStatus = 'exact' | 'probable' | 'partial' | 'no_match' | 'insufficient_data';

export interface LedgerTransactionItem {
  id: string;
  source_id?: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  reference_code: string;
  counterparty: string;
}

export interface BankStatementTransactionItem {
  id: string;
  source_id?: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  reference_code: string;
  bank_name: string;
}

export interface ReconciliationPairCandidate {
  pair_id: string;
  ledger_item: LedgerTransactionItem;
  statement_item: BankStatementTransactionItem;
  match_status: MatchStatus;
  evidencias: string[];
  diferencas_de_data: {
    dias_diferenca: number;
    detalhes: string;
  };
  diferencas_de_valor: {
    diferenca_absoluta: number;
    is_within_tolerance: boolean;
    detalhes: string;
  };
  diferencas_de_moeda: {
    moeda_ledger: string;
    moeda_statement: string;
    has_currency_mismatch: boolean;
    conversao_documentada: boolean;
    detalhes: string;
  };
  diferenca_de_referencia: {
    similaridade_percentual: number;
    detalhes: string;
  };
  acao_sugerida: string;
  confidence: number;
  necessidade_de_revisao: boolean;
  rule_violations: string[];
  is_reconciled: boolean;
}

export interface ReconciliationBatchResult {
  batch_id: string;
  created_at: string;
  total_pairs: number;
  exact_matches: number;
  probable_matches: number;
  partial_matches: number;
  unmatched_items: number;
  pairs: ReconciliationPairCandidate[];
}

// ========================================================
// 7. CHECKLIST DO FECHAMENTO
// ========================================================

export type ClosingTaskStatus = 'CONCLUIDO' | 'BLOQUEADO' | 'PENDENTE';

export interface ClosingChecklistTask {
  task_id: string;
  modulo: string;
  descricao: string;
  responsavel: string;
  dependencias: string[];
  status: ClosingTaskStatus;
  evidence_ids: string[];
  motivo_bloqueio: string | null;
  criterio_aceite: string;
  proxima_acao: string;
}

export interface ClosingChecklistResult {
  checklist_id: string;
  periodo_referencia: string;
  entidade: string;
  is_closing_blocked: boolean;
  blocking_reasons: string[];
  tasks: ClosingChecklistTask[];
  completed_count: number;
  blocked_count: number;
  pending_count: number;
  model_used: string;
  generated_at: string;
  real_state_summary: {
    unreconciled_items_count: number;
    unsupported_material_items_count: number;
    critical_exceptions_open_count: number;
    unbalanced_proposals_count: number;
    unversioned_policies_count: number;
    post_freeze_unapproved_count: number;
    inconsistent_periods_count: number;
  };
}

// ========================================================
// 8. RELATÓRIO PARA CFO OU CONTROLLER
// ========================================================

export interface CfoClosingReportResult {
  report_id: string;
  periodo: string;
  entidades: string[];
  status_geral: string;
  status_aprovacao_fechamento: 'DADOS_APROVADOS' | 'PENDENTE_DE_APROVACAO' | 'BLOQUEADO_POR_INCONSISTENCIAS';
  aprovado_por?: string;
  aprovado_em?: string;
  
  // 12 Seções Mandatórias
  secao_1_status_geral: string;
  secao_2_periodo_e_entidades: {
    periodo: string;
    entidades: string[];
    status_freeze: string;
  };
  secao_3_contas_fechadas: {
    conta: string;
    nome: string;
    saldo_final: number;
    status: string;
    evidence_id: string;
  }[];
  secao_4_contas_pendentes: {
    conta: string;
    nome: string;
    pendencia: string;
    responsavel: string;
    bloqueio: string;
  }[];
  secao_5_principais_variacoes: {
    rubrica: string;
    valor_anterior: number;
    valor_atual: number;
    variacao_percentual: string;
    explicacao_comprovada: string;
  }[];
  secao_6_excecoes_abertas: {
    id: string;
    categoria: string;
    prioridade: string;
    impacto: string;
    condicao_encerramento: string;
  }[];
  secao_7_lancamentos_manuais: {
    id: string;
    conta_debito: string;
    conta_credito: string;
    valor: number;
    justificativa: string;
    aprovador: string;
  }[];
  secao_8_reversoes: {
    id: string;
    descricao: string;
    valor: number;
    motivo: string;
  }[];
  secao_9_mudancas_de_politica: {
    policy_id: string;
    titulo: string;
    versao: string;
    impacto_adotado: string;
  }[];
  secao_10_riscos: {
    risco: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    mitigacao: string;
  }[];
  secao_11_perguntas_para_aprovacao: string[];
  secao_12_evidencias: {
    evidence_id: string;
    descricao: string;
    modulo_origem: string;
  }[];

  // Separação Obrigatória
  fatos: string[];
  interpretacoes: string[];
  perguntas: string[];
  riscos: string[];

  model_used: string;
  created_at: string;
}


export type ExceptionCategory =
  | 'missing_source'
  | 'duplicate_candidate'
  | 'policy_conflict'
  | 'period_conflict'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'unmapped_account'
  | 'revenue_recognition_review'
  | 'related_party_review'
  | 'materiality_review'
  | 'system_error'
  | 'other';

export type ExceptionPriority = 'baixa' | 'media' | 'alta' | 'critica';

export interface ExceptionTriageResult {
  exception_id: string;
  source_module: 'extraction' | 'classification' | 'journal' | 'revenue' | 'reconciliation' | 'system';
  source_reference_id?: string;
  title: string;
  category: ExceptionCategory;
  model_used: string;
  fatos_observados: string[];
  evidencias_disponiveis: string[];
  evidencias_ausentes: string[];
  impacto_potencial: string;
  prioridade: ExceptionPriority;
  is_material_or_critical: boolean;
  responsavel_sugerido: string;
  proxima_pergunta: string;
  condicao_objetiva_encerramento: string;
  status: 'OPEN' | 'IN_TRIAGE' | 'RESOLVED_BY_HUMAN';
  can_model_close: false; // Sempre false conforme diretriz mandatória
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// ========================================================
// 9. FUNCTION CALLING (AÇÕES CONTROLADAS)
// ========================================================

export type AllowedReadOnlyFunction =
  | 'get_source_document'
  | 'search_policy'
  | 'find_reconciliation_candidates';

export type BlockedMutatingFunction =
  | 'post_journal_entry'
  | 'close_period'
  | 'delete_source'
  | 'change_accounting_policy'
  | 'approve_exception'
  | 'execute_payment';

export interface FunctionCallExecution {
  call_id: string;
  name: string;
  args: Record<string, any>;
  is_read_only: boolean;
  is_blocked_action: boolean;
  block_reason?: string;
  response: any;
  duration_ms: number;
}

export interface AgentStepTurn {
  step: number;
  type: 'user_prompt' | 'model_function_call' | 'backend_tool_execution' | 'model_final_response';
  title: string;
  details: any;
  timestamp: string;
}

export interface FunctionCallingSession {
  session_id: string;
  query: string;
  model_used: string;
  tools_allowed: string[];
  tools_prohibited: string[];
  function_calls: FunctionCallExecution[];
  agent_turns: AgentStepTurn[];
  final_grounded_answer: string;
  status: 'COMPLETED' | 'BLOCKED_ACTION_PREVENTED' | 'ERROR';
  created_at: string;
}

// ========================================================
// 10. VISUALIZAÇÃO DE TENDÊNCIA E HOTSPOTS DE AUDITORIA (CFO)
// ========================================================

export interface MonthlyAuditTrendItem {
  monthKey: string;
  monthLabel: string;
  processedDocuments: number;
  cleanDocuments: number;
  discrepanciesFound: number;
  criticalDiscrepancies: number;
  warningDiscrepancies: number;
  discrepancyRate: number; // %
  totalFinancialVolume: number; // R$
  discrepantFinancialVolume: number; // R$
  isHotspot: boolean;
  hotspotLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
  primaryIssueType: string;
  notes: string;
}

export interface AuditTrendSummary {
  totalProcessedDocuments: number;
  totalDiscrepanciesFound: number;
  overallDiscrepancyRate: number;
  peakHotspotMonth: string;
  peakHotspotRate: number;
  peakHotspotReason: string;
  autoApprovalRate: number;
  totalFinancialExposure: number;
  trends: MonthlyAuditTrendItem[];
}

// ========================================================
// 11. BENCHMARKS DE PREÇOS HISTÓRICOS & ANOMALIAS
// ========================================================

export type PriceAnomalyStatus =
  | 'NORMAL'
  | 'PRICE_SPIKE_WARNING'
  | 'PRICE_SPIKE_CRITICAL'
  | 'SUSPICIOUS_UNDERPRICING'
  | 'UNBENCHMARKED';

export interface PriceBenchmarkItem {
  id: string;
  itemKey: string;
  category:
    | 'CLOUD_INFRASTRUCTURE'
    | 'SOFTWARE_SAAS'
    | 'PROFESSIONAL_SERVICES'
    | 'HARDWARE_EQUIPMENT'
    | 'OFFICE_SUPPLIES'
    | 'TELECOM_DATA'
    | 'FACILITIES_LOGISTICS';
  description: string;
  unit: string;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  currency: string;
  toleranceWarningPct: number;
  toleranceCriticalPct: number;
  sampleSize: number;
  verifiedVendors: string[];
  lastUpdated: string;
}

export interface LineItemPriceBenchmarkComparison {
  itemNumber: number;
  description: string;
  extractedUnitPrice: number;
  extractedQuantity: number;
  extractedLineTotal: number;
  currency: string;
  matchedBenchmark: PriceBenchmarkItem | null;
  benchmarkMedianPrice: number | null;
  benchmarkMinPrice: number | null;
  benchmarkMaxPrice: number | null;
  variancePercentage: number | null;
  varianceAmountPerUnit: number | null;
  estimatedTotalFinancialImpact: number;
  status: PriceAnomalyStatus;
  anomalyTitle: string;
  anomalySeverity: 'normal' | 'warning' | 'critical';
  details: string;
  recommendedAction: string;
}

export interface DocumentPriceBenchmarkAudit {
  documentId: string;
  vendorName: string;
  evaluatedAt: string;
  totalItemsEvaluated: number;
  benchmarkedItemsCount: number;
  anomalousItemsCount: number;
  criticalSpikeCount: number;
  warningSpikeCount: number;
  suspiciousUnderpricingCount: number;
  totalOverpaymentRisk: number;
  overallPricingRiskScore: number; // 0 - 100
  overallStatus: 'APPROVED_BENCHMARK' | 'PRICE_ANOMALY_WARNING' | 'CRITICAL_PRICE_SURCHARGE';
  vendorHistoricalConsistency: 'CONSISTENT_WITH_HISTORY' | 'UNUSUAL_PRICE_INCREASE' | 'FIRST_TIME_VENDOR';
  executiveSummary: string;
  lineComparisons: LineItemPriceBenchmarkComparison[];
}

// ========================================================
// 12. NOTIFICAÇÕES & MONITORAMENTO EM TEMPO REAL (SSE / TOASTS)
// ========================================================

export type NotificationType =
  | 'DOCUMENT_PROCESSED'
  | 'DISCREPANCY_DETECTED'
  | 'BENCHMARK_ANOMALY'
  | 'AUDIT_COMPLETED'
  | 'RECONCILIATION_ALERT'
  | 'EXCEPTION_LOGGED'
  | 'SYSTEM_INFO';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AuditNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  documentId?: string;
  filename?: string;
  vendorName?: string;
  amount?: number;
  currency?: string;
  stepNumber?: number;
  stepName?: string;
  discrepancyType?: string;
  timestamp: string;
  read?: boolean;
  metadata?: Record<string, any>;
}

// ========================================================
// 13. TRIBUTÁRIO AVANÇADO, RETENÇÕES NA FONTE & REFORMA TRIBUTÁRIA
// ========================================================

export interface TaxWithholdingItem {
  taxType: 'IRRF' | 'CSRF_PCC' | 'PIS' | 'COFINS' | 'CSLL' | 'INSS' | 'ISS_RETIDO';
  name: string;
  ratePct: number;
  baseAmount: number;
  withheldAmount: number;
  isMandatory: boolean;
  legalBasis: string;
}

export interface TaxWithholdingBreakdown {
  grossAmount: number;
  totalWithheld: number;
  netPayableAmount: number;
  items: TaxWithholdingItem[];
  darfDarfCodeSuggested: string;
  withholdingStatus: 'RETENCAO_APLICAVEL' | 'DISPENSA_LEGAL' | 'SIMPLES_NACIONAL_ISENTO';
}

export interface TaxReformComparisonItem {
  tributo: string;
  regimeAtualPct: number;
  regimeAtualValor: number;
  regimeNovoPct: number;
  regimeNovoValor: number;
  descricao: string;
}

export interface TaxReformSimulation {
  grossTotal: number;
  currentRegimeTotalTax: number;
  currentRegimeEffectiveRate: number;
  newRegimeTotalTax: number;
  newRegimeEffectiveRate: number;
  taxDifferentialAmount: number;
  isCreditGenerative: boolean;
  estimatedCreditAmount: number;
  splitPaymentEstimate: {
    vendorNetReceipt: number;
    taxAuthoritySplitDirect: number;
    splitPaymentMechanism: string;
  };
  breakdown: TaxReformComparisonItem[];
  impactAssessment: string;
}

export interface SpedAuditIssue {
  bloco: string;
  registro: string;
  campo: string;
  descricao: string;
  severidade: 'erro_impeditivo' | 'aviso_conformidade';
  acaoSugerida: string;
}

export interface SpedAuditReport {
  period: string;
  tipoArquivo: 'EFD_ICMS_IPI' | 'EFD_CONTRIBUICOES' | 'ECD_CONTABIL' | 'ECF_FISCAL';
  totalRegistrosValidados: number;
  totalDocumentosCruzados: number;
  divergenciasApuradas: number;
  statusConformidade: 'APROVADO_SEM_RESSALVAS' | 'RETIFICACAO_OBRIGATORIA' | 'ALERTAS_DETECTADOS';
  issues: SpedAuditIssue[];
}

// ========================================================
// 14. TESOURARIA, FLUXO DE CAIXA D+90 & DDA BANCÁRIO
// ========================================================

export interface CashFlowDayProjection {
  date: string;
  dayLabel: string;
  inflowsExpected: number;
  outflowsCommitted: number;
  netChange: number;
  projectedClosingBalance: number;
  safetyBufferMin: number;
  liquidityStatus: 'HEALTHY' | 'TIGHT' | 'DEFICIT_WARNING';
  inflowCount: number;
  outflowCount: number;
}

export interface DynamicDiscountingProposal {
  id: string;
  documentId: string;
  vendorName: string;
  originalAmount: number;
  originalDueDate: string;
  proposedPaymentDate: string;
  daysAccelerated: number;
  discountRatePct: number;
  discountAmount: number;
  netPaymentAmount: number;
  annualizedRoiPct: number;
  dailyCostOfCapitalBacenCdi: number;
  verdict: 'ALTAMENTE_LUCRATIVO' | 'VIAVEL' | 'NAO_RECOMENDADO';
  financialBenefitExplanation: string;
}

export interface DdaElectronicInvoiceItem {
  id: string;
  barcode: string;
  digitableLine: string;
  beneficiaryCnpj: string;
  beneficiaryName: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  matchedPurchaseOrder?: string | null;
  matchedInternalDocId?: string | null;
  matchStatus: 'MATCHED_WITH_PO' | 'UNEXPECTED_CHARGE_RISK' | 'AMOUNT_DISCREPANCY';
  riskScore: number;
}

// ========================================================
// 15. FP&A, ORÇAMENTO & ANÁLISE DE VARIÂNCIA NARRATIVA
// ========================================================

export interface CostCenterBudget {
  id: string;
  code: string;
  name: string;
  department: string;
  manager: string;
  annualBudget: number;
  ytdActualSpent: number;
  ytdCommitted: number;
  ytdAvailable: number;
  consumptionPct: number;
  status: 'ON_TRACK' | 'ATTENTION' | 'OVERBUDGET_BLOCKED';
}

export interface BudgetVarianceDriver {
  category: string;
  costCenter: string;
  plannedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
  primaryCause: string;
  impactType: 'FAVORABLE' | 'UNFAVORABLE';
}

export interface FpaVarianceAnalysisReport {
  period: string;
  totalBudgetPlanned: number;
  totalActualRealized: number;
  totalVariance: number;
  variancePct: number;
  executiveNarrative: string;
  ebitdaImpactCommentary: string;
  sgaEfficiencyCommentary: string;
  keyDrivers: BudgetVarianceDriver[];
  actionPlan: string[];
  aiModelUsed: string;
}

// ========================================================
// 16. AUDITORIA FORENSE, LEI DE BENFORD & SOX ANTI-FRAUDE
// ========================================================

export interface BenfordDigitStat {
  digit: number;
  theoreticalPct: number;
  observedCount: number;
  observedPct: number;
  differencePct: number;
  isAnomalous: boolean;
}

export interface BenfordLawAnalysisResult {
  totalSampleTransactions: number;
  meanDeviationPct: number;
  chiSquareScore: number;
  pValueConfidence: number;
  conformityLevel: 'CLOSE_CONFORMITY' | 'ACCEPTABLE_CONFORMITY' | 'SUSPICIOUS_NON_CONFORMITY';
  digits: BenfordDigitStat[];
  suspiciousDocumentsFlagged: Array<{
    documentId: string;
    amount: number;
    vendorName: string;
    reason: string;
  }>;
  forensicOpinion: string;
}

export interface SodPolicyRule {
  id: string;
  role1: string;
  role2: string;
  conflictDescription: string;
  severity: 'CRITICAL_BLOCK' | 'WARNING_LOG';
}

export interface SodAuditViolation {
  id: string;
  operatorId: string;
  operatorName: string;
  documentId: string;
  conflictingActivities: string[];
  severity: 'CRITICAL_BLOCK' | 'WARNING_LOG';
  detectedAt: string;
  status: 'ACTIVE_BLOCK' | 'MITIGATED_BY_CFO';
}

export interface CryptographicAuditBlock {
  blockIndex: number;
  timestamp: string;
  actor: string;
  actionType: 'DOCUMENT_EXTRACTED' | 'HUMAN_REVIEW_APPROVED' | 'JOURNAL_POSTED' | 'RECONCILIATION_MATCH' | 'EXCEPTION_RESOLVED';
  documentId: string;
  dataPayloadHash: string;
  previousBlockHash: string;
  blockHash: string;
  signatureCert: string;
  isChainIntact: boolean;
}

// ========================================================
// 17. ESG & CONTABILIDADE DE CARBONO (SCOPE 1, 2, 3)
// ========================================================

export interface InvoiceEsgCarbonEmission {
  id: string;
  documentId: string;
  vendorName: string;
  activityCategory: 'ENERGIA_ELETRICA' | 'COMBUSTIVEL_FROTAS' | 'VIAGENS_CORPORATIVAS' | 'SERVICOS_NUVEM' | 'SUPRIMENTOS_TI';
  scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  rawQuantity: number;
  unit: string;
  ghgEmissionFactor: number;
  totalKgCo2e: number;
  totalTonCo2e: number;
  estimatedOffsetCostBrl: number;
  ghgProtocolMethodology: string;
}

export interface EsgCorporateSustainabilitySummary {
  period: string;
  scope1TonCo2e: number;
  scope2TonCo2e: number;
  scope3TonCo2e: number;
  totalTonCo2e: number;
  carbonIntensityPerRevenue: number; // Ton CO2e por R$ 1M faturado
  greenEnergyPct: number;
  recommendedCarbonCreditsCount: number;
  totalOffsetBudgetBrl: number;
  ghgProtocolAudited: boolean;
}

// ========================================================
// 18. CONECTORES DE ERPS (SAP, TOTVS, NETSUITE, OMIE) & CNDs
// ========================================================

export type ErpSystemTarget = 'SAP_S4HANA' | 'TOTVS_PROTHEUS' | 'ORACLE_NETSUITE' | 'OMIE_CLOUD';

export interface ErpExportRecord {
  id: string;
  erpSystem: ErpSystemTarget;
  documentId: string;
  status: 'READY' | 'TRANSMITTED' | 'CONFIRMED_BY_ERP' | 'SYNC_ERROR';
  generatedAt: string;
  erpTransactionCode: string;
  payloadFormatted: any;
}

export interface VendorCndCertificateStatus {
  vendorCnpj: string;
  vendorName: string;
  cndFederalReceita: { status: 'REGULAR' | 'PENDENTE' | 'EXPIRADA'; code: string; validUntil: string };
  cndFgtsCaixa: { status: 'REGULAR' | 'IRREGULAR'; code: string; validUntil: string };
  cndTrabalhistaTst: { status: 'NEGATIVA' | 'POSITIVA'; code: string; validUntil: string };
  overallCompliance: 'FORNECEDOR_100_REGULAR' | 'RESTRICAO_FISCAL_DETECTADA';
  lastCheckedAt: string;
}








