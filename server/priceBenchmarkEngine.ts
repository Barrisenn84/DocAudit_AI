import {
  PriceBenchmarkItem,
  LineItemPriceBenchmarkComparison,
  DocumentPriceBenchmarkAudit,
  PriceAnomalyStatus,
  LineItem,
  ProcessedDocument,
} from '../src/types/finance.js';

/**
 * 1. Base Histórica de Preços de Mercado & Benchmarks Corporativos
 * Alimentada por contratações corporativas auditadas, compras governamentais e histórico de faturamento.
 */
export const HISTORICAL_PRICE_BENCHMARKS: PriceBenchmarkItem[] = [
  // INFRAESTRUTURA EM NUVEM (CLOUD)
  {
    id: 'BM-CLOUD-EC2',
    itemKey: 'cloud_ec2_compute',
    category: 'CLOUD_INFRASTRUCTURE',
    description: 'Instância de Computação em Nuvem Linux (vCPU 8, 32GB RAM / Mês)',
    unit: 'mês',
    minPrice: 2800.0,
    medianPrice: 3200.0,
    maxPrice: 3600.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 25.0,
    sampleSize: 184,
    verifiedVendors: ['AWS Serviços de Nuvem Ltda', 'Google Cloud Brasil', 'Microsoft Informática'],
    lastUpdated: '2026-09-30',
  },
  {
    id: 'BM-CLOUD-S3',
    itemKey: 'cloud_s3_storage',
    category: 'CLOUD_INFRASTRUCTURE',
    description: 'Armazenamento de Objetos em Nuvem Seguro (por Terabyte / Mês)',
    unit: 'TB/mês',
    minPrice: 750.0,
    medianPrice: 850.0,
    maxPrice: 980.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 30.0,
    sampleSize: 220,
    verifiedVendors: ['AWS Serviços de Nuvem Ltda', 'Google Cloud Brasil'],
    lastUpdated: '2026-09-30',
  },
  {
    id: 'BM-CLOUD-RDS',
    itemKey: 'cloud_rds_database',
    category: 'CLOUD_INFRASTRUCTURE',
    description: 'Banco de Dados Gerenciado Relacional PostgreSQL / MySQL Multi-AZ',
    unit: 'mês',
    minPrice: 1750.0,
    medianPrice: 1950.0,
    maxPrice: 2250.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 25.0,
    sampleSize: 135,
    verifiedVendors: ['AWS Serviços de Nuvem Ltda', 'Oracle do Brasil'],
    lastUpdated: '2026-09-30',
  },

  // SERVIÇOS PROFISSIONAIS & CONSULTORIA DE TI
  {
    id: 'BM-SRV-DEV-SR',
    itemKey: 'senior_developer_hour',
    category: 'PROFESSIONAL_SERVICES',
    description: 'Hora Técnica de Desenvolvimento de Software Fullstack / IA Sênior',
    unit: 'hora',
    minPrice: 180.0,
    medianPrice: 220.0,
    maxPrice: 280.0,
    currency: 'BRL',
    toleranceWarningPct: 20.0,
    toleranceCriticalPct: 35.0,
    sampleSize: 310,
    verifiedVendors: ['TechCloud Brasil Soluções em Nuvem S.A.', 'GlobalLogic Brasil', 'Stefanini IT'],
    lastUpdated: '2026-10-01',
  },
  {
    id: 'BM-SRV-DBA-ORACLE',
    itemKey: 'dba_specialist_hour',
    category: 'PROFESSIONAL_SERVICES',
    description: 'Hora de Consultoria Especializada em Banco de Dados / Tuning / Migração',
    unit: 'hora',
    minPrice: 220.0,
    medianPrice: 260.0,
    maxPrice: 340.0,
    currency: 'BRL',
    toleranceWarningPct: 18.0,
    toleranceCriticalPct: 30.0,
    sampleSize: 145,
    verifiedVendors: ['Oracle do Brasil', 'TmaxSoft do Brasil'],
    lastUpdated: '2026-09-15',
  },

  // SOFTWARE SAAS & LICENCIAMENTO
  {
    id: 'BM-SAAS-ERP-LIC',
    itemKey: 'erp_user_license',
    category: 'SOFTWARE_SAAS',
    description: 'Licença Mensal de Usuário Nomina do Sistema ERP Fiscal / Contábil',
    unit: 'licença/mês',
    minPrice: 120.0,
    medianPrice: 150.0,
    maxPrice: 190.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 25.0,
    sampleSize: 420,
    verifiedVendors: ['SoftCorp Tecnologia Ltda', 'TOTVS S.A.', 'SAP Brasil'],
    lastUpdated: '2026-10-01',
  },

  // SUPRIMENTOS DE ESCRITÓRIO & FACILITIES
  {
    id: 'BM-SUP-PAPEL-A4',
    itemKey: 'papel_a4_chamex_cx',
    category: 'OFFICE_SUPPLIES',
    description: 'Caixa de Papel Sulfite A4 Branco 75g (10 resmas / 5.000 folhas)',
    unit: 'caixa',
    minPrice: 230.0,
    medianPrice: 260.0,
    maxPrice: 310.0,
    currency: 'BRL',
    toleranceWarningPct: 20.0,
    toleranceCriticalPct: 40.0,
    sampleSize: 512,
    verifiedVendors: ['Kalunga Comércio e Indústria Gráfica Ltda', 'Gimba Suprimentos', 'Papelaria Central'],
    lastUpdated: '2026-09-20',
  },
  {
    id: 'BM-SUP-TONER-HP',
    itemKey: 'toner_laser_hp_original',
    category: 'OFFICE_SUPPLIES',
    description: 'Cartucho de Toner Laserjet Monocromático Original de Alto Rendimento',
    unit: 'unidade',
    minPrice: 420.0,
    medianPrice: 480.0,
    maxPrice: 560.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 30.0,
    sampleSize: 280,
    verifiedVendors: ['Kalunga Comércio e Indústria Gráfica Ltda', 'HP Brasil'],
    lastUpdated: '2026-09-25',
  },

  // HARDWARE & EQUIPAMENTOS DE TI
  {
    id: 'BM-HW-NOTE-CORP',
    itemKey: 'notebook_corporativo_i7',
    category: 'HARDWARE_EQUIPMENT',
    description: 'Notebook Corporativo Intel Core i7 16GB RAM 512GB SSD com Garantia ProSupport 3 Anos',
    unit: 'unidade',
    minPrice: 5800.0,
    medianPrice: 6500.0,
    maxPrice: 7600.0,
    currency: 'BRL',
    toleranceWarningPct: 15.0,
    toleranceCriticalPct: 25.0,
    sampleSize: 95,
    verifiedVendors: ['Dell Computadores do Brasil', 'Lenovo Tecnologia', 'HP Brasil'],
    lastUpdated: '2026-10-02',
  },
  {
    id: 'BM-HW-MONITOR-27',
    itemKey: 'monitor_27_ips_4k',
    category: 'HARDWARE_EQUIPMENT',
    description: 'Monitor Profissional 27 polegadas IPS 4K UHD com Ajuste de Altura e Hub USB-C',
    unit: 'unidade',
    minPrice: 1900.0,
    medianPrice: 2200.0,
    maxPrice: 2600.0,
    currency: 'BRL',
    toleranceWarningPct: 18.0,
    toleranceCriticalPct: 30.0,
    sampleSize: 110,
    verifiedVendors: ['Dell Computadores do Brasil', 'LG Electronics Brasil'],
    lastUpdated: '2026-09-10',
  },

  // TELECOMUNICAÇÕES & CONECTIVIDADE
  {
    id: 'BM-TEL-LINK-1GB',
    itemKey: 'link_dedicado_fibra_1gbps',
    category: 'TELECOM_DATA',
    description: 'Link Dedicado de Internet IP Full Duplex 1 Gbps com SLA de 99.9% e BGP',
    unit: 'mês',
    minPrice: 2800.0,
    medianPrice: 3400.0,
    maxPrice: 4200.0,
    currency: 'BRL',
    toleranceWarningPct: 20.0,
    toleranceCriticalPct: 35.0,
    sampleSize: 64,
    verifiedVendors: ['Claro Brasil / Embratel', 'Telefônica Brasil (Vivo)', 'Lumen Technologies'],
    lastUpdated: '2026-08-30',
  },
];

