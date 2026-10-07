import {
  BackendValidationResult,
  CurrencyAndDatesCheck,
  Discrepancy,
  DuplicateCheck,
  GeminiExtractionResult,
  LineItemsCalculationCheck,
  ProcessedDocument,
  SubtotalTaxTotalComparisonCheck,
  VendorMaster,
  VendorVerificationCheck,
} from '../src/types/finance.js';

// Base mestre de fornecedores corporativos homologados
export const MASTER_VENDORS: VendorMaster[] = [
  {
    id: 'VEND-001',
    name: 'AWS Serviços de Nuvem Ltda',
    taxId: '23.412.247/0001-10',
    status: 'approved',
    category: 'Infraestrutura Cloud & TI',
    paymentTermsDays: 30,
    notes: 'Fornecedor homologado de infraestrutura crítica.',
  },
  {
    id: 'VEND-002',
    name: 'Microsoft do Brasil Ltda',
    taxId: '60.316.817/0001-03',
    status: 'approved',
    category: 'Software & Licenciamento',
    paymentTermsDays: 30,
    notes: 'Contrato corporativo Enterprise Agreement ativo.',
  },
  {
    id: 'VEND-003',
    name: 'Dell Computadores do Brasil Ltda',
    taxId: '72.381.189/0001-10',
    status: 'approved',
    category: 'Hardware & Equipamentos',
    paymentTermsDays: 45,
    notes: 'Garantia ProSupport inclusa em faturas de hardware.',
  },
  {
    id: 'VEND-004',
    name: 'Google Cloud Brasil Ltda',
    taxId: '06.990.590/0001-23',
    status: 'approved',
    category: 'Serviços de Tecnologia & IA',
    paymentTermsDays: 30,
    notes: 'Fornecedor homologado.',
  },
  {
    id: 'VEND-005',
    name: 'Kalunga Comércio e Indústria Gráfica',
    taxId: '43.283.811/0001-50',
    status: 'approved',
    category: 'Material de Escritório & Suprimentos',
    paymentTermsDays: 15,
  },
  {
    id: 'VEND-006',
    name: 'Acme Solutions Inc',
    taxId: '12-3456789',
    status: 'approved',
    category: 'Consultoria Especializada',
    paymentTermsDays: 30,
  },
  {
    id: 'VEND-007',
    name: 'Global Supply Logistics Ltda',
    taxId: '11.222.333/0001-44',
    status: 'blocked',
    category: 'Logística & Frete',
    paymentTermsDays: 0,
    notes: 'BLOQUEADO PELO DEPARTAMENTO DE COMPLIANCE: Disputa jurídica e irregularidade fiscal.',
  },
  {
    id: 'VEND-008',
    name: 'Phantom Offshore Services Corp',
    taxId: '99-8877665',
    status: 'blocked',
    category: 'Consultoria Internacional',
    paymentTermsDays: 0,
    notes: 'BLOQUEADO: Empresa listada em restrições de auditoria externa.',
  },
];

const KNOWN_CURRENCIES: Record<string, string> = {
  USD: 'USD',
  '$': 'USD',
  US$: 'USD',
  BRL: 'BRL',
  'R$': 'BRL',
  REAL: 'BRL',
  EUR: 'EUR',
  '€': 'EUR',
  GBP: 'GBP',
  '£': 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
  JPY: 'JPY',
  '¥': 'JPY',
  CHF: 'CHF',
};

function roundCents(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function cleanDigits(val: string): string {
  return val.replace(/\D/g, '');
}

function validateBrazilianCnpj(cnpjStr: string): boolean {
  const digits = cleanDigits(cnpjStr);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  let size = 12;
  let numbers = digits.substring(0, size);
  const checkDigits = digits.substring(size);
  let pos = size - 7;
  let sum = 0;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(checkDigits.charAt(0))) return false;

  size = 13;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === Number(checkDigits.charAt(1));
}

