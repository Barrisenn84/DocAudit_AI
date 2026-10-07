import {
  CashFlowDayProjection,
  DynamicDiscountingProposal,
  DdaElectronicInvoiceItem,
  ProcessedDocument,
} from '../src/types/finance.js';

/**
 * Gera projeção de Fluxo de Caixa D+90 com base nas faturas auditadas a pagar (AP),
 * previsão de contas a receber (AR) e taxas SELIC/CDI do Banco Central.
 */
export function generateCashFlowForecastD90(
  documents: ProcessedDocument[],
  initialCashBalance: number = 850000.0,
  selicRateAnnual: number = 10.5
): {
  days: CashFlowDayProjection[];
  summary: {
    startBalance: number;
    lowestProjectedBalance: number;
    lowestBalanceDate: string;
    totalInflowsPeriod: number;
    totalOutflowsPeriod: number;
    endingBalance: number;
    daysInTightLiquidity: number;
  };
} {
  const days: CashFlowDayProjection[] = [];
  let currentBalance = initialCashBalance;
  let lowestBalance = initialCashBalance;
  let lowestBalanceDate = '';
  let totalInflows = 0;
  let totalOutflows = 0;
  let tightDays = 0;

  const safetyBuffer = 150000.0; // Colchão de liquidez mínimo
  const today = new Date();

  // Mapeia vencimentos reais dos documentos auditados
  const docDueMap = new Map<string, number>();
  documents.forEach((d) => {
    const dueDateStr = d.geminiExtraction.due_date;
    const amount = typeof d.geminiExtraction.total === 'number' ? d.geminiExtraction.total : 0;
    if (dueDateStr && amount > 0) {
      const existing = docDueMap.get(dueDateStr) || 0;
      docDueMap.set(dueDateStr, existing + amount);
    }
  });

  for (let i = 0; i < 90; i++) {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() + i);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    const dayLabel = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;

    // Entradas modeladas (sazonalidade de faturamento e pagamentos de clientes - dias 05, 10, 15, 20, 25, 30)
    let inflow = 0;
    let inflowCount = 0;
    const dayOfMonth = dateObj.getDate();

    if (!isWeekend) {
      if ([5, 10, 15, 20, 25].includes(dayOfMonth)) {
        inflow = 38000 + (dayOfMonth * 1200) + (Math.sin(i / 10) * 8000);
        inflowCount = Math.floor(Math.random() * 4) + 2;
      } else {
        inflow = 8000 + (Math.cos(i / 5) * 3000);
        inflowCount = 1;
      }
    }

    // Saídas (faturas auditadas mapeadas + pagamentos rotineiros)
    const docOutflow = docDueMap.get(dateStr) || 0;
    const routineOutflow = isWeekend ? 0 : 7500 + (Math.sin(i / 7) * 2000);
    const outflow = isWeekend ? 0 : docOutflow + routineOutflow;
    const outflowCount = (docOutflow > 0 ? 1 : 0) + (isWeekend ? 0 : 2);

    const netChange = Number((inflow - outflow).toFixed(2));
    currentBalance = Number((currentBalance + netChange).toFixed(2));

    totalInflows += inflow;
    totalOutflows += outflow;

    if (currentBalance < lowestBalance) {
      lowestBalance = currentBalance;
      lowestBalanceDate = dateStr;
    }

    let liquidityStatus: 'HEALTHY' | 'TIGHT' | 'DEFICIT_WARNING' = 'HEALTHY';
    if (currentBalance < 0) {
      liquidityStatus = 'DEFICIT_WARNING';
      tightDays++;
    } else if (currentBalance < safetyBuffer) {
      liquidityStatus = 'TIGHT';
      tightDays++;
    }

    days.push({
      date: dateStr,
      dayLabel,
      inflowsExpected: Number(inflow.toFixed(2)),
      outflowsCommitted: Number(outflow.toFixed(2)),
      netChange,
      projectedClosingBalance: currentBalance,
      safetyBufferMin: safetyBuffer,
      liquidityStatus,
      inflowCount,
      outflowCount,
    });
  }

  return {
    days,
    summary: {
      startBalance: initialCashBalance,
      lowestProjectedBalance: lowestBalance,
      lowestBalanceDate: lowestBalanceDate || days[0].date,
      totalInflowsPeriod: Number(totalInflows.toFixed(2)),
      totalOutflowsPeriod: Number(totalOutflows.toFixed(2)),
      endingBalance: currentBalance,
      daysInTightLiquidity: tightDays,
    },
  };
}

/**
 * Avalia propostas de Desconto Dinâmico (Dynamic Discounting) comparando com o Custo de Oportunidade do Caixa
 */
