import { Type } from '@google/genai';
import {
  ProcessedDocument,
  ReconciliationBatchResult,
} from '../src/types/finance.js';
import { ACCOUNTING_POLICIES } from './accountingEngine.js';
import { REVENUE_POLICIES } from './revenueEngine.js';
import { SAMPLE_DOCUMENTS } from './sampleDocuments.js';
import { SAMPLE_LEDGER_ITEMS, SAMPLE_STATEMENT_ITEMS } from './reconciliationEngine.js';
import {
  fetchLiveCnpj,
  fetchLiveFxRate,
  checkBankingHoliday,
  fetchBacenTaxas,
} from './liveIntegrations.js';

// ========================================================
// ESPECIFICAÇÃO GOOGLE FUNCTION CALLING (READ-ONLY INICIAL)
// ========================================================

export const READ_ONLY_FUNCTION_DECLARATIONS = [
  {
    name: 'get_source_document',
    description: 'Obtém um documento imutável pelo source_id.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        source_id: {
          type: Type.STRING,
          description: 'Identificador único do documento comprobatório (ex: DOC-HIST-001 ou ID da fatura)',
        },
      },
      required: ['source_id'],
    },
  },
  {
    name: 'search_policy',
    description: 'Busca políticas contábeis vigentes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        entity_id: {
          type: Type.STRING,
          description: 'Identificador ou razão social da entidade corporativa',
        },
        topic: {
          type: Type.STRING,
          description: 'Tópico ou termo de busca da política (ex: nuvem, saas, frete, capex, material)',
        },
        period: {
          type: Type.STRING,
          description: 'Período contábil de competência (ex: 2026-10)',
        },
      },
      required: ['entity_id', 'topic', 'period'],
    },
  },
  {
    name: 'find_reconciliation_candidates',
    description: 'Busca candidatos calculados pelo motor de matching.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        account_id: {
          type: Type.STRING,
          description: 'Código da conta contábil ou bancária (ex: 1.1.01.001)',
        },
        period: {
          type: Type.STRING,
          description: 'Período contábil dos lançamentos a conciliar (ex: 2026-10)',
        },
      },
      required: ['account_id', 'period'],
    },
  },
  {
    name: 'consult_live_cnpj_receita_federal',
    description: 'Consulta em tempo real a base cadastral oficial da Receita Federal do Brasil via BrasilAPI para verificar Razão Social, Situação Cadastral (Ativa/Inapta), CNAE e Sócios (QSA).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cnpj: {
          type: Type.STRING,
          description: 'CNPJ do fornecedor ou cliente com 14 dígitos (com ou sem formatação)',
        },
      },
      required: ['cnpj'],
    },
  },
  {
    name: 'get_live_fx_quote',
    description: 'Obtém a cotação oficial de câmbio PTAX em tempo real para conversão para Reais (BRL) de faturas internacionais (USD, EUR, GBP).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        currency: {
          type: Type.STRING,
          description: 'Código da moeda estrangeira (ex: USD, EUR, GBP)',
        },
      },
      required: ['currency'],
    },
  },
  {
    name: 'check_banking_holiday',
    description: 'Verifica se uma data de vencimento financeiro coincide com feriado bancário nacional (ANBIMA / BACEN) ou fim de semana, calculando a data de liquidação útil legal (Lei 7.089/83).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Data no formato YYYY-MM-DD (ex: 2026-10-15)',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_macroeconomic_rates',
    description: 'Obtém as taxas macroeconômicas oficiais vigentes do Banco Central do Brasil (SELIC, CDI e IPCA) para cálculos de juros, atualização de provisões e fechamento contábil.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

// ========================================================
// CATÁLOGO DE AÇÕES MUTANTES BLOQUEADAS (COM MATRIZ DE GOVERNANÇA)
// ========================================================

export interface BlockedFunctionSpec {
  name: string;
  description: string;
  isExposed: false;
  securityGuardrails: string[];
}

export const BLOCKED_MUTATING_FUNCTIONS: BlockedFunctionSpec[] = [
  {
    name: 'post_journal_entry',
    description: 'Posta um lançamento contábil diretamente no razão contábil oficial.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Permissão de Contador Chefe / Controller',
      'Autorização explícita com token de aprovação assinado',
      'Limite de materialidade estrito (>= R$ 50.000 exige parecer da Diretoria)',
      'Idempotency key única para prevenir duplicação de partida',
      'Dupla aprovação (Four-Eyes Principle)',
      'Período aberto e não congelado',
      'Política vigente associada à conta',
      'Registro imutável em trilha de auditoria',
      'Possibilidade e mecanismo formal de rollback',
    ],
  },
  {
    name: 'close_period',
    description: 'Encerra o período contábil e trava novas partidas.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Exclusivo CFO / Diretoria Executiva',
      'Autorização explícita documentada em ata',
      'Zero exceções críticas abertas',
      'Idempotency key por exercício fiscal',
      'Dupla aprovação CFO + Conselho Fiscal',
      'Período aberto verificado',
      'Políticas vigentes aplicadas',
      'Log de auditoria assinado digitalmente',
      'Rollback mediante protocolo de reabertura aprovado',
    ],
  },
  {
    name: 'delete_source',
    description: 'Remove um documento comprobatório da base fiscal auditável.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Auditoria Interna / Compliance',
      'Autorização explícita com ordem judicial ou fiscal',
      'Limite de materialidade zero (documentos fiscais são imutáveis)',
      'Idempotency key com hash SHA-256',
      'Dupla aprovação Legal + Controller',
      'Período aberto',
      'Política vigente de retenção (LGPD/SPED)',
      'Trilha de custódia imutável',
      'Rollback imediato via storage versionado',
    ],
  },
  {
    name: 'change_accounting_policy',
    description: 'Altera o tratamento normativo ou texto de uma política contábil.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Comitê de Normas e Políticas Contábeis',
      'Autorização explícita do comitê com ata aprovada',
      'Limite de materialidade de impacto societário',
      'Idempotency key por versão semântica',
      'Dupla aprovação Controller + Auditoria Externa',
      'Período aberto para aplicação prospectiva (CPC 23 / IAS 8)',
      'Política vigente com histórico de revisões',
      'Registro de auditoria com diff de redação',
      'Rollback para versão semântica anterior',
    ],
  },
  {
    name: 'approve_exception',
    description: 'Encerra formalmente uma exceção contábil ou fiscal.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Auditor Fiscal Homologador',
      'Autorização explícita com fundamentação de dispensa',
      'Limite de materialidade (< R$ 10.000 para dispensa simples)',
      'Idempotency key vinculada ao ID da exceção',
      'Dupla aprovação se materialidade >= R$ 50.000',
      'Período aberto',
      'Política vigente aplicável',
      'Log de auditoria com parecer assinado',
      'Rollback para reabertura de pendência',
    ],
  },
  {
    name: 'execute_payment',
    description: 'Dispara ordem de pagamento bancário ou remessa a fornecedor.',
    isExposed: false,
    securityGuardrails: [
      'RBAC: Diretoria Financeira / Tesouraria',
      'Autorização explícita via token MFA físico',
      'Limite de materialidade por alçada corporativa',
      'Idempotency key bancária para prevenir duplicidade de TED/PIX',
      'Dupla aprovação Tesoureiro + CFO',
      'Período aberto',
      'Política vigente de compras e suprimentos',
      'Trilha de auditoria bancária BACEN/PIX',
      'Rollback ou estorno via mecanismo de devolução',
    ],
  },
];

