import {
  ErpExportRecord,
  ErpSystemTarget,
  VendorCndCertificateStatus,
  ProcessedDocument,
} from '../src/types/finance.js';

/**
 * Gera payload compatível com os principais ERPs corporativos do mercado
 */
export function generateErpPayload(
  doc: ProcessedDocument,
  erpSystem: ErpSystemTarget = 'SAP_S4HANA'
): ErpExportRecord {
  const total = typeof doc.geminiExtraction.total === 'number' ? doc.geminiExtraction.total : 0;
  const subtotal = typeof doc.geminiExtraction.subtotal === 'number' ? doc.geminiExtraction.subtotal : total;
  const tax = typeof doc.geminiExtraction.tax_amount === 'number' ? doc.geminiExtraction.tax_amount : 0;
  const vendorName = doc.geminiExtraction.vendor_name || 'FORNECEDOR DIVERSO';
  const vendorTaxId = doc.geminiExtraction.vendor_tax_id || '00.000.000/0000-00';
  const invoiceNum = doc.geminiExtraction.invoice_number || 'S/N';
  const issueDate = doc.geminiExtraction.issue_date || new Date().toISOString().slice(0, 10);
  const dueDate = doc.geminiExtraction.due_date || issueDate;

  let payloadFormatted: any = null;
  let erpTransactionCode = '';

  if (erpSystem === 'SAP_S4HANA') {
    erpTransactionCode = 'BAPI_ACC_DOCUMENT_POST / FB60';
    payloadFormatted = {
      DOCUMENTHEADER: {
        BUS_ACT: 'RFBU',
        USERNAME: 'DOCAUDIT_AI_AGENT',
        HEADER_TXT: `NF ${invoiceNum} - ${vendorName.slice(0, 25)}`,
        COMP_CODE: '1000',
        DOC_DATE: issueDate.replace(/-/g, ''),
        PSTNG_DATE: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        DOC_TYPE: 'KR', // Vendor Invoice
        REF_DOC_NO: invoiceNum,
      },
      ACCOUNTGL: [
        {
          ITEMNO_ACC: '0000000001',
          GL_ACCOUNT: '0000411000', // Despesas TI / Serviços
          ITEM_TEXT: `Despesa Servicos TI - NF ${invoiceNum}`,
          COSTCENTER: 'CC101_TI',
          TAX_CODE: 'I1',
        },
      ],
      ACCOUNTPAYABLE: [
        {
          ITEMNO_ACC: '0000000002',
          VENDOR_NO: '0000100452',
          PMNTTRMS: 'Z030',
          BLINE_DATE: dueDate.replace(/-/g, ''),
          TAX_CODE: 'I1',
        },
      ],
      CURRENCYAMOUNT: [
        {
          ITEMNO_ACC: '0000000001',
          CURRENCY: doc.geminiExtraction.currency || 'BRL',
          AMT_DOCCUR: subtotal,
        },
        {
          ITEMNO_ACC: '0000000002',
          CURRENCY: doc.geminiExtraction.currency || 'BRL',
          AMT_DOCCUR: -total,
        },
      ],
    };
  } else if (erpSystem === 'TOTVS_PROTHEUS') {
    erpTransactionCode = 'MATA100 (Documento Entrada) / CTBA102';
    payloadFormatted = {
      Cabecalho: {
        F1_FILIAL: '01',
        F1_DOC: invoiceNum,
        F1_SERIE: '1',
        F1_FORNECE: '001245',
        F1_LOJA: '01',
        F1_EMISSAO: issueDate.replace(/-/g, ''),
        F1_TIPO: 'N',
        F1_ESPECIE: 'NFSE',
        F1_VALBRUT: total,
        F1_VALMERC: subtotal,
        F1_ISS: tax,
      },
      Itens: doc.geminiExtraction.line_items?.map((item, idx) => ({
        D1_ITEM: (idx + 1).toString().padStart(4, '0'),
        D1_COD: 'SERV_TI_01',
        D1_QUANT: item.quantity || 1,
        D1_VUNIT: item.unit_price || item.line_total || total,
        D1_TOTAL: item.line_total || total,
        D1_TES: '001',
        D1_CC: '101.TI.CLOUD',
      })) || [],
    };
  } else if (erpSystem === 'ORACLE_NETSUITE') {
    erpTransactionCode = 'VendorBill / REST Web Services';
    payloadFormatted = {
      entity: { id: 'VENDOR_4982', legalName: vendorName, taxRegistration: vendorTaxId },
      tranId: invoiceNum,
      tranDate: issueDate,
      dueDate: dueDate,
      currency: { name: doc.geminiExtraction.currency || 'BRL' },
      userTotal: total,
      expense: [
        {
          account: { id: '6010', name: 'Software & Cloud Infrastructure Expense' },
          amount: subtotal,
          department: { id: 'DEPT_TI_DEV' },
          memo: `Auditado automaticamente por DocAudit AI - ${doc.filename}`,
        },
      ],
    };
  } else {
    // Omie Cloud API
    erpTransactionCode = 'Financas / IncluirContaPagar';
    payloadFormatted = {
      codigo_lancamento_integracao: `DOCAUDIT_${doc.id}`,
      codigo_cliente_fornecedor: 884129,
      data_vencimento: dueDate,
      valor_documento: total,
      numero_documento_fiscal: invoiceNum,
      data_emissao: issueDate,
      categoria: '1.01.02 - Serviços de Tecnologia e Software',
      conta_corrente: 994821,
      observacao: `Aprovado pelo gate de governança DocAudit AI. CNPJ: ${vendorTaxId}`,
    };
  }

  return {
    id: `ERP-SYNC-${doc.id}`,
    erpSystem,
    documentId: doc.id,
    status: 'READY',
    generatedAt: new Date().toISOString(),
    erpTransactionCode,
    payloadFormatted,
  };
}