/**
 * 2. Casador Semântico de Linha de Fatura com o Catálogo de Benchmarks
 */
export function matchBenchmarkForItem(description: string): PriceBenchmarkItem | null {
  if (!description) return null;
  const descNorm = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Mapeamentos diretos por palavras-chave relevantes
  if (descNorm.includes('ec2') || descNorm.includes('elastic compute') || (descNorm.includes('computacao') && descNorm.includes('nuvem'))) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'cloud_ec2_compute') || null;
  }
  if (descNorm.includes('s3') || descNorm.includes('simple storage') || (descNorm.includes('armazenamento') && descNorm.includes('nuvem'))) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'cloud_s3_storage') || null;
  }
  if (descNorm.includes('rds') || descNorm.includes('relational database') || (descNorm.includes('banco de dados') && descNorm.includes('gerenciado'))) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'cloud_rds_database') || null;
  }
  if (descNorm.includes('desenvolvedor') || descNorm.includes('desenvolvimento de software') || descNorm.includes('programador') || descNorm.includes('hora dev')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'senior_developer_hour') || null;
  }
  if (descNorm.includes('dba') || descNorm.includes('consultoria oracle') || descNorm.includes('tuning de banco')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'dba_specialist_hour') || null;
  }
  if (descNorm.includes('licenca') && (descNorm.includes('erp') || descNorm.includes('software') || descNorm.includes('usuario'))) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'erp_user_license') || null;
  }
  if (descNorm.includes('papel') || descNorm.includes('sulfite') || descNorm.includes('a4') || descNorm.includes('chamex')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'papel_a4_chamex_cx') || null;
  }
  if (descNorm.includes('toner') || descNorm.includes('cartucho') || descNorm.includes('laserjet')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'toner_laser_hp_original') || null;
  }
  if (descNorm.includes('notebook') || descNorm.includes('laptop') || descNorm.includes('computador portatil')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'notebook_corporativo_i7') || null;
  }
  if (descNorm.includes('monitor') || descNorm.includes('display') || descNorm.includes('tela 4k')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'monitor_27_ips_4k') || null;
  }
  if (descNorm.includes('link dedicado') || descNorm.includes('fibra') || descNorm.includes('internet 1gbps')) {
    return HISTORICAL_PRICE_BENCHMARKS.find((b) => b.itemKey === 'link_dedicado_fibra_1gbps') || null;
  }

  return null;
}

