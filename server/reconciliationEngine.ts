import {
  BankStatementTransactionItem,
  LedgerTransactionItem,
  MatchStatus,
  ReconciliationPairCandidate,
} from '../src/types/finance.js';

export const SAMPLE_LEDGER_ITEMS: LedgerTransactionItem[] = [
  {
    id: 'LEDGER-001',
    source_id: 'DOC-HIST-001',
    date: '2026-09-15',
    description: 'Pagamento Fatura AWS Nuvem Setembro',
    amount: 6600.0,
    currency: 'BRL',
    reference_code: 'AWS-2026-90412',
    counterparty: 'AWS Serviços de Nuvem Ltda',
  },
  {
    id: 'LEDGER-002',
    source_id: 'DOC-NF-88194',
    date: '2026-09-20',
    description: 'Compra Material Escritório Kalunga',
    amount: 2800.0,
    currency: 'BRL',
    reference_code: 'NF-88194',
    counterparty: 'Kalunga Comércio e Indústria Gráfica',
  },
  {
    id: 'LEDGER-003',
    source_id: 'DOC-INV-US-44',
    date: '2026-09-22',
    description: 'Assinatura Plataforma Monitoramento Dev',
    amount: 1500.0,
    currency: 'USD',
    reference_code: 'INV-US-991',
    counterparty: 'Acme Solutions Inc',
  },
  {
    id: 'LEDGER-004',
    // SEM SOURCE_ID PARA TESTAR REGRA DE REJEIÇÃO MANDATÓRIA
    source_id: undefined,
    date: '2026-09-24',
    description: 'Lançamento Manual de Tarifas de Manutenção',
    amount: 350.0,
    currency: 'BRL',
    reference_code: 'REF-MANUAL-004',
    counterparty: 'Banco Bradesco S.A.',
  },
  {
    id: 'LEDGER-005',
    source_id: 'DOC-GSL-7701',
    date: '2026-09-28',
    description: 'Frete e Transporte Rodoviário Especial',
    amount: 5432.0,
    currency: 'BRL',
    reference_code: 'GSL-7701',
    counterparty: 'Global Supply Logistics Ltda',
  },
];

export const SAMPLE_STATEMENT_ITEMS: BankStatementTransactionItem[] = [
  {
    id: 'STMT-001',
    source_id: 'EXTR-BRAD-901',
    date: '2026-09-15',
    description: 'DEB AUT AWS NUVEM BRASIL',
    amount: 6600.0,
    currency: 'BRL',
    reference_code: 'AWS-2026-90412',
    bank_name: 'Banco Bradesco S.A.',
  },
  {
    id: 'STMT-002',
    source_id: 'EXTR-BRAD-902',
    date: '2026-09-22',
    description: 'TED KALUNGA GRAFICA (DESCONTO RETENCAO)',
    amount: 2785.0, // Diferença de R$ 15,00
    currency: 'BRL',
    reference_code: 'NF-88194',
    bank_name: 'Banco Bradesco S.A.',
  },
  {
    id: 'STMT-003',
    source_id: 'EXTR-ITAU-903',
    date: '2026-09-23',
    description: 'REMESSA CAMBIO ACME SOLUTIONS',
    amount: 8250.0, // Em BRL no extrato vs USD 1500 no razão
    currency: 'BRL',
    reference_code: 'INV-US-991',
    bank_name: 'Banco Itaú S.A.',
  },
  {
    id: 'STMT-004',
    source_id: 'EXTR-BRAD-904',
    date: '2026-09-24',
    description: 'TAR MANUTENCAO CONTA CORRENTE',
    amount: 350.0,
    currency: 'BRL',
    reference_code: 'TAR-09-2026',
    bank_name: 'Banco Bradesco S.A.',
  },
  {
    id: 'STMT-005',
    source_id: 'EXTR-BRAD-905',
    date: '2026-09-29',
    description: 'PGTO ELETRONICO GLOBAL SUPPLY',
    amount: 5432.0,
    currency: 'BRL',
    reference_code: 'GSL-7701',
    bank_name: 'Banco Bradesco S.A.',
  },
];