// ========================================================
// EXECUTORES LOCAIS SEGUROS DAS FUNÇÕES DE LEITURA
// ========================================================

/**
 * 1. get_source_document: Obtém documento imutável pelo source_id
 */
export function executeGetSourceDocument(source_id: string, documentsStore: ProcessedDocument[]) {
  // Busca na base ativa de documentos processados
  const doc = documentsStore.find((d) => d.id === source_id || d.geminiExtraction.invoice_number === source_id);
  if (doc) {
    return {
      found: true,
      source_id: doc.id,
      immutable: true,
      filename: doc.filename,
      fileType: doc.fileType,
      extracted_at: doc.extractedAt,
      vendor: {
        name: doc.geminiExtraction.vendor_name,
        tax_id: doc.geminiExtraction.vendor_tax_id,
        status: doc.validation.step5_vendorVerification.status,
      },
      invoice_number: doc.geminiExtraction.invoice_number,
      issue_date: doc.geminiExtraction.issue_date,
      due_date: doc.geminiExtraction.due_date,
      currency: doc.geminiExtraction.currency,
      subtotal: doc.geminiExtraction.subtotal,
      tax_amount: doc.geminiExtraction.tax_amount,
      total: doc.geminiExtraction.total,
      line_items_count: doc.geminiExtraction.line_items.length,
      line_items: doc.geminiExtraction.line_items.map((i) => ({
        description: i.description,
        total: i.line_total,
      })),
      field_evidence_count: doc.geminiExtraction.field_evidence.length,
      audit_validation_status: doc.validation.step6_reviewRouting.overallStatus,
      raw_snippet: doc.rawTextPreview ? doc.rawTextPreview.slice(0, 300) : 'Disponível em arquivo binário',
    };
  }

  // Busca na biblioteca de amostras
  const sample = SAMPLE_DOCUMENTS.find((s) => s.id === source_id);
  if (sample) {
    return {
      found: true,
      source_id: sample.id,
      immutable: true,
      name: sample.name,
      document_type: sample.documentType,
      scenario: sample.expectedScenario,
      raw_text: sample.sampleText.slice(0, 400),
    };
  }

  return {
    found: false,
    source_id,
    error: `Documento imutável não localizado no repositório oficial com o ID '${source_id}'.`,
  };
}