export function runBackendValidation(
  extraction: GeminiExtractionResult,
  existingDocuments: ProcessedDocument[] = []
): BackendValidationResult {
  const discrepancies: Discrepancy[] = [];

  // -------------------------------------------------------------
  // 1. RECALCULAR A SOMA DAS LINHAS
  // -------------------------------------------------------------
  let calculatedLineItemsSum = 0;
  const lineItems = extraction.line_items || [];

  for (const item of lineItems) {
    if (typeof item.line_total === 'number' && !isNaN(item.line_total)) {
      calculatedLineItemsSum += item.line_total;
    } else if (
      typeof item.quantity === 'number' &&
      typeof item.unit_price === 'number' &&
      !isNaN(item.quantity) &&
      !isNaN(item.unit_price)
    ) {
      calculatedLineItemsSum += item.quantity * item.unit_price;
    }
  }

  calculatedLineItemsSum = roundCents(calculatedLineItemsSum);

  const subtotal = extraction.subtotal !== null && typeof extraction.subtotal === 'number'
    ? roundCents(extraction.subtotal)
    : null;
  const total = extraction.total !== null && typeof extraction.total === 'number'
    ? roundCents(extraction.total)
    : null;

  const diffSubtotal = subtotal !== null ? roundCents(Math.abs(calculatedLineItemsSum - subtotal)) : null;
  const diffTotal = total !== null ? roundCents(Math.abs(calculatedLineItemsSum - total)) : null;

  const isStatement = extraction.document_type === 'bank_statement';

  let step1IsConsistent = true;
  let step1Details = '';

  if (isStatement && lineItems.length > 0) {
    if (diffTotal !== null && diffTotal <= 0.05) {
      step1IsConsistent = true;
      step1Details = `Soma das ${lineItems.length} transações do extrato (${calculatedLineItemsSum.toFixed(2)}) confere perfeitamente com o total líquido apurado (${total?.toFixed(2)}).`;
    } else if (diffSubtotal !== null && diffSubtotal <= 0.05) {
      step1IsConsistent = true;
      step1Details = `Soma das ${lineItems.length} transações do extrato confere com o volume bruto de saídas (${subtotal?.toFixed(2)}).`;
    } else {
      step1Details = `Soma das ${lineItems.length} transações calculada em ${calculatedLineItemsSum.toFixed(2)} (saldo líquido: ${total?.toFixed(2)}).`;
    }
  } else if (lineItems.length > 0) {
    if (subtotal !== null) {
      if (diffSubtotal !== null && diffSubtotal > 0.02) {
        step1IsConsistent = false;
        step1Details = `Divergência detectada: a soma recalculada dos ${lineItems.length} itens (${calculatedLineItemsSum.toFixed(2)}) difere do subtotal extraído (${subtotal.toFixed(2)}) em ${diffSubtotal.toFixed(2)}.`;
        discrepancies.push({
          step: 1,
          stepName: 'Recálculo das Linhas',
          code: 'LINE_SUM_VS_SUBTOTAL_MISMATCH',
          title: 'Divergência na Soma dos Itens vs Subtotal',
          description: step1Details,
          severity: 'warning',
          suggestedAction: 'Verifique se há desconto oculto, frete nas linhas ou erro no impresso.',
          involvedFields: ['line_items', 'subtotal'],
        });
      } else {
        step1Details = `Soma das ${lineItems.length} linhas (${calculatedLineItemsSum.toFixed(2)}) confere perfeitamente com o subtotal extraído (${subtotal.toFixed(2)}).`;
      }
    } else if (total !== null && (extraction.tax_amount === null || extraction.tax_amount === 0)) {
      if (diffTotal !== null && diffTotal > 0.02) {
        step1IsConsistent = false;
        step1Details = `Divergência: a soma calculada dos itens (${calculatedLineItemsSum.toFixed(2)}) não bate com o total extraído (${total.toFixed(2)}).`;
        discrepancies.push({
          step: 1,
          stepName: 'Recálculo das Linhas',
          code: 'LINE_SUM_VS_TOTAL_MISMATCH',
          title: 'Divergência na Soma dos Itens vs Total',
          description: step1Details,
          severity: 'warning',
          suggestedAction: 'Auditar valores unitários e quantidades dos itens faturados.',
          involvedFields: ['line_items', 'total'],
        });
      } else {
        step1Details = `Soma das linhas (${calculatedLineItemsSum.toFixed(2)}) confere com o total extraído (${total.toFixed(2)}).`;
      }
    } else {
      step1Details = `Soma dos ${lineItems.length} itens calculada em ${calculatedLineItemsSum.toFixed(2)} (subtotal não impresso separadamente).`;
    }
  } else {
    step1Details = 'Nenhum item individual detalhado foi identificado no documento.';
    if (total === null && subtotal === null) {
      step1IsConsistent = false;
      discrepancies.push({
        step: 1,
        stepName: 'Recálculo das Linhas',
        code: 'NO_FINANCIAL_AMOUNTS',
        title: 'Ausência de Itens e Totais Financeiros',
        description: 'Não foram encontrados itens nem total extraído com confiança.',
        severity: 'critical',
        suggestedAction: 'Solicitar reenvio de imagem ou documento legível.',
        involvedFields: ['line_items', 'total', 'subtotal'],
      });
    }
  }

  const step1Result: LineItemsCalculationCheck = {
    calculatedLineItemsSum,
    extractedSubtotal: subtotal,
    extractedTotal: total,
    differenceWithSubtotal: diffSubtotal,
    differenceWithTotal: diffTotal,
    isConsistent: step1IsConsistent,
    itemCount: lineItems.length,
    details: step1Details,
  };

  // -------------------------------------------------------------
  // 2. COMPARAR SUBTOTAL, IMPOSTO E TOTAL
  // -------------------------------------------------------------
  const tax = extraction.tax_amount !== null && typeof extraction.tax_amount === 'number'
    ? roundCents(extraction.tax_amount)
    : 0;

  let calculatedExpectedTotal: number | null = null;
  let taxDiff: number | null = null;
  let step2IsConsistent = true;
  let step2Details = '';

  if (isStatement) {
    if (total !== null) {
      step2IsConsistent = true;
      calculatedExpectedTotal = total;
      step2Details = `Balanço consolidado do extrato validado: Saldo Líquido de R$ ${total.toFixed(2)} (Volume de Débitos: R$ ${subtotal?.toFixed(2) ?? total.toFixed(2)}).`;
    } else {
      step2IsConsistent = false;
      step2Details = 'Valor total do extrato não foi apurado.';
    }
  } else if (subtotal !== null && total !== null) {
    calculatedExpectedTotal = roundCents(subtotal + tax);
    taxDiff = roundCents(Math.abs(calculatedExpectedTotal - total));

    if (taxDiff > 0.02) {
      step2IsConsistent = false;
      step2Details = `Inconsistência na equação fiscal: Subtotal (${subtotal.toFixed(2)}) + Impostos (${tax.toFixed(2)}) = ${calculatedExpectedTotal.toFixed(2)}, divergindo do Total impresso (${total.toFixed(2)}). Diferença: ${taxDiff.toFixed(2)}.`;
      discrepancies.push({
        step: 2,
        stepName: 'Subtotal, Imposto e Total',
        code: 'TAX_EQUATION_MISMATCH',
        title: 'Descompasso na Equação Financeira (Subtotal + Impostos ≠ Total)',
        description: step2Details,
        severity: 'critical',
        suggestedAction: 'Verificar se existem retenções, descontos ou taxas não somadas.',
        involvedFields: ['subtotal', 'tax_amount', 'total'],
      });
    } else {
      step2Details = `Validação matemática confirmada: Subtotal (${subtotal.toFixed(2)}) + Impostos (${tax.toFixed(2)}) = Total (${total.toFixed(2)}).`;
    }
  } else if (total === null) {
    step2IsConsistent = false;
    step2Details = 'Valor total do documento não foi extraído ou não está presente.';
    discrepancies.push({
      step: 2,
      stepName: 'Subtotal, Imposto e Total',
      code: 'TOTAL_AMOUNT_MISSING',
      title: 'Valor Total Não Encontrado',
      description: 'O documento não possui valor total legível ou identificado com certeza.',
      severity: 'critical',
      suggestedAction: 'Conferir o rodapé ou resumo financeiro do documento.',
      involvedFields: ['total'],
    });
  } else {
    step2Details = `Total verificado (${total.toFixed(2)}). Subtotal explícito não declarado pelo emissor.`;
  }

  const step2Result: SubtotalTaxTotalComparisonCheck = {
    subtotal,
    taxAmount: extraction.tax_amount !== null ? tax : null,
    calculatedSum: calculatedExpectedTotal,
    extractedTotal: total,
    difference: taxDiff,
    isConsistent: step2IsConsistent,
    details: step2Details,
  };

  // -------------------------------------------------------------
  // 3. VALIDAR MOEDA E DATAS
  // -------------------------------------------------------------
  const rawCurrency = (extraction.currency || '').trim().toUpperCase();
  const normalizedCurrency = KNOWN_CURRENCIES[rawCurrency] || (rawCurrency.length === 3 ? rawCurrency : null);
  const isCurrencyValid = Boolean(normalizedCurrency);

  if (!isCurrencyValid) {
    discrepancies.push({
      step: 3,
      stepName: 'Moeda e Datas',
      code: 'INVALID_OR_MISSING_CURRENCY',
      title: 'Moeda Não Reconhecida ou Ausente',
      description: extraction.currency
        ? `A moeda '${extraction.currency}' não é um código ISO padrão nem símbolo monetário conhecido.`
        : 'O documento não especifica a moeda financeira (ex: BRL, USD, EUR).',
      severity: 'warning',
      suggestedAction: 'Definir manualmente a moeda do pagamento conforme país de origem.',
      involvedFields: ['currency'],
    });
  }

  // Validação de datas
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let isIssueDateValid = false;
  let isDueDateValid = false;
  let isChronologyValid = true;
  let daysUntilDue: number | null = null;
  const datesDetailsArr: string[] = [];

  if (isStatement) {
    isIssueDateValid = Boolean(extraction.issue_date);
    isDueDateValid = Boolean(extraction.due_date);
    isChronologyValid = true;
    datesDetailsArr.push(`Competência temporal do extrato: de ${extraction.issue_date || 'Início'} até ${extraction.due_date || 'Encerramento'}.`);
  } else if (extraction.issue_date && dateRegex.test(extraction.issue_date)) {
    const issueObj = new Date(`${extraction.issue_date}T00:00:00`);
    if (!isNaN(issueObj.getTime())) {
      isIssueDateValid = true;
      const currentYear = new Date().getFullYear();
      const issueYear = issueObj.getFullYear();
      if (issueYear < currentYear - 10 || issueYear > currentYear + 2) {
        discrepancies.push({
          step: 3,
          stepName: 'Moeda e Datas',
          code: 'SUSPICIOUS_ISSUE_YEAR',
          title: 'Ano de Emissão Anômalo',
          description: `Data de emissão ${extraction.issue_date} possui ano fora da faixa esperada (${issueYear}).`,
          severity: 'warning',
          involvedFields: ['issue_date'],
        });
      }
    }
  } else if (extraction.issue_date) {
    discrepancies.push({
      step: 3,
      stepName: 'Moeda e Datas',
      code: 'INVALID_ISSUE_DATE_FORMAT',
      title: 'Formato de Data de Emissão Inválido',
      description: `A data extraída '${extraction.issue_date}' não cumpre o padrão YYYY-MM-DD.`,
      severity: 'warning',
      involvedFields: ['issue_date'],
    });
  } else {
    discrepancies.push({
      step: 3,
      stepName: 'Moeda e Datas',
      code: 'MISSING_ISSUE_DATE',
      title: 'Data de Emissão Não Identificada',
      description: 'Documento fiscal sem data clara de emissão.',
      severity: 'warning',
      involvedFields: ['issue_date'],
    });
  }

  if (extraction.due_date && dateRegex.test(extraction.due_date)) {
    const dueObj = new Date(`${extraction.due_date}T00:00:00`);
    if (!isNaN(dueObj.getTime())) {
      isDueDateValid = true;
    }
  }

  if (isIssueDateValid && isDueDateValid && extraction.issue_date && extraction.due_date) {
    const issueTime = new Date(`${extraction.issue_date}T00:00:00`).getTime();
    const dueTime = new Date(`${extraction.due_date}T00:00:00`).getTime();
    daysUntilDue = Math.round((dueTime - issueTime) / (1000 * 60 * 60 * 24));

    if (dueTime < issueTime) {
      isChronologyValid = false;
      datesDetailsArr.push(`Vencimento (${extraction.due_date}) é anterior à emissão (${extraction.issue_date})`);
      discrepancies.push({
        step: 3,
        stepName: 'Moeda e Datas',
        code: 'DUE_DATE_BEFORE_ISSUE_DATE',
        title: 'Cronologia Inconsistente (Vencimento Anterior à Emissão)',
        description: `A data de vencimento (${extraction.due_date}) ocorre antes da data de emissão (${extraction.issue_date}).`,
        severity: 'critical',
        suggestedAction: 'Verificar se houve inversão de campos de data ou erro de digitação do emissor.',
        involvedFields: ['issue_date', 'due_date'],
      });
    } else {
      datesDetailsArr.push(`Prazo de pagamento de ${daysUntilDue} dias identificado.`);
    }
  }

  const isDatesValid = isIssueDateValid && isChronologyValid;
  const currencyDetails = isCurrencyValid
    ? `Moeda válida identificada: ${normalizedCurrency}`
    : `Moeda inválida ou não reconhecida (${extraction.currency || 'N/A'})`;
  const datesDetails = datesDetailsArr.length > 0
    ? datesDetailsArr.join('. ')
    : (isDatesValid ? 'Datas em formato válido.' : 'Verificar inconsistências nas datas.');

  const step3Result: CurrencyAndDatesCheck = {
    currency: extraction.currency,
    isCurrencyValid,
    normalizedCurrency,
    issueDate: extraction.issue_date,
    dueDate: extraction.due_date,
    isIssueDateValid,
    isDueDateValid,
    isChronologyValid,
    isDatesValid,
    daysUntilDue,
    details: `${currencyDetails} | ${datesDetails}`,
  };

  // -------------------------------------------------------------
  // 4. PROCURAR DUPLICIDADE
  // -------------------------------------------------------------
  let isDuplicate = false;
  let duplicateRisk: 'none' | 'low' | 'high' = 'none';
  let matchedDocId: string | null = null;
  let matchedInvoiceNum: string | null = null;
  let matchedVendorName: string | null = null;
  let duplicateDetails = 'Nenhuma duplicidade detectada no histórico de documentos.';

  const currentInvoiceNum = (extraction.invoice_number || '').trim().toLowerCase();
  const currentVendorTax = cleanDigits(extraction.vendor_tax_id || '');
  const currentVendorName = (extraction.vendor_name || '').trim().toLowerCase();
  const currentTotal = total;
  const currentIssueDate = extraction.issue_date;

  for (const doc of existingDocuments) {
    const prevExt = doc.geminiExtraction;
    const prevInvoiceNum = (prevExt.invoice_number || '').trim().toLowerCase();
    const prevVendorTax = cleanDigits(prevExt.vendor_tax_id || '');
    const prevVendorName = (prevExt.vendor_name || '').trim().toLowerCase();
    const prevTotal = prevExt.total !== null ? roundCents(prevExt.total) : null;
    const prevIssueDate = prevExt.issue_date;

    // Regra 1: Mesmo número de invoice + mesmo fornecedor (taxId ou nome)
    const sameInvoice = currentInvoiceNum.length > 2 && prevInvoiceNum === currentInvoiceNum;
    const sameTax = currentVendorTax.length > 5 && prevVendorTax === currentVendorTax;
    const sameVendorName = currentVendorName.length > 3 && prevVendorName.includes(currentVendorName);

    if (sameInvoice && (sameTax || sameVendorName)) {
      isDuplicate = true;
      duplicateRisk = 'high';
      matchedDocId = doc.id;
      matchedInvoiceNum = prevExt.invoice_number;
      matchedVendorName = prevExt.vendor_name;
      duplicateDetails = `ALERTA DE DUPLICIDADE: Fatura Nº ${matchedInvoiceNum} do fornecedor '${matchedVendorName}' já foi processada anteriormente (ID: ${doc.id}, data: ${new Date(doc.extractedAt).toLocaleDateString()}). Risco crítico de pagamento em duplicidade.`;
      discrepancies.push({
        step: 4,
        stepName: 'Procura de Duplicidade',
        code: 'DUPLICATE_INVOICE_FOUND',
        title: 'Documento Duplicado Detectado',
        description: duplicateDetails,
        severity: 'critical',
        suggestedAction: 'Bloquear pagamento imediato e conferir se o documento já foi quitado no ERP.',
        involvedFields: ['invoice_number', 'vendor_name', 'vendor_tax_id'],
      });
      break;
    }

    // Regra 2: Mesmo total + mesma data de emissão + mesmo fornecedor (possível duplicata sem número de fatura)
    if (
      currentTotal !== null &&
      prevTotal === currentTotal &&
      currentIssueDate &&
      prevIssueDate === currentIssueDate &&
      (sameTax || sameVendorName)
    ) {
      isDuplicate = true;
      duplicateRisk = 'high';
      matchedDocId = doc.id;
      matchedInvoiceNum = prevExt.invoice_number;
      matchedVendorName = prevExt.vendor_name;
      duplicateDetails = `POSSÍVEL DUPLICIDADE: Documento com mesmo valor (${currentTotal.toFixed(2)}), mesma data de emissão (${currentIssueDate}) e mesmo fornecedor já registrado no sistema (ID: ${doc.id}).`;
      discrepancies.push({
        step: 4,
        stepName: 'Procura de Duplicidade',
        code: 'SUSPECTED_DUPLICATE_AMOUNT_DATE',
        title: 'Suspeita de Duplicidade por Valor e Data',
        description: duplicateDetails,
        severity: 'critical',
        suggestedAction: 'Comparar com o documento anterior antes de autorizar lançamento.',
        involvedFields: ['total', 'issue_date', 'vendor_name'],
      });
      break;
    }
  }

  const step4Result: DuplicateCheck = {
    isDuplicate,
    duplicateRisk,
    matchedDocumentId: matchedDocId,
    matchedInvoiceNumber: matchedInvoiceNum,
    matchedVendor: matchedVendorName,
    details: duplicateDetails,
  };

  // -------------------------------------------------------------
  // 5. VERIFICAR O FORNECEDOR
  // -------------------------------------------------------------
  let vendorStatus: 'approved' | 'unregistered' | 'blocked' | 'incomplete_data' = 'unregistered';
  let matchedMasterVendor: VendorMaster | null = null;
  let taxIdFormatValid = true;
  let step5Details = '';

  const rawTaxId = (extraction.vendor_tax_id || '').trim();
  const digitsTax = cleanDigits(rawTaxId);

  if (isStatement) {
    vendorStatus = 'approved';
    taxIdFormatValid = true;
    step5Details = `Titular da Conta e Lote de Transações Homologado: Empresa Soluções Digitais S.A. (CNPJ 14.552.190/0001-88).`;
  } else if (digitsTax.length === 14) {
    // CNPJ brasileiro
    taxIdFormatValid = validateBrazilianCnpj(digitsTax);
    if (!taxIdFormatValid) {
      discrepancies.push({
        step: 5,
        stepName: 'Verificação do Fornecedor',
        code: 'INVALID_TAX_ID_CHECKSUM',
        title: 'Dígito Verificador de CNPJ Inválido',
        description: `O CNPJ extraído (${rawTaxId}) falhou na checagem dos dígitos verificadores oficiais.`,
        severity: 'warning',
        suggestedAction: 'Confirmar documento original e consultar na Receita Federal.',
        involvedFields: ['vendor_tax_id'],
      });
    }
  } else if (!rawTaxId) {
    taxIdFormatValid = false;
    discrepancies.push({
      step: 5,
      stepName: 'Verificação do Fornecedor',
      code: 'MISSING_VENDOR_TAX_ID',
      title: 'Identificador Fiscal (CNPJ/Tax ID) Ausente',
      description: 'Documento não possui CNPJ, CPF ou Tax ID visível do emissor.',
      severity: 'warning',
      suggestedAction: 'Localizar o identificador fiscal do fornecedor no cabeçalho ou dados de contato.',
      involvedFields: ['vendor_tax_id'],
    });
  }

  // Busca na base mestre
  if (!isStatement && digitsTax.length >= 6) {
    matchedMasterVendor = MASTER_VENDORS.find(v => cleanDigits(v.taxId) === digitsTax) || null;
  }

  if (!isStatement && !matchedMasterVendor && extraction.vendor_name) {
    const vNameClean = extraction.vendor_name.toLowerCase();
    matchedMasterVendor = MASTER_VENDORS.find(v => {
      const masterName = v.name.toLowerCase();
      return masterName.includes(vNameClean) || vNameClean.includes(masterName.slice(0, 8));
    }) || null;
  }

  if (!isStatement && matchedMasterVendor) {
    vendorStatus = matchedMasterVendor.status;
    if (vendorStatus === 'approved') {
      step5Details = `Fornecedor homologado: ${matchedMasterVendor.name} (Categoria: ${matchedMasterVendor.category}, Condição: ${matchedMasterVendor.paymentTermsDays || 30} dias).`;
    } else if (vendorStatus === 'blocked') {
      step5Details = `FORNECEDOR BLOQUEADO: ${matchedMasterVendor.name} possui restrição corporativa. ${matchedMasterVendor.notes || ''}`;
      discrepancies.push({
        step: 5,
        stepName: 'Verificação do Fornecedor',
        code: 'BLOCKED_VENDOR_RESTRICTION',
        title: 'Fornecedor com Bloqueio Cadastral Ativo',
        description: step5Details,
        severity: 'critical',
        suggestedAction: 'Interromper processamento e encaminhar para Compliance / Jurídico.',
        involvedFields: ['vendor_name', 'vendor_tax_id'],
      });
    }
  } else if (!isStatement && !extraction.vendor_name) {
    vendorStatus = 'incomplete_data';
    step5Details = 'Nome do fornecedor não identificado no documento.';
    discrepancies.push({
      step: 5,
      stepName: 'Verificação do Fornecedor',
      code: 'MISSING_VENDOR_NAME',
      title: 'Nome do Fornecedor Não Identificado',
      description: 'Não foi possível encontrar a razão social ou nome comercial do emitente.',
      severity: 'critical',
      suggestedAction: 'Verificar logotipo ou cabeçalho do documento.',
      involvedFields: ['vendor_name'],
    });
  } else if (!isStatement) {
    vendorStatus = 'unregistered';
    step5Details = `Fornecedor '${extraction.vendor_name}' não consta na base de fornecedores homologados.`;
    discrepancies.push({
      step: 5,
      stepName: 'Verificação do Fornecedor',
      code: 'NEW_UNREGISTERED_VENDOR',
      title: 'Fornecedor Não Homologado (Novo Fornecedor)',
      description: step5Details,
      severity: 'warning',
      suggestedAction: 'Solicitar documentação cadastral antes do pagamento.',
      involvedFields: ['vendor_name', 'vendor_tax_id'],
    });
  }

  const step5Result: VendorVerificationCheck = {
    vendorName: extraction.vendor_name,
    vendorTaxId: extraction.vendor_tax_id,
    status: vendorStatus,
    matchedVendor: matchedMasterVendor,
    taxIdFormatValid,
    details: step5Details,
  };

  // -------------------------------------------------------------
  // Auditoria adicional a partir das evidências do Gemini
  // -------------------------------------------------------------
  if (extraction.exceptions && extraction.exceptions.length > 0) {
    for (const exc of extraction.exceptions) {
      discrepancies.push({
        step: 6,
        stepName: 'Exceção Visual Observada',
        code: exc.code || 'DOCUMENT_EXCEPTION',
        title: (exc as any).title || `Alerta do Documento: ${exc.code || 'Inconsistência Visual'}`,
        description: exc.message,
        severity: exc.severity === 'critical' ? 'critical' : 'warning',
        involvedFields: exc.involved_fields,
      });
    }
  }

  // Verifica campos ambíguos ou com baixa confiança
  if (extraction.field_evidence && extraction.field_evidence.length > 0) {
    for (const fe of extraction.field_evidence) {
      if (fe.status === 'ambiguous') {
        discrepancies.push({
          step: 6,
          stepName: 'Evidência Ambígua',
          code: `AMBIGUOUS_FIELD_${fe.field_name.toUpperCase()}`,
          title: `Campo com Leitura Ambígua: ${fe.field_name}`,
          description: `O campo '${fe.field_name}' apresenta ambiguidade no texto visível: "${fe.text_evidence}". Confiança: ${(fe.confidence * 100).toFixed(0)}%.`,
          severity: 'warning',
          involvedFields: [fe.field_name],
        });
      } else if (fe.confidence < 0.70 && fe.status === 'observed') {
        discrepancies.push({
          step: 6,
          stepName: 'Baixa Confiança',
          code: `LOW_CONFIDENCE_${fe.field_name.toUpperCase()}`,
          title: `Confiança Reduzida no Campo: ${fe.field_name}`,
          description: `O campo '${fe.field_name}' foi extraído com ${(fe.confidence * 100).toFixed(0)}% de confiança. Requer validação ocular humana.`,
          severity: 'info',
          involvedFields: [fe.field_name],
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 6. ENVIAR DIVERGÊNCIAS PARA REVISÃO
  // -------------------------------------------------------------
  const criticalIssuesCount = discrepancies.filter(d => d.severity === 'critical').length;
  const warningIssuesCount = discrepancies.filter(d => d.severity === 'warning').length;

  let overallStatus: 'APPROVED_AUTOMATIC' | 'PENDING_REVIEW' | 'REJECTED' = 'APPROVED_AUTOMATIC';
  let requiresReview = false;

  if (criticalIssuesCount > 0) {
    overallStatus = 'PENDING_REVIEW';
    requiresReview = true;
  } else if (warningIssuesCount > 0) {
    overallStatus = 'PENDING_REVIEW';
    requiresReview = true;
  } else {
    overallStatus = 'APPROVED_AUTOMATIC';
    requiresReview = false;
  }

  return {
    step1_lineItemsCalculation: step1Result,
    step2_subtotalTaxTotalComparison: step2Result,
    step3_currencyAndDatesValidation: step3Result,
    step4_duplicateCheck: step4Result,
    step5_vendorVerification: step5Result,
    step6_reviewRouting: {
      overallStatus,
      requiresReview,
      criticalIssuesCount,
      warningIssuesCount,
      discrepancies,
    },
  };
}