// Algorithmic rules evaluator (Backend authority)
export function evaluateReconciliationAlgorithm(
  ledger: LedgerTransactionItem,
  stmt: BankStatementTransactionItem,
  matchedLedgerIds: Set<string>,
  matchedStmtIds: Set<string>
): ReconciliationPairCandidate {
  const ruleViolations: string[] = [];
  const evidencias: string[] = [];

  // 1. Diferença de Valor
  const diffValor = Math.round(Math.abs(ledger.amount - stmt.amount) * 100) / 100;
  const isWithinTolerance = diffValor <= 0.01;

  // 2. Diferença de Data
  const d1 = new Date(`${ledger.date}T00:00:00`).getTime();
  const d2 = new Date(`${stmt.date}T00:00:00`).getTime();
  const diasDiff = Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));

  // 3. Diferença de Moeda
  const hasCurrencyMismatch = ledger.currency.toUpperCase() !== stmt.currency.toUpperCase();
  const conversaoDocumentada = false; // Exige conversão cambial formal para reconciliar

  // 4. Similaridade de Referência
  const ref1 = (ledger.reference_code || '').toLowerCase().trim();
  const ref2 = (stmt.reference_code || '').toLowerCase().trim();
  const isRefExact = ref1.length > 2 && (ref1 === ref2 || ref2.includes(ref1));

  // APLICAÇÃO DAS 4 REGRAS MANDATÓRIAS
  // Regra 1: diferença acima da tolerância nunca pode ser exact
  // Regra 2: uma transação não pode ser casada duas vezes
  // Regra 3: moeda diferente exige conversão documentada
  // Regra 4: transação sem source_id não pode ser considerada reconciliada

  if (matchedLedgerIds.has(ledger.id)) {
    ruleViolations.push(`VIOLAÇÃO REGRA 2: A transação do razão '${ledger.id}' já foi casada anteriormente.`);
  }
  if (matchedStmtIds.has(stmt.id)) {
    ruleViolations.push(`VIOLAÇÃO REGRA 2: A transação de extrato '${stmt.id}' já foi casada anteriormente.`);
  }

  if (hasCurrencyMismatch) {
    ruleViolations.push(
      `VIOLAÇÃO REGRA 3: Moedas divergentes (${ledger.currency} vs ${stmt.currency}). Requer conversão cambial documentada e aprovada.`
    );
  }

  if (!ledger.source_id) {
    ruleViolations.push(
      `VIOLAÇÃO REGRA 4: A transação do razão '${ledger.id}' não possui 'source_id' de documento comprobatório.`
    );
  }
  if (!stmt.source_id) {
    ruleViolations.push(
      `VIOLAÇÃO REGRA 4: A transação de extrato '${stmt.id}' não possui 'source_id'.`
    );
  }

  // Determinação algorítmica do status preliminar
  let match_status: MatchStatus = 'no_match';
  let confidence = 0.5;
  let acao_sugerida = '';
  let necessidade_de_revisao = false;

  if (ruleViolations.length > 0) {
    match_status = 'insufficient_data';
    necessidade_de_revisao = true;
    confidence = 0.4;
    acao_sugerida = 'Encaminhar para conciliação manual por violação de regras de conformidade.';
  } else if (isWithinTolerance && diasDiff <= 1 && isRefExact && !hasCurrencyMismatch) {
    match_status = 'exact';
    confidence = 0.99;
    evidencias.push(`Valor idêntico (${ledger.currency} ${ledger.amount.toFixed(2)})`);
    evidencias.push(`Referência idêntica ('${ledger.reference_code}')`);
    evidencias.push(`Datas coincidentes (Diferença de ${diasDiff} dia)`);
    acao_sugerida = 'Validado algoritmicamente para baixa contábil automática.';
    necessidade_de_revisao = false;
  } else if (isWithinTolerance && diasDiff <= 5) {
    match_status = 'probable';
    confidence = 0.85;
    evidencias.push(`Valores batem (${ledger.currency} ${ledger.amount.toFixed(2)})`);
    evidencias.push(`Janela de liquidação de ${diasDiff} dias (compensação bancária)`);
    acao_sugerida = 'Conferir descrição no extrato antes de autorizar.';
    necessidade_de_revisao = true;
  } else if (!isWithinTolerance && isRefExact) {
    match_status = 'partial';
    confidence = 0.70;
    evidencias.push(`Mesma referência '${ledger.reference_code}', mas valor difere em R$ ${diffValor.toFixed(2)}`);
    acao_sugerida = 'Verificar se houve dedução de tarifas bancárias ou retenções na fonte.';
    necessidade_de_revisao = true;
  } else {
    match_status = 'no_match';
    confidence = 0.2;
    acao_sugerida = 'Nenhum vínculo algorítmico identificado.';
    necessidade_de_revisao = true;
  }

  // Regra 1 estrita: Se houver qualquer violação ou diferença > tolerância, NUNCA pode ser exact
  if (!isWithinTolerance && match_status === 'exact') {
    match_status = 'partial';
  }

  return {
    pair_id: `PAIR-${ledger.id}-${stmt.id}`,
    ledger_item: ledger,
    statement_item: stmt,
    match_status,
    evidencias,
    diferencas_de_data: {
      dias_diferenca: diasDiff,
      detalhes: diasDiff === 0 ? 'Mesma data contábil e de extrato.' : `Diferença de ${diasDiff} dia(s).`,
    },
    diferencas_de_valor: {
      diferenca_absoluta: diffValor,
      is_within_tolerance: isWithinTolerance,
      detalhes: isWithinTolerance
        ? 'Valores rigorosamente idênticos dentro da tolerância de R$ 0,01.'
        : `Divergência de R$ ${diffValor.toFixed(2)}.`,
    },
    diferencas_de_moeda: {
      moeda_ledger: ledger.currency,
      moeda_statement: stmt.currency,
      has_currency_mismatch: hasCurrencyMismatch,
      conversao_documentada: conversaoDocumentada,
      detalhes: hasCurrencyMismatch
        ? `Moeda Razão: ${ledger.currency} vs Extrato: ${stmt.currency}`
        : 'Mesma moeda financeira.',
    },
    diferenca_de_referencia: {
      similaridade_percentual: isRefExact ? 100 : ref1 && ref2 && (ref1.includes(ref2) || ref2.includes(ref1)) ? 75 : 20,
      detalhes: isRefExact ? 'Códigos de referência idênticos.' : `Razão: '${ledger.reference_code}' vs Extrato: '${stmt.reference_code}'.`,
    },
    acao_sugerida,
    confidence,
    necessidade_de_revisao,
    rule_violations: ruleViolations,
    is_reconciled: match_status === 'exact' && ruleViolations.length === 0,
  };
}