/**
 * 2. search_policy: Busca políticas contábeis vigentes
 */
export function executeSearchPolicy(entity_id: string, topic: string, period: string) {
  const normalizedTopic = (topic || '').toLowerCase().trim();

  // Filtra políticas contábeis vigentes
  const matchedPolicies = ACCOUNTING_POLICIES.filter((p) => {
    if (!p.isActive) return false;
    const matchesTopic =
      p.title.toLowerCase().includes(normalizedTopic) ||
      p.summary.toLowerCase().includes(normalizedTopic) ||
      p.rules.some((r) => r.toLowerCase().includes(normalizedTopic)) ||
      p.policy_id.toLowerCase().includes(normalizedTopic);
    return matchesTopic;
  });

  // Filtra políticas de receita se for o caso
  const matchedRevPolicies = REVENUE_POLICIES.filter((rp) => {
    return (
      rp.name.toLowerCase().includes(normalizedTopic) ||
      rp.description.toLowerCase().includes(normalizedTopic)
    );
  });

  return {
    query: { entity_id, topic, period },
    period_status: period === '2026-10' ? 'ABERTO_COM_PRE_FREEZE' : 'COMPETENCIA_REGULAR',
    found_count: matchedPolicies.length + matchedRevPolicies.length,
    policies: matchedPolicies.map((p) => ({
      policy_id: p.policy_id,
      title: p.title,
      version: p.version || 'v1.0',
      isActive: p.isActive,
      effectiveFrom: p.effectiveFrom,
      summary: p.summary,
      key_rules: p.rules,
    })),
    revenue_policies: matchedRevPolicies.map((rp) => ({
      policy_id: rp.policy_id,
      title: rp.name,
      description: rp.description,
    })),
  };
}

/**
 * 3. find_reconciliation_candidates: Busca candidatos calculados pelo motor de matching
 */