export function evaluateDynamicDiscounting(
  documents: ProcessedDocument[],
  cdiRateAnnual: number = 10.4
): DynamicDiscountingProposal[] {
  const proposals: DynamicDiscountingProposal[] = [];
  const dailyCdiRate = Math.pow(1 + cdiRateAnnual / 100, 1 / 252) - 1;

  documents.forEach((doc) => {
    const total = typeof doc.geminiExtraction.total === 'number' ? doc.geminiExtraction.total : 0;
    if (total < 1000) return;

    // Simula desconto ofertado pelo fornecedor de 2.0% a 3.5% para pagamento 20 dias antes
    const discountPct = 2.5;
    const daysEarly = 18;
    const discountAmount = Number(((total * discountPct) / 100).toFixed(2));
    const netPayment = Number((total - discountAmount).toFixed(2));

    // Retorno anualizado do desconto obtido: (1 + taxa)^(360/dias) - 1
    const annualizedRoi = (Math.pow(1 + discountPct / 100, 360 / daysEarly) - 1) * 100;
    const isProfitable = annualizedRoi > cdiRateAnnual;

    const verdict: 'ALTAMENTE_LUCRATIVO' | 'VIAVEL' | 'NAO_RECOMENDADO' =
      annualizedRoi >= 25.0 ? 'ALTAMENTE_LUCRATIVO' : isProfitable ? 'VIAVEL' : 'NAO_RECOMENDADO';

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueDate = doc.geminiExtraction.due_date || '2026-10-30';

    proposals.push({
      id: `DISC-${doc.id}`,
      documentId: doc.id,
      vendorName: doc.geminiExtraction.vendor_name || 'Fornecedor Homologado',
      originalAmount: total,
      originalDueDate: dueDate,
      proposedPaymentDate: todayStr,
      daysAccelerated: daysEarly,
      discountRatePct: discountPct,
      discountAmount,
      netPaymentAmount: netPayment,
      annualizedRoiPct: Number(annualizedRoi.toFixed(2)),
      dailyCostOfCapitalBacenCdi: Number((dailyCdiRate * 100).toFixed(4)),
      verdict,
      financialBenefitExplanation: `Ao antecipar em ${daysEarly} dias com ${discountPct}% de desconto, a empresa obtém rentabilidade anualizada de ${annualizedRoi.toFixed(1)}% a.a., superando amplamente o CDI (${cdiRateAnnual.toFixed(2)}% a.a.). Economia líquida de R$ ${discountAmount.toLocaleString('pt-BR')}.`,
    });
  });

  return proposals;
}

/**
 * Base de Boletos Eletrônicos DDA consultados via Open Finance / CIP
 */
export const SAMPLE_DDA_INVOICES: DdaElectronicInvoiceItem[] = [
  {
    id: 'DDA-BR-0981',
    barcode: '34191790010104351004791020150008892180000660000',
    digitableLine: '34191.79001 01043.510047 91020.150008 8 892180000660000',
    beneficiaryCnpj: '23.412.247/0001-10',
    beneficiaryName: 'AWS Serviços de Nuvem Ltda',
    amount: 6600.0,
    dueDate: '2026-10-25',
    issueDate: '2026-10-01',
    matchedPurchaseOrder: 'PO-2026-TI-089',
    matchedInternalDocId: 'DOC-AM-001',
    matchStatus: 'MATCHED_WITH_PO',
    riskScore: 5,
  },
  {
    id: 'DDA-BR-0982',
    barcode: '2379338128600830100287102014000336000000366000',
    digitableLine: '23793.38128 60083.010028 71020.140003 3 366000000366000',
    beneficiaryCnpj: '02.421.421/0001-11',
    beneficiaryName: 'Telecom e Conectividade S.A.',
    amount: 3660.0,
    dueDate: '2026-10-18',
    issueDate: '2026-10-02',
    matchedPurchaseOrder: 'PO-2026-TEL-012',
    matchedInternalDocId: 'DOC-AM-004',
    matchStatus: 'MATCHED_WITH_PO',
    riskScore: 2,
  },
  {
    id: 'DDA-BR-0983',
    barcode: '001900000901234567890123456789012345678900089500',
    digitableLine: '00190.00009 01234.567890 12345.678901 2 345678900089500',
    beneficiaryCnpj: '99.888.777/0001-66',
    beneficiaryName: 'Empresa Cobrança Rápida Fictícia Ltda',
    amount: 8950.0,
    dueDate: '2026-10-12',
    issueDate: '2026-10-05',
    matchedPurchaseOrder: null,
    matchedInternalDocId: null,
    matchStatus: 'UNEXPECTED_CHARGE_RISK',
    riskScore: 92,
  },
];