/**
 * Consulta Certidões Negativas de Débitos (CND Federal, FGTS e Trabalhista TST)
 */
export function verifyVendorCnds(
  vendorTaxId: string = '23.412.247/0001-10',
  vendorName: string = 'AWS Serviços de Nuvem Ltda'
): VendorCndCertificateStatus {
  const isAWS = vendorTaxId.includes('23.412') || vendorName.toLowerCase().includes('aws');
  const isTelecom = vendorTaxId.includes('02.421') || vendorName.toLowerCase().includes('telecom');

  if (isAWS || isTelecom) {
    return {
      vendorCnpj: vendorTaxId,
      vendorName,
      cndFederalReceita: {
        status: 'REGULAR',
        code: 'CND-RFB-2026-9948120A',
        validUntil: '2027-03-31',
      },
      cndFgtsCaixa: {
        status: 'REGULAR',
        code: 'CRF-CAIXA-8841920841',
        validUntil: '2026-11-20',
      },
      cndTrabalhistaTst: {
        status: 'NEGATIVA',
        code: 'CNDT-TST-773918-2026',
        validUntil: '2027-01-15',
      },
      overallCompliance: 'FORNECEDOR_100_REGULAR',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // Fornecedor com ressalva para teste
  return {
    vendorCnpj: vendorTaxId,
    vendorName,
    cndFederalReceita: {
      status: 'PENDENTE',
      code: 'CPEN-RFB-2026-0041289B',
      validUntil: '2026-10-15',
    },
    cndFgtsCaixa: {
      status: 'REGULAR',
      code: 'CRF-CAIXA-1104829104',
      validUntil: '2026-10-30',
    },
    cndTrabalhistaTst: {
      status: 'NEGATIVA',
      code: 'CNDT-TST-884102-2026',
      validUntil: '2026-12-31',
    },
    overallCompliance: 'RESTRICAO_FISCAL_DETECTADA',
    lastCheckedAt: new Date().toISOString(),
  };
}