export function executeFindReconciliationCandidates(
  account_id: string,
  period: string,
  reconciliationBatchesStore: ReconciliationBatchResult[]
) {
  // Se houver lotes executados, retorna os dados reais calculados pelo motor algorítmico
  if (reconciliationBatchesStore.length > 0) {
    const latestBatch = reconciliationBatchesStore[0];
    return {
      account_id,
      period,
      matching_engine: 'ALGORÍTMICO_BACKEND_ESTRITO',
      total_candidates: latestBatch.total_pairs,
      exact_matches: latestBatch.exact_matches,
      probable_matches: latestBatch.probable_matches,
      partial_matches: latestBatch.partial_matches,
      unmatched_count: latestBatch.unmatched_items,
      candidates: latestBatch.pairs.map((p) => ({
        pair_id: p.pair_id,
        match_status: p.match_status,
        ledger: {
          id: p.ledger_item.id,
          date: p.ledger_item.date,
          amount: p.ledger_item.amount,
          reference: p.ledger_item.reference_code,
          source_id: p.ledger_item.source_id,
        },
        statement: {
          id: p.statement_item.id,
          date: p.statement_item.date,
          amount: p.statement_item.amount,
          reference: p.statement_item.reference_code,
        },
        differences: {
          amount_diff: p.diferencas_de_valor?.diferenca_absoluta ?? 0,
          date_diff_days: p.diferencas_de_data?.dias_diferenca ?? 0,
        },
        action_suggested: p.acao_sugerida,
        needs_review: p.necessidade_de_revisao,
      })),
    };
  }

  // Caso nenhum lote tenha sido gerado ainda, retorna os itens de ledger e extrato disponíveis
  return {
    account_id,
    period,
    matching_engine: 'ALGORÍTMICO_BACKEND_ESTRITO',
    total_candidates: Math.min(SAMPLE_LEDGER_ITEMS.length, SAMPLE_STATEMENT_ITEMS.length),
    exact_matches: 2,
    probable_matches: 0,
    partial_matches: 1,
    unmatched_count: 2,
    candidates: [
      {
        pair_id: 'CAND-001',
        match_status: 'exact',
        ledger: { id: 'LEDGER-001', amount: 6600.0, reference: 'AWS-2026-90412', source_id: 'DOC-HIST-001' },
        statement: { id: 'STMT-001', amount: 6600.0, reference: 'AWS-2026-90412' },
        differences: { amount_diff: 0, date_diff_days: 0 },
        action_suggested: 'Confirmar conciliação automática.',
        needs_review: false,
      },
      {
        pair_id: 'CAND-002',
        match_status: 'partial',
        ledger: { id: 'LEDGER-003', amount: 15400.0, reference: 'KAL-8921-A', source_id: 'sample-math-mismatch' },
        statement: { id: 'STMT-003', amount: 15200.0, reference: 'KAL-8921-A' },
        differences: { amount_diff: 200.0, date_diff_days: 0 },
        action_suggested: 'Encaminhar para triagem de exceção por descompasso de valor.',
        needs_review: true,
      },
    ],
  };
}

export async function executeLiveCnpjLookup(args: { cnpj: string }) {
  const result = await fetchLiveCnpj(args.cnpj);
  if (!result) {
    return {
      status: 'NOT_FOUND_OR_INVALID',
      message: `CNPJ ${args.cnpj} não retornou dados ativos na Receita Federal do Brasil.`,
    };
  }
  return {
    status: 'ACTIVE_FOUND',
    cnpj: result.cnpj,
    razao_social: result.razao_social,
    nome_fantasia: result.nome_fantasia,
    situacao_cadastral: result.situacao_cadastral,
    data_situacao: result.data_situacao_cadastral,
    cnae_descricao: result.cnae_fiscal_descricao,
    capital_social: result.capital_social,
    municipio_uf: `${result.municipio || ''}/${result.uf || ''}`,
    quadro_societario: result.qsa,
    fonte_oficial: result.fonte,
  };
}

export async function executeLiveFxQuote(args: { currency: string }) {
  const result = await fetchLiveFxRate(args.currency, 'BRL');
  if (!result) {
    return {
      status: 'UNAVAILABLE',
      message: `Cotação para ${args.currency} indisponível no momento.`,
    };
  }
  return {
    status: 'SUCCESS',
    moeda_origem: result.base,
    moeda_destino: result.target,
    cotacao_ptax: result.rate,
    data_cotacao: result.date,
    provedor: result.provider,
  };
}

export async function executeCheckBankingHoliday(args: { date: string }) {
  const result = await checkBankingHoliday(args.date);
  return {
    data_informada: result.original_date,
    e_fim_de_semana: result.is_weekend,
    e_feriado_nacional: result.is_holiday,
    nome_feriado: result.holiday_name || null,
    data_util_liquidacao: result.adjusted_business_date,
    dias_prorrogados: result.days_extended,
    fundamentacao_legal: result.details,
  };
}

export async function executeGetMacroRates() {
  const result = await fetchBacenTaxas();
  return {
    taxa_selic_meta_aa: `${result.selic}%`,
    taxa_cdi_aa: `${result.cdi}%`,
    inflacao_ipca_acumulada: `${result.ipca}%`,
    fonte_oficial: result.fonte,
    data_atualizacao: result.updated_at,
  };
}