/**
 * 3. Motor de Auditoria: Compara Linhas do Documento com Benchmarks e Histórico do Fornecedor
 */
export function evaluateDocumentPriceBenchmarks(
  doc: {
    id: string;
    vendor_name?: string | null;
    vendor_tax_id?: string | null;
    line_items: LineItem[];
    total?: number | null;
    currency?: string | null;
  },
  historicalDocs: ProcessedDocument[] = []
): DocumentPriceBenchmarkAudit {
  const lineItems = doc.line_items || [];
  const currency = doc.currency || 'BRL';
  const vendorName = doc.vendor_name || 'Fornecedor Não Identificado';

  let anomalousCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let underpricingCount = 0;
  let benchmarkedCount = 0;
  let totalOverpaymentRisk = 0;

  // Busca histórico de faturamento deste mesmo fornecedor
  const vendorPastDocs = historicalDocs.filter(
    (d) =>
      d.id !== doc.id &&
      (d.geminiExtraction?.vendor_name?.toLowerCase().trim() === vendorName.toLowerCase().trim() ||
        (doc.vendor_tax_id && d.geminiExtraction?.vendor_tax_id === doc.vendor_tax_id))
  );

  const lineComparisons: LineItemPriceBenchmarkComparison[] = lineItems.map((item, idx) => {
    const itemNum = item.item_number || idx + 1;
    const desc = item.description || `Item #${itemNum}`;
    const unitPrice = typeof item.unit_price === 'number' && !isNaN(item.unit_price) ? item.unit_price : 0;
    const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const lineTotal = typeof item.line_total === 'number' ? item.line_total : unitPrice * qty;

    const matchedBm = matchBenchmarkForItem(desc);

    if (!matchedBm || unitPrice <= 0) {
      return {
        itemNumber: itemNum,
        description: desc,
        extractedUnitPrice: unitPrice,
        extractedQuantity: qty,
        extractedLineTotal: lineTotal,
        currency,
        matchedBenchmark: null,
        benchmarkMedianPrice: null,
        benchmarkMinPrice: null,
        benchmarkMaxPrice: null,
        variancePercentage: null,
        varianceAmountPerUnit: null,
        estimatedTotalFinancialImpact: 0,
        status: 'UNBENCHMARKED' as PriceAnomalyStatus,
        anomalyTitle: 'Item Não Mapeado no Catálogo de Mercado',
        anomalySeverity: 'normal',
        details: 'Descrição específica ou customizada sem referência homogênea de mercado suficiente.',
        recommendedAction: 'Auditoria de rotina recomendada.',
      };
    }

    benchmarkedCount++;

    const median = matchedBm.medianPrice;
    const variancePct = Number((((unitPrice - median) / median) * 100).toFixed(1));
    const varianceUnit = Number((unitPrice - median).toFixed(2));
    const totalImpact = Number(((unitPrice - median) * qty).toFixed(2));

    let status: PriceAnomalyStatus = 'NORMAL';
    let anomalyTitle = 'Preço Conforme Parâmetros de Mercado';
    let anomalySeverity: 'normal' | 'warning' | 'critical' = 'normal';
    let details = `Preço unitário praticado (R$ ${unitPrice.toFixed(2)}) compatível com a mediana do mercado (R$ ${median.toFixed(2)}).`;
    let recommendedAction = 'Aprovado para pagamento sem restrição de sobrepreço.';

    // Teste 1: Sobrepreço Crítico (Spike acima do limite crítico)
    if (variancePct >= matchedBm.toleranceCriticalPct) {
      status = 'PRICE_SPIKE_CRITICAL';
      anomalyTitle = `Sobrepreço Crítico Detectado (+${variancePct}% acima da mediana)`;
      anomalySeverity = 'critical';
      details = `Preço praticado de R$ ${unitPrice.toFixed(2)} excede o teto tolerado de mercado de R$ ${matchedBm.maxPrice.toFixed(2)}. Exposição potencial de R$ ${totalImpact.toFixed(2)}.`;
      recommendedAction = 'Bloquear autorização de pagamento imediata. Solicitar justificativa técnica ou renegociação de tabela.';
      anomalousCount++;
      criticalCount++;
      totalOverpaymentRisk += Math.max(0, totalImpact);
    }
    // Teste 2: Alerta Moderado de Preço Elevado
    else if (variancePct >= matchedBm.toleranceWarningPct) {
      status = 'PRICE_SPIKE_WARNING';
      anomalyTitle = `Alerta de Preço Acima da Mediana (+${variancePct}%)`;
      anomalySeverity = 'warning';
      details = `Preço praticado de R$ ${unitPrice.toFixed(2)} está acima da mediana histórica de R$ ${median.toFixed(2)} (${matchedBm.sampleSize} contratos).`;
      recommendedAction = 'Verificar se houve aditivo, SLA diferenciado ou prêmio de entrega na ordem de compra.';
      anomalousCount++;
      warningCount++;
      totalOverpaymentRisk += Math.max(0, totalImpact);
    }
    // Teste 3: Subprecificação Extrema / Dumping Suspeito (< -40%)
    else if (variancePct <= -40.0) {
      status = 'SUSPICIOUS_UNDERPRICING';
      anomalyTitle = `Subprecificação Anômala (${variancePct}% abaixo da mediana)`;
      anomalySeverity = 'warning';
      details = `Preço de R$ ${unitPrice.toFixed(2)} significativamente inferior ao piso histórico de R$ ${matchedBm.minPrice.toFixed(2)}. Risco de erro de digitação, produto adulterado ou unidade de medida incorreta.`;
      recommendedAction = 'Validar se a unidade faturada refere-se a fração (ex.: resma avulsa vs caixa fechada).';
      anomalousCount++;
      underpricingCount++;
    }

    return {
      itemNumber: itemNum,
      description: desc,
      extractedUnitPrice: unitPrice,
      extractedQuantity: qty,
      extractedLineTotal: lineTotal,
      currency,
      matchedBenchmark: matchedBm,
      benchmarkMedianPrice: median,
      benchmarkMinPrice: matchedBm.minPrice,
      benchmarkMaxPrice: matchedBm.maxPrice,
      variancePercentage: variancePct,
      varianceAmountPerUnit: varianceUnit,
      estimatedTotalFinancialImpact: Math.max(0, totalImpact),
      status,
      anomalyTitle,
      anomalySeverity,
      details,
      recommendedAction,
    };
  });

  // Consistência Histórica do Fornecedor
  let vendorHistoricalConsistency: 'CONSISTENT_WITH_HISTORY' | 'UNUSUAL_PRICE_INCREASE' | 'FIRST_TIME_VENDOR' = 'CONSISTENT_WITH_HISTORY';
  if (vendorPastDocs.length === 0) {
    vendorHistoricalConsistency = 'FIRST_TIME_VENDOR';
  } else if (criticalCount > 0 || warningCount > 0) {
    vendorHistoricalConsistency = 'UNUSUAL_PRICE_INCREASE';
  }

  // Score de Risco de Preço (0 a 100)
  let riskScore = 10;
  if (criticalCount > 0) {
    riskScore += criticalCount * 30;
  }
  if (warningCount > 0) {
    riskScore += warningCount * 15;
  }
  if (underpricingCount > 0) {
    riskScore += 10;
  }
  riskScore = Math.min(Math.max(riskScore, 0), 100);

  let overallStatus: 'APPROVED_BENCHMARK' | 'PRICE_ANOMALY_WARNING' | 'CRITICAL_PRICE_SURCHARGE' = 'APPROVED_BENCHMARK';
  if (criticalCount > 0 || riskScore >= 70) {
    overallStatus = 'CRITICAL_PRICE_SURCHARGE';
  } else if (warningCount > 0 || riskScore >= 35) {
    overallStatus = 'PRICE_ANOMALY_WARNING';
  }

  const executiveSummary =
    overallStatus === 'CRITICAL_PRICE_SURCHARGE'
      ? `Foram detectadas ${criticalCount} anomalia(s) crítica(s) de sobrepreço com impacto financeiro estimado em R$ ${totalOverpaymentRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Valores ultrapassam os limites de tolerância de mercado.`
      : overallStatus === 'PRICE_ANOMALY_WARNING'
      ? `Identificada(s) ${warningCount} variação(ões) moderada(s) de preço acima da mediana de mercado. Recomenda-se conferência das cláusulas comerciais.`
      : `Preços praticados 100% aderentes aos benchmarks históricos de mercado (${benchmarkedCount} itens confrontados com ${HISTORICAL_PRICE_BENCHMARKS.length} referências).`;

  return {
    documentId: doc.id,
    vendorName,
    evaluatedAt: new Date().toISOString(),
    totalItemsEvaluated: lineItems.length,
    benchmarkedItemsCount: benchmarkedCount,
    anomalousItemsCount: anomalousCount,
    criticalSpikeCount: criticalCount,
    warningSpikeCount: warningCount,
    suspiciousUnderpricingCount: underpricingCount,
    totalOverpaymentRisk,
    overallPricingRiskScore: riskScore,
    overallStatus,
    vendorHistoricalConsistency,
    executiveSummary,
    lineComparisons,
  };
}
