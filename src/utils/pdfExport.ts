import { jsPDF } from 'jspdf';
import {
  ProcessedDocument,
  CfoClosingReportResult,
  ReconciliationBatchResult,
  ExceptionTriageResult,
  JournalEntryProposal,
  ClosingChecklistResult,
} from '../types/finance.js';

/**
 * Utilitário profissional de exportação em PDF para laudos de auditoria fiscal,
 * pareceres de revisão e relatórios executivos do CFO.
 */

// Formatação monetária segura
function fmtCurrency(value: number | null | undefined, currency = 'BRL'): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/D';
  return `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Não informada';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * 1. Exporta Laudo Pericial de Auditoria Fiscal & Parecer de Revisão (Documento Individual)
 */
export function exportDocumentAuditPdf(doc: ProcessedDocument): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const extraction = doc.geminiExtraction;
  const validation = doc.validation;
  const review = doc.humanReview;
  const curr = extraction.currency || 'BRL';

  // Cores institucionais
  const navyDark = [15, 23, 42]; // #0F172A
  const slateMid = [71, 85, 105]; // #475569
  const borderGray = [226, 232, 240]; // #E2E8F0
  const bgLight = [248, 250, 252]; // #F8FAFC

  // Função auxiliar de cabeçalho
  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    // Faixa decorativa azul indigo
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  PLATAFORMA DE AUDITORIA FISCAL & COMPLIANCE', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text('LAUDO PERICIAL DE AUDITORIA CONTÁBIL, ARITMÉTICA E FISCAL • PROVAS REGULATÓRIAS', margin, 16);

    // Identificador no canto direito
    pdf.setFont('helvetica', 'bold');
    pdf.text(`DOSSIÊ: ${doc.id}`, pageWidth - margin - 35, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - margin - 35, 17);
  };

  // Função auxiliar de rodapé
  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text(
      'Documento emitido com integridade computacional pela plataforma DocAudit AI. Válido para fiscalização, auditoria externa e compliance.',
      margin,
      pageHeight - 8
    );
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  // 1. TÍTULO DO RELATÓRIO
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PARECER TÉCNICO DE AUDITORIA & HOMOLOGAÇÃO FISCAL', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(
    `Arquivo Fonte: ${doc.filename}  |  Tipo: ${doc.fileType.toUpperCase()}  |  Tempo de Processamento do Motor: ${doc.processingTimeMs}ms`,
    margin,
    y
  );
  y += 7;

  // 2. QUADRO RESUMO DO DOCUMENTO (Box com fundo cinza suave)
  pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 38, 2, 2, 'FD');

  const boxY = y + 5;
  pdf.setFontSize(8);

  // Coluna 1: Dados do Emissor / Fornecedor
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('FORNECEDOR / EMISSOR:', margin + 4, boxY);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(extraction.vendor_name || 'Não identificado', margin + 4, boxY + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('CNPJ / TAX ID:', margin + 4, boxY + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(extraction.vendor_tax_id || 'Ausente', margin + 4, boxY + 17);

  const liveCnpj = validation.step5_vendorVerification.liveCnpjData;
  if (liveCnpj) {
    pdf.setFontSize(7);
    pdf.setTextColor(5, 150, 105);
    pdf.text(`✓ Receita Federal: ${liveCnpj.situacao_cadastral} (${liveCnpj.municipio || ''}/${liveCnpj.uf || ''})`, margin + 4, boxY + 23);
    pdf.setFontSize(8);
  }

  // Coluna 2: Dados da Fatura / Datas
  const col2X = margin + 70;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('NÚMERO DA FATURA:', col2X, boxY);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(extraction.invoice_number || 'Sem numeração', col2X, boxY + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('DATA DE EMISSÃO:', col2X, boxY + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(extraction.issue_date), col2X, boxY + 17);

  pdf.setFont('helvetica', 'bold');
  pdf.text('VENCIMENTO LEGAL:', col2X, boxY + 23);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(extraction.due_date), col2X, boxY + 28);

  // Coluna 3: Valores Financeiros
  const col3X = margin + 130;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('SUBTOTAL:', col3X, boxY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fmtCurrency(extraction.subtotal, curr), col3X, boxY + 5);

  pdf.setFont('helvetica', 'bold');
  pdf.text('TRIBUTOS RETIDOS:', col3X, boxY + 12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fmtCurrency(extraction.tax_amount, curr), col3X, boxY + 17);

  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL DECLARADO:', col3X, boxY + 23);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 58, 138); // azul destaque
  pdf.text(fmtCurrency(extraction.total, curr), col3X, boxY + 28);

  y += 44;

  // 3. QUADRO DE DECISÃO DE AUDITORIA & STATUS DA REVISÃO
  const statusOverall = review ? review.status : validation.step6_reviewRouting.overallStatus;
  const isApproved = statusOverall === 'APPROVED' || statusOverall === 'APPROVED_AUTOMATIC';
  const isRejected = statusOverall === 'REJECTED';

  if (isApproved) {
    pdf.setFillColor(236, 253, 245); // emerald-50
    pdf.setDrawColor(167, 243, 208); // emerald-200
  } else if (isRejected) {
    pdf.setFillColor(255, 241, 242); // rose-50
    pdf.setDrawColor(254, 205, 211); // rose-200
  } else {
    pdf.setFillColor(254, 252, 232); // amber-50
    pdf.setDrawColor(254, 240, 138); // amber-200
  }

  pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  if (isApproved) {
    pdf.setTextColor(6, 95, 70);
    pdf.text('VEREDITO OFICIAL: DOCUMENTO APROVADO PARA LIQUIDAÇÃO E CONTABILIZAÇÃO', margin + 4, y + 6);
  } else if (isRejected) {
    pdf.setTextColor(159, 18, 57);
    pdf.text('VEREDITO OFICIAL: DOCUMENTO REJEITADO (PAGAMENTO BLOQUEADO)', margin + 4, y + 6);
  } else {
    pdf.setTextColor(146, 64, 14);
    pdf.text('VEREDITO OFICIAL: PENDENTE DE REVISÃO HUMANA OBRIGATÓRIA', margin + 4, y + 6);
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(51, 65, 85);

  const verdictText = review
    ? `Revisão formalizada por: ${review.reviewerName} em ${formatDate(review.reviewedAt)}. Parecer: "${review.notes}"`
    : validation.step6_reviewRouting.overallStatus === 'APPROVED_AUTOMATIC'
    ? 'Documento 100% aderente aos 6 passos de conformidade estrita da plataforma DocAudit AI. Sem divergências matemáticas ou cadastrais.'
    : `Identificada(s) ${validation.step6_reviewRouting.discrepancies.length} inconsistência(s) encaminhada(s) para validação da controladoria.`;

  const splitVerdict = pdf.splitTextToSize(verdictText, pageWidth - margin * 2 - 8);
  pdf.text(splitVerdict, margin + 4, y + 12);

  y += 28;

  // 4. MATRIZ DE CONFORMIDADE DOS 6 PASSOS DE AUDITORIA
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('SCORECARD DE CONFORMIDADE (6 PASSOS CRÍTICOS)', margin, y);
  y += 5;

  const steps = [
    {
      num: 'Passo 1',
      nome: 'Recálculo das Linhas',
      status: validation.step1_lineItemsCalculation.isConsistent ? 'CONFORME' : 'DIVERGENTE',
      detalhes: validation.step1_lineItemsCalculation.details,
    },
    {
      num: 'Passo 2',
      nome: 'Equação Subtotal + Impostos',
      status: validation.step2_subtotalTaxTotalComparison.isConsistent ? 'CONFORME' : 'DIVERGENTE',
      detalhes: validation.step2_subtotalTaxTotalComparison.details,
    },
    {
      num: 'Passo 3',
      nome: 'Moeda, PTAX e Datas',
      status: validation.step3_currencyAndDatesValidation.isDatesValid ? 'CONFORME' : 'ATENÇÃO',
      detalhes: validation.step3_currencyAndDatesValidation.details,
    },
    {
      num: 'Passo 4',
      nome: 'Detecção de Duplicidade',
      status: !validation.step4_duplicateCheck.isDuplicate ? 'CONFORME' : 'DUPLICADO',
      detalhes: validation.step4_duplicateCheck.details,
    },
    {
      num: 'Passo 5',
      nome: 'Homologação do Fornecedor',
      status: validation.step5_vendorVerification.status === 'approved' ? 'HOMOLOGADO' : 'NÃO HOMOLOGADO',
      detalhes: validation.step5_vendorVerification.details,
    },
    {
      num: 'Passo 6',
      nome: 'Roteamento e Risco',
      status: validation.step6_reviewRouting.requiresReview ? 'REVISÃO EXIGIDA' : 'AUTOMÁTICO',
      detalhes: `Classificação: ${validation.step6_reviewRouting.overallStatus} (${validation.step6_reviewRouting.criticalIssuesCount} críticos, ${validation.step6_reviewRouting.warningIssuesCount} avisos).`,
    },
  ];

  pdf.setFontSize(7.5);
  steps.forEach((st) => {
    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text(`${st.num} • ${st.nome}:`, margin + 3, y + 4.5);

    const isStepOk = st.status === 'CONFORME' || st.status === 'HOMOLOGADO' || st.status === 'AUTOMÁTICO';
    pdf.setTextColor(isStepOk ? 5 : 185, isStepOk ? 150 : 28, isStepOk ? 105 : 28);
    pdf.text(`[${st.status}]`, margin + 55, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const textDetail = pdf.splitTextToSize(st.detalhes, pageWidth - margin - 85)[0] || st.detalhes;
    pdf.text(textDetail, margin + 82, y + 4.5);

    y += 7.5;
  });

  y += 4;

  // 5. DISCREPÂNCIAS IDENTIFICADAS (Se houver)
  const discrepancies = validation.step6_reviewRouting.discrepancies;
  if (discrepancies.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(190, 18, 60);
    pdf.text(`DISCREPÂNCIAS & ALERTAS REGISTRADOS (${discrepancies.length})`, margin, y);
    y += 5;

    discrepancies.forEach((d) => {
      pdf.setFillColor(255, 241, 242);
      pdf.setDrawColor(254, 205, 211);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 9, 1, 1, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(159, 18, 57);
      pdf.text(`[${d.severity.toUpperCase()}] ${d.title}`, margin + 3, y + 4);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const descLine = pdf.splitTextToSize(d.description, pageWidth - margin * 2 - 8)[0];
      pdf.text(descLine, margin + 3, y + 7.5);

      y += 10.5;
    });
    y += 2;
  }

  // 6. ITENS DE LINHA DISCRIMINADOS (Line Items Table)
  const items = extraction.line_items || [];
  if (items.length > 0) {
    // Checagem de espaço na página: se faltar menos de 45mm, adiciona nova página
    if (y > pageHeight - 55) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text(`DISCRIMINAÇÃO DOS ITENS DE LINHA (${items.length} itens auditados)`, margin, y);
    y += 5;

    // Cabeçalho da Tabela
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text('#', margin + 3, y + 4);
    pdf.text('Descrição do Serviço / Produto', margin + 12, y + 4);
    pdf.text('Qtd', margin + 115, y + 4);
    pdf.text('Preço Unit.', margin + 130, y + 4);
    pdf.text('Total da Linha', margin + 155, y + 4);
    y += 6;

    // Linhas da Tabela
    items.slice(0, 15).forEach((item, idx) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        drawHeader();
        y = 32;
      }

      pdf.setFillColor(idx % 2 === 0 ? 255 : bgLight[0], idx % 2 === 0 ? 255 : bgLight[1], idx % 2 === 0 ? 255 : bgLight[2]);
      pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      pdf.rect(margin, y, pageWidth - margin * 2, 5.5, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(7);
      pdf.text(String(item.item_number || idx + 1), margin + 3, y + 3.8);

      const desc = pdf.splitTextToSize(item.description || 'Item sem descrição', 98)[0];
      pdf.text(desc, margin + 12, y + 3.8);

      pdf.text(item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '1', margin + 115, y + 3.8);
      pdf.text(fmtCurrency(item.unit_price, curr), margin + 130, y + 3.8);

      pdf.setFont('helvetica', 'bold');
      pdf.text(fmtCurrency(item.line_total, curr), margin + 155, y + 3.8);

      y += 5.5;
    });

    if (items.length > 15) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
      pdf.text(`... e outros ${items.length - 15} itens arquivados no repositório digital completo.`, margin + 2, y + 4);
      y += 6;
    }
  }

  // 7. TERMO DE RESPONSABILIDADE TÉCNICA & ASSINATURA DIGITAL
  if (y > pageHeight - 45) {
    pdf.addPage();
    drawHeader();
    y = 32;
  } else {
    y += 6;
  }

  pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('TERMO DE RESPONSABILIDADE & CERTIFICAÇÃO DIGITAL DE CONFORMIDADE', margin + 4, y + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(
    'Atestamos que os dados deste documento foram processados por inteligência artificial (Gemini Structured Outputs) com validação das regras da Receita Federal e Conselho Federal de Contabilidade. O presente relatório serve como evidência probatória para suporte à escrituração fiscal e fechamento contábil mensal.',
    margin + 4,
    y + 9,
    { maxWidth: pageWidth - margin * 2 - 8 }
  );

  // Linhas de Assinatura
  const sigY = y + 21;
  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 10, sigY, margin + 75, sigY);
  pdf.line(pageWidth - margin - 75, sigY, pageWidth - margin - 10, sigY);

  pdf.setFontSize(6.5);
  pdf.text(review ? review.reviewerName : 'Controller Geral / Auditor Responsável', margin + 10, sigY + 3.5);
  pdf.text('DocAudit AI Engine • Autenticação Digital', pageWidth - margin - 75, sigY + 3.5);

  // Adiciona rodapés em todas as páginas
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  // Salva o arquivo diretamente
  const safeVendor = (extraction.vendor_name || 'Documento')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 25);
  pdf.save(`Laudo_Auditoria_${doc.id}_${safeVendor}.pdf`);
}

/**
 * 2. Exporta Relatório Executivo do CFO (Módulo 8) em PDF
 */
export function exportCfoReportPdf(
  report: CfoClosingReportResult,
  meta?: { auditor?: string; approved_at?: string; notes?: string }
): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navyDark = [15, 23, 42];
  const slateMid = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    pdf.setFillColor(16, 185, 129); // emerald accent
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  RELATÓRIO EXECUTIVO DE FECHAMENTO CONTÁBIL & CFO', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    const ents = Array.isArray(report.entidades) ? report.entidades.join(', ') : 'Entidades Corporativas';
    pdf.text(`PERÍODO DE COMPETÊNCIA: ${report.periodo || 'Mensal'}  •  ENTIDADE: ${ents}`, margin, 16);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`RELATÓRIO: ${report.report_id}`, pageWidth - margin - 35, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`DATA: ${formatDate(report.created_at)}`, pageWidth - margin - 35, 17);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text('Relatório Executivo Oficial gerado sob rigor contábil com auditoria prévia dos números homologados.', margin, pageHeight - 8);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  // Título e Status de Homologação
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PARECER EXECUTIVO PARA A DIRETORIA & CONSELHO (CFO)', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(`Auditor Responsável: ${meta?.auditor || 'Controller Geral'}  •  Homologado em: ${formatDate(meta?.approved_at)}  •  Status: ${report.status_geral || 'Concluído'}`, margin, y);
  y += 8;

  // SEÇÃO: QUADRANTE ANALÍTICO (Fatos, Interpretações, Perguntas, Riscos)
  const sections = [
    { title: '1. FATOS OBSERVADOS NO PERÍODO', items: report.fatos || [], color: [5, 150, 105] },
    { title: '2. INTERPRETAÇÃO CONTÁBIL & TRIBUTÁRIA', items: report.interpretacoes || [], color: [37, 99, 235] },
    { title: '3. PERGUNTAS DE AUDITORIA & ESCLARECIMENTOS', items: report.perguntas || [], color: [217, 119, 6] },
    { title: '4. RISCOS IDENTIFICADOS & PLANO DE MITIGAÇÃO', items: report.riscos || [], color: [225, 29, 72] },
  ];

  sections.forEach((sec) => {
    if (y > pageHeight - 45) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.rect(margin, y, pageWidth - margin * 2, 6, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(sec.color[0], sec.color[1], sec.color[2]);
    pdf.text(sec.title, margin + 3, y + 4.2);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);

    sec.items.forEach((itemText) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        drawHeader();
        y = 32;
      }
      const splitLines = pdf.splitTextToSize(`• ${itemText}`, pageWidth - margin * 2 - 6);
      pdf.text(splitLines, margin + 3, y);
      y += splitLines.length * 4.2;
    });

    y += 4;
  });

  // VARIAÇÕES PRINCIPAIS E DIRETRIZES
  if (Array.isArray(report.secao_5_principais_variacoes) && report.secao_5_principais_variacoes.length > 0) {
    if (y > pageHeight - 45) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text('PRINCIPAIS VARIAÇÕES PATRIMONIAIS & DE RESULTADO:', margin, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    report.secao_5_principais_variacoes.slice(0, 5).forEach((v, idx: number) => {
      pdf.text(`${idx + 1}. ${v.rubrica}: Anterior R$ ${v.valor_anterior} -> Atual R$ ${v.valor_atual} (${v.variacao_percentual}) - ${v.explicacao_comprovada}`, margin + 3, y, { maxWidth: pageWidth - margin * 2 - 6 });
      y += 5;
    });
    y += 4;
  }

  // ASSINATURAS FINAIS
  if (y > pageHeight - 35) {
    pdf.addPage();
    drawHeader();
    y = 32;
  }

  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 15, y + 15, margin + 85, y + 15);
  pdf.line(pageWidth - margin - 85, y + 15, pageWidth - margin - 15, y + 15);

  pdf.setFontSize(7);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text(meta?.auditor || 'Dra. Vanessa Cavalcanti - Controller Geral', margin + 18, y + 19);
  pdf.text('Diretoria Financeira / CFO Sponsor', pageWidth - margin - 75, y + 19);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  pdf.save(`Relatorio_CFO_Fechamento_${report.periodo || 'Mensal'}.pdf`);
}

/**
 * 3. Exporta Livro Resumo Consolidado de Documentos Auditados (Lote)
 */
export function exportBatchAuditSummaryPdf(documents: ProcessedDocument[]): void {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const navyDark = [15, 23, 42];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 20, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  LIVRO RAZÃO DE AUDITORIA FISCAL E COMPLIANCE (LOTE CONSOLIDADO)', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(`TOTAL DE DOCUMENTOS AUDITADOS: ${documents.length}  •  EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, margin, 15);
  };

  drawHeader();
  y = 26;

  // Tabela Cabeçalho
  pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.rect(margin, y, pageWidth - margin * 2, 7, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ID Dossiê', margin + 3, y + 4.5);
  pdf.text('Fornecedor / Razão Social', margin + 38, y + 4.5);
  pdf.text('CNPJ', margin + 105, y + 4.5);
  pdf.text('Fatura Nº', margin + 140, y + 4.5);
  pdf.text('Emissão', margin + 170, y + 4.5);
  pdf.text('Vencimento', margin + 195, y + 4.5);
  pdf.text('Total', margin + 225, y + 4.5);
  pdf.text('Status Auditoria', margin + 250, y + 4.5);
  y += 7;

  documents.forEach((doc, idx) => {
    if (y > pageHeight - 16) {
      pdf.addPage();
      drawHeader();
      y = 26;
    }

    const ex = doc.geminiExtraction;
    const isEven = idx % 2 === 0;
    pdf.setFillColor(isEven ? 255 : bgLight[0], isEven ? 255 : bgLight[1], isEven ? 255 : bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.rect(margin, y, pageWidth - margin * 2, 6, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(15, 23, 42);

    pdf.text(doc.id, margin + 3, y + 4);
    const vendorName = pdf.splitTextToSize(ex.vendor_name || 'Desconhecido', 65)[0];
    pdf.text(vendorName, margin + 38, y + 4);
    pdf.text(ex.vendor_tax_id || '-', margin + 105, y + 4);
    pdf.text(ex.invoice_number || '-', margin + 140, y + 4);
    pdf.text(formatDate(ex.issue_date), margin + 170, y + 4);
    pdf.text(formatDate(ex.due_date), margin + 195, y + 4);

    pdf.setFont('helvetica', 'bold');
    pdf.text(fmtCurrency(ex.total, ex.currency || 'BRL'), margin + 225, y + 4);

    const st = doc.humanReview ? doc.humanReview.status : doc.validation.step6_reviewRouting.overallStatus;
    if (st === 'APPROVED' || st === 'APPROVED_AUTOMATIC') {
      pdf.setTextColor(5, 150, 105);
      pdf.text('APROVADO', margin + 250, y + 4);
    } else if (st === 'REJECTED') {
      pdf.setTextColor(225, 29, 72);
      pdf.text('REJEITADO', margin + 250, y + 4);
    } else {
      pdf.setTextColor(217, 119, 6);
      pdf.text('REVISÃO', margin + 250, y + 4);
    }

    y += 6;
  });

  pdf.save(`Dossie_Consolidado_Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 4. Exporta Laudo de Reconciliação Bancária & Razão em PDF
 */
export function exportReconciliationReportPdf(batch: ReconciliationBatchResult): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navyDark = [15, 23, 42];
  const slateMid = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    pdf.setFillColor(79, 70, 229); // indigo
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  LAUDO DE RECONCILIAÇÃO BANCÁRIA & RAZÃO', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text('AUDITORIA ALGORÍTMICA & CONCILIAÇÃO FINANCEIRA COM EVIDÊNCIAS PROBATÓRIAS', margin, 16);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`LOTE: ${batch.batch_id}`, pageWidth - margin - 35, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`DATA: ${formatDate(batch.created_at)}`, pageWidth - margin - 35, 17);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text('Laudo de Reconciliação emitido sob as 4 regras de integridade contábil. Válido para comitês e auditoria externa.', margin, pageHeight - 8);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  // TÍTULO
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PARECER TÉCNICO DE CONCILIAÇÃO FINANCEIRA & TESOURARIA', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(`Execução Algorítmica Concluída • ID do Lote: ${batch.batch_id} • Registros Analisados: ${batch.total_pairs}`, margin, y);
  y += 7;

  // QUADRO DE MÉTRICAS DO LOTE
  pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 5;
  const metrics = [
    { label: 'Total Pares', val: batch.total_pairs, color: [15, 23, 42] },
    { label: 'Exact Matches', val: batch.exact_matches, color: [5, 150, 105] },
    { label: 'Probable Matches', val: batch.probable_matches, color: [37, 99, 235] },
    { label: 'Partial Matches', val: batch.partial_matches, color: [217, 119, 6] },
    { label: 'Com Pendências', val: batch.unmatched_items, color: [225, 29, 72] },
  ];

  metrics.forEach((m, idx) => {
    const mx = margin + idx * cardW;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text(m.label, mx + 5, y + 7);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(m.color[0], m.color[1], m.color[2]);
    pdf.text(String(m.val), mx + 5, y + 16);
  });

  y += 28;

  // REGRAS DE CONCILIAÇÃO APLICADAS
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('CRITÉRIOS MANDATÓRIOS AUDITADOS:', margin + 4, y + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text('1. Diferença acima da tolerância (R$ 0,01) nunca classificada como exact. | 2. Unicidade de pareamento estrita (sem duplo casamento).', margin + 4, y + 9.5);
  pdf.text('3. Moedas distintas exigem conversão cambial PTAX registrada. | 4. Source_id obrigatório para atestar conciliação final.', margin + 4, y + 13.5);

  y += 22;

  // DETALHAMENTO DOS PARES
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text(`DISCRIMINAÇÃO DOS PARES AUDITADOS (${batch.pairs.length})`, margin, y);
  y += 5;

  batch.pairs.forEach((pair, idx) => {
    if (y > pageHeight - 35) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    const isMatch = pair.match_status === 'exact' || pair.match_status === 'probable';
    pdf.setFillColor(isMatch ? 255 : bgLight[0], isMatch ? 255 : bgLight[1], isMatch ? 255 : bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 17, 1.5, 1.5, 'FD');

    // Header do par
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text(`Par #${idx + 1} (${pair.pair_id}):`, margin + 3, y + 4.5);

    // Status badge
    if (pair.match_status === 'exact') {
      pdf.setTextColor(5, 150, 105);
      pdf.text('[EXACT MATCH]', margin + 45, y + 4.5);
    } else if (pair.match_status === 'probable') {
      pdf.setTextColor(37, 99, 235);
      pdf.text('[PROBABLE MATCH]', margin + 45, y + 4.5);
    } else if (pair.match_status === 'partial') {
      pdf.setTextColor(217, 119, 6);
      pdf.text('[PARTIAL MATCH]', margin + 45, y + 4.5);
    } else {
      pdf.setTextColor(225, 29, 72);
      pdf.text(`[${pair.match_status.toUpperCase()}]`, margin + 45, y + 4.5);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text(`Razão: ${pair.ledger_item.description} (${fmtCurrency(pair.ledger_item.amount, pair.ledger_item.currency)})`, margin + 3, y + 9);
    pdf.text(`Extrato: ${pair.statement_item.description} (${fmtCurrency(pair.statement_item.amount, pair.statement_item.currency)}) - ${pair.statement_item.bank_name}`, margin + 3, y + 13);

    pdf.setFont('helvetica', 'bold');
    const diffAbs = Math.abs(pair.ledger_item.amount - pair.statement_item.amount);
    pdf.setTextColor(diffAbs === 0 ? 5 : 225, diffAbs === 0 ? 150 : 29, diffAbs === 0 ? 105 : 72);
    pdf.text(`Dif: ${fmtCurrency(diffAbs)}`, pageWidth - margin - 35, y + 9);

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6.5);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    const acao = pdf.splitTextToSize(`Ação: ${pair.acao_sugerida}`, 90)[0];
    pdf.text(acao, pageWidth - margin - 95, y + 13);

    y += 19;
  });

  // ASSINATURAS
  if (y > pageHeight - 35) {
    pdf.addPage();
    drawHeader();
    y = 32;
  } else {
    y += 8;
  }

  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 15, y + 14, margin + 85, y + 14);
  pdf.line(pageWidth - margin - 85, y + 14, pageWidth - margin - 15, y + 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('Responsável pela Tesouraria / Reconciliação', margin + 18, y + 18);
  pdf.text('Auditoria Externa / Controladoria Geral', pageWidth - margin - 75, y + 18);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  pdf.save(`Laudo_Reconciliacao_${batch.batch_id}.pdf`);
}

/**
 * 5. Exporta Parecer de Triagem de Exceções & Riscos Contábeis em PDF
 */
export function exportExceptionsAuditPdf(
  exceptions: ExceptionTriageResult[],
  filterName = 'Geral'
): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navyDark = [15, 23, 42];
  const slateMid = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    pdf.setFillColor(225, 29, 72); // rose accent
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  RELATÓRIO DE EXCEÇÕES, RISCOS & ANOMALIAS', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(`DOSSIÊ DE AUDITORIA DE ANOMALIAS E DIRETRIZES DE MITIGAÇÃO • FILTRO: ${filterName.toUpperCase()}`, margin, 16);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL: ${exceptions.length} CASOS`, pageWidth - margin - 35, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 35, 17);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text('Relatório emitido para avaliação de materialidade pelo Comitê de Auditoria e Governança.', margin, pageHeight - 8);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PARECER DE AUDITORIA SOBRE EXCEÇÕES & RISCOS OPERACIONAIS', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(`Mapeamento analítico de divergências materiais com triagem de risco por inteligência artificial estruturada.`, margin, y);
  y += 8;

  // Listagem de Exceções
  exceptions.forEach((exc, idx) => {
    if (y > pageHeight - 48) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    const isResolved = exc.status === 'RESOLVED_BY_HUMAN';
    const isCritica = exc.prioridade === 'critica' || exc.prioridade === 'alta';

    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.setDrawColor(isCritica ? 254 : borderGray[0], isCritica ? 205 : borderGray[1], isCritica ? 211 : borderGray[2]);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 38, 2, 2, 'FD');

    // Header da Exceção
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text(`${idx + 1}. [${exc.exception_id}] ${exc.title}`, margin + 4, y + 6);

    // Badges de prioridade e resolução
    pdf.setFontSize(7.5);
    if (isResolved) {
      pdf.setTextColor(5, 150, 105);
      pdf.text('RESOLVIDO', pageWidth - margin - 25, y + 6);
    } else {
      pdf.setTextColor(isCritica ? 225 : 217, isCritica ? 29 : 119, isCritica ? 72 : 6);
      pdf.text(`PRIORIDADE ${exc.prioridade.toUpperCase()}`, pageWidth - margin - 35, y + 6);
    }

    // Detalhes da Categoria e Impacto
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text(`Módulo: ${exc.source_module.toUpperCase()}  |  Categoria: ${exc.category}  |  Modelo IA: ${exc.model_used}`, margin + 4, y + 11);

    // Impacto e Fatos
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    const impacto = pdf.splitTextToSize(`Impacto: ${exc.impacto_potencial}`, pageWidth - margin * 2 - 8)[0];
    pdf.text(impacto, margin + 4, y + 16);

    // Condição objetiva de encerramento
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(37, 99, 235);
    const condicao = pdf.splitTextToSize(`Condição de Encerramento: ${exc.condicao_objetiva_encerramento}`, pageWidth - margin * 2 - 8)[0];
    pdf.text(condicao, margin + 4, y + 21);

    // Parecer do Auditor se resolvido
    if (isResolved) {
      pdf.setFillColor(236, 253, 245);
      pdf.roundedRect(margin + 2, y + 24, pageWidth - margin * 2 - 4, 11, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      pdf.setTextColor(6, 95, 70);
      pdf.text(`Homologado por: ${exc.resolved_by || 'Auditor'} em ${formatDate(exc.resolved_at)}`, margin + 4, y + 28);
      pdf.setFont('helvetica', 'normal');
      const notes = pdf.splitTextToSize(`Notas: "${exc.resolution_notes || ''}"`, pageWidth - margin * 2 - 12)[0];
      pdf.text(notes, margin + 4, y + 32);
    }

    y += 42;
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  pdf.save(`Parecer_Excecoes_Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 6. Exporta Minuta de Lançamento Contábil & Voucher de Diário em PDF
 */
export function exportJournalProposalPdf(proposal: JournalEntryProposal): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navyDark = [15, 23, 42];
  const slateMid = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    pdf.setFillColor(16, 185, 129); // emerald
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  MINUTA DE LANÇAMENTO CONTÁBIL & VOUCHER DE DIÁRIO', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text('PROPOSTA CONTÁBIL COM EQUILÍBRIO DE DÉBITOS E CRÉDITOS (PARTIDAS DOBRADAS)', margin, 16);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`VOUCHER: ${proposal.proposal_id}`, pageWidth - margin - 40, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`DATA: ${formatDate(proposal.created_at)}`, pageWidth - margin - 40, 17);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text('Minuta oficial para escrituração e integração via API com sistemas ERP (SAP, Totvs, Oracle).', margin, pageHeight - 8);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PROPOSTA DE ESCRITURAÇÃO CONTÁBIL (JOURNAL ENTRY VOUCHER)', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(
    `Origem: ${proposal.source_transaction_desc || proposal.source_document_id || 'Transação Avulsa'} • Modelo IA: ${proposal.model_used}`,
    margin,
    y
  );
  y += 8;

  // Box de Status e Partidas Dobradas
  const val = proposal.validation;
  const isApproved = proposal.human_decision?.status === 'APPROVED_FOR_POSTING';
  const isRejected = proposal.human_decision?.status === 'REJECTED' || val.isAutoRejected;

  pdf.setFillColor(isApproved ? 236 : isRejected ? 255 : 254, isApproved ? 253 : isRejected ? 241 : 252, isApproved ? 245 : isRejected ? 242 : 232);
  pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(isApproved ? 6 : isRejected ? 159 : 146, isApproved ? 95 : isRejected ? 18 : 64, isApproved ? 70 : isRejected ? 57 : 14);
  pdf.text(
    isApproved
      ? 'STATUS: APROVADO PARA LANÇAMENTO DEFINITIVO NO ERP'
      : isRejected
      ? 'STATUS: LANÇAMENTO REJEITADO PELO AUDITOR'
      : 'STATUS: PENDENTE DE REVISÃO E APROVAÇÃO DO AUDITOR',
    margin + 4,
    y + 6
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Total Débitos: ${fmtCurrency(val.totalDebits)}  |  Total Créditos: ${fmtCurrency(val.totalCredits)}  |  Balanço: ${val.isBalanced ? 'EQUILIBRADO (R$ 0,00)' : 'DESBALANCEADO'}`, margin + 4, y + 12);
  pdf.text(`Parecer: "${proposal.human_decision?.notes || val.details}"`, margin + 4, y + 17);

  y += 28;

  // Tabela de Partidas Dobradas
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('PARTIDAS DOBRADAS PROPOSTAS:', margin, y);
  y += 5;

  // Header Tabela
  pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.rect(margin, y, pageWidth - margin * 2, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.text('#', margin + 3, y + 4);
  pdf.text('Código da Conta', margin + 10, y + 4);
  pdf.text('Nome da Conta / Rubrica', margin + 40, y + 4);
  pdf.text('Débito (R$)', margin + 115, y + 4);
  pdf.text('Crédito (R$)', margin + 145, y + 4);
  y += 6;

  proposal.proposed_lines.forEach((line, idx) => {
    pdf.setFillColor(idx % 2 === 0 ? 255 : bgLight[0], idx % 2 === 0 ? 255 : bgLight[1], idx % 2 === 0 ? 255 : bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.rect(margin, y, pageWidth - margin * 2, 6, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(line.line_number || idx + 1), margin + 3, y + 4.2);
    pdf.text(line.conta, margin + 10, y + 4.2);
    pdf.text(line.account_name || 'Conta Contábil', margin + 40, y + 4.2);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(line.debito_candidato > 0 ? 5 : 100, line.debito_candidato > 0 ? 150 : 100, line.debito_candidato > 0 ? 105 : 100);
    pdf.text(fmtCurrency(line.debito_candidato), margin + 115, y + 4.2);

    pdf.setTextColor(line.credito_candidato > 0 ? 37 : 100, line.credito_candidato > 0 ? 99 : 100, line.credito_candidato > 0 ? 235 : 100);
    pdf.text(fmtCurrency(line.credito_candidato), margin + 145, y + 4.2);

    y += 6;
  });

  y += 10;

  // Assinaturas
  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 15, y + 15, margin + 85, y + 15);
  pdf.line(pageWidth - margin - 85, y + 15, pageWidth - margin - 15, y + 15);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text(proposal.human_decision?.auditor || 'Auditor Contábil Responsável', margin + 18, y + 19);
  pdf.text('Sistema ERP • Registro de Integração', pageWidth - margin - 75, y + 19);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  pdf.save(`Minuta_Lancamento_${proposal.proposal_id}.pdf`);
}

/**
 * 7. Exporta Certificado de Fechamento Contábil Mensal em PDF
 */
export function exportClosingChecklistPdf(checklist: ClosingChecklistResult): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const navyDark = [15, 23, 42];
  const slateMid = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const bgLight = [248, 250, 252];

  const drawHeader = () => {
    pdf.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.rect(0, 0, pageWidth, 24, 'F');

    pdf.setFillColor(99, 102, 241); // indigo
    pdf.rect(0, 23, pageWidth, 1.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DOCAUDIT AI  •  CERTIFICADO DE FECHAMENTO CONTÁBIL MENSAL', margin, 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(203, 213, 225);
    pdf.text(`PERÍODO: ${checklist.periodo_referencia}  •  ENTIDADE: ${checklist.entidade}`, margin, 16);

    pdf.setFont('helvetica', 'bold');
    pdf.text(`CHECKLIST: ${checklist.checklist_id}`, pageWidth - margin - 40, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 40, 17);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text('Certificado emitido para comprovação de encerramento de exercício e conformidade SOX/IFRS.', margin, pageHeight - 8);
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  };

  drawHeader();
  y = 32;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('CERTIFICADO DE CONFORMIDADE DA ESTEIRA DE FECHAMENTO', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
  pdf.text(`Resumo do fechamento com verificação de dependências contábeis e travas regulatórias.`, margin, y);
  y += 7;

  // Box de Status do Fechamento
  const isBlocked = checklist.is_closing_blocked;
  pdf.setFillColor(isBlocked ? 255 : 236, isBlocked ? 241 : 253, isBlocked ? 242 : 245);
  pdf.setDrawColor(isBlocked ? 254 : 167, isBlocked ? 205 : 243, isBlocked ? 211 : 208);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(isBlocked ? 159 : 6, isBlocked ? 18 : 95, isBlocked ? 57 : 70);
  pdf.text(
    isBlocked ? 'STATUS: FECHAMENTO TEMPORARIAMENTE BLOQUEADO POR TRAVAS MANDATÓRIAS' : 'STATUS: FECHAMENTO LIBERADO COM SUCESSO',
    margin + 4,
    y + 6
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `Tarefas Concluídas: ${checklist.completed_count}  |  Bloqueadas: ${checklist.blocked_count}  |  Pendentes: ${checklist.pending_count}`,
    margin + 4,
    y + 12
  );
  if (isBlocked && checklist.blocking_reasons.length > 0) {
    const reasons = pdf.splitTextToSize(`Bloqueios: ${checklist.blocking_reasons.join('; ')}`, pageWidth - margin * 2 - 8)[0];
    pdf.text(reasons, margin + 4, y + 16);
  }

  y += 26;

  // Tabela de Tarefas
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text(`CRONOGRAMA DE TAREFAS EXECUTADAS (${checklist.tasks.length}):`, margin, y);
  y += 5;

  checklist.tasks.forEach((task) => {
    if (y > pageHeight - 30) {
      pdf.addPage();
      drawHeader();
      y = 32;
    }

    pdf.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    pdf.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 14, 1, 1, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
    pdf.text(`[${task.modulo.toUpperCase()}] ${task.descricao}`, margin + 3, y + 4.5);

    // Status
    if (task.status === 'CONCLUIDO') {
      pdf.setTextColor(5, 150, 105);
      pdf.text('CONCLUÍDO', pageWidth - margin - 25, y + 4.5);
    } else if (task.status === 'BLOQUEADO') {
      pdf.setTextColor(225, 29, 72);
      pdf.text('BLOQUEADO', pageWidth - margin - 25, y + 4.5);
    } else {
      pdf.setTextColor(217, 119, 6);
      pdf.text('PENDENTE', pageWidth - margin - 25, y + 4.5);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(slateMid[0], slateMid[1], slateMid[2]);
    pdf.text(`Responsável: ${task.responsavel}  |  Critério: ${task.criterio_aceite}`, margin + 3, y + 9);

    if (task.motivo_bloqueio) {
      pdf.setTextColor(159, 18, 57);
      pdf.text(`Motivo Bloqueio: ${task.motivo_bloqueio}`, margin + 3, y + 12.5);
    }

    y += 16;
  });

  // Assinaturas
  if (y > pageHeight - 35) {
    pdf.addPage();
    drawHeader();
    y = 32;
  } else {
    y += 6;
  }

  pdf.setDrawColor(148, 163, 184);
  pdf.line(margin + 15, y + 14, margin + 85, y + 14);
  pdf.line(pageWidth - margin - 85, y + 14, pageWidth - margin - 15, y + 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  pdf.text('Controller Geral / Auditor Responsável', margin + 18, y + 18);
  pdf.text('Diretoria Financeira / CFO Sponsor', pageWidth - margin - 75, y + 18);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  pdf.save(`Certificado_Fechamento_${checklist.periodo_referencia}.pdf`);
}

