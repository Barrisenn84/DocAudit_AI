import { GoogleGenAI } from '@google/genai';
import {
  ProcessedDocument,
  BenfordLawAnalysisResult,
  SodAuditViolation,
  TaxReformSimulation,
  SpedAuditReport,
  DdaElectronicInvoiceItem,
  EsgCorporateSustainabilitySummary,
} from '../src/types/finance.js';

// Modelos oficiais do Google AI Studio / Gemini API
export const GEMINI_MODELS = {
  FLASH: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  PRO: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
  LITE: process.env.GEMINI_LITE_MODEL || 'gemini-2.0-flash-lite',
  FALLBACK_ORDER: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ],
};

let userConfiguredApiKey: string | null = null;

/**
 * Define ou atualiza a chave da API do Gemini configurada em tempo de execução
 */
export function setUserApiKey(key: string | null): void {
  userConfiguredApiKey = key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * Obtém a chave de API ativa (prioriza chave do usuário, depois variável de ambiente)
 */
export function getActiveApiKey(customKey?: string): string | null {
  if (customKey && customKey.trim().length > 0) return customKey.trim();
  if (userConfiguredApiKey) return userConfiguredApiKey;
  return process.env.GEMINI_API_KEY || null;
}

/**
 * Inicializa a instância do SDK GoogleGenAI com a chave ativa
 */
export function getGenAIClient(customKey?: string): GoogleGenAI | null {
  const apiKey = getActiveApiKey(customKey);
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'DocAuditAI/2.0-Enterprise',
      },
    },
  });
}

/**
 * Executa generateContent com fallback automático de modelos suportados
 */
export async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  preferredModel?: string;
  customKey?: string;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAIClient(params.customKey);
  if (!ai) {
    throw new Error('Chave de API do Google Gemini não configurada.');
  }

  const primaryModel = params.preferredModel || GEMINI_MODELS.FLASH;
  const candidateModels = [
    primaryModel,
    ...GEMINI_MODELS.FALLBACK_ORDER.filter((m) => m !== primaryModel),
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      const text = response.text?.trim() || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      console.warn(`[DocAudit AI Service] Falha com modelo ${model}:`, err?.message || err);
      // Tenta próximo modelo na lista
    }
  }

  throw new Error(`Falha em todas as tentativas de IA: ${lastError?.message || 'Erro desconhecido'}`);
}

/**
 * Verifica a integridade e saúde da conexão com a API do Gemini
 */
export async function checkAiHealth(customKey?: string): Promise<{
  isAvailable: boolean;
  activeModel: string;
  latencyMs: number;
  hasKey: boolean;
  error?: string;
}> {
  const apiKey = getActiveApiKey(customKey);
  if (!apiKey) {
    return {
      isAvailable: false,
      activeModel: GEMINI_MODELS.FLASH,
      latencyMs: 0,
      hasKey: false,
      error: 'Nenhuma chave de API (GEMINI_API_KEY) configurada.',
    };
  }

  const startTime = Date.now();
  try {
    const ai = getGenAIClient(apiKey);
    if (!ai) throw new Error('Falha ao instanciar cliente GenAI.');

    const res = await ai.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: 'Responda apenas: OK',
    });

    const latencyMs = Date.now() - startTime;
    return {
      isAvailable: Boolean(res.text),
      activeModel: GEMINI_MODELS.FLASH,
      latencyMs,
      hasKey: true,
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      activeModel: GEMINI_MODELS.FLASH,
      latencyMs: Date.now() - startTime,
      hasKey: true,
      error: err?.message || 'Falha ao conectar aos servidores do Google Gemini.',
    };
  }
}

/**
 * GERAÇÃO DE PARECER FORENSE & LAUDO PERICIAL SOX (Módulo 12)
 */
export async function generateForensicAiOpinion(
  benfordResult: BenfordLawAnalysisResult,
  sodViolations: SodAuditViolation[],
  documentsCount: number,
  customKey?: string
): Promise<{
  opinionTitle: string;
  riskRating: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  laudoExecutiveSummary: string;
  anomaliesIdentified: string[];
  recommendations: string[];
  suggestedAuditSamplingPct: number;
  modelUsed: string;
}> {
  const ai = getGenAIClient(customKey);
  if (!ai) {
    // Fallback inteligente
    return {
      opinionTitle: 'Parecer Forense Preliminar (Motor Heurístico)',
      riskRating: sodViolations.some((v) => v.severity === 'CRITICAL_BLOCK') ? 'ALTO' : 'MEDIO',
      laudoExecutiveSummary: `Auditoria sobre ${documentsCount} documentos. Desvio médio da Lei de Benford de ${benfordResult.meanDeviationPct}% com escore Qui-Quadrado de ${benfordResult.chiSquareScore}. Identificadas ${sodViolations.length} potenciais violações de Segregação de Funções (SoD).`,
      anomaliesIdentified: [
        'Concentração de transações imediatamente abaixo do limite de aprovação de alçada.',
        ...sodViolations.map((v) => `Conflito de interesse: ${v.operatorName} acumulando ${v.conflictingActivities.join(' e ')}.`),
      ],
      recommendations: [
        'Ativar bloqueio automático no ERP para operadores com perfis conflitantes.',
        'Instaurar amostragem dirigida de 15% nos lançamentos com dígitos anômalos.',
      ],
      suggestedAuditSamplingPct: 15,
      modelUsed: 'heuristic-engine-offline',
    };
  }

  const prompt = `Você é um Perito Forense Financeiro e Auditor Sênior de Conformidade SOX (Sarbanes-Oxley).
Analise os seguintes dados do sistema DocAudit AI e emita um parecer pericial de fraudes rigoroso em português do Brasil:

DADOS ESTATÍSTICOS DA LEI DE BENFORD:
- Total de Lançamentos Analisados: ${benfordResult.totalSampleTransactions}
- Desvio Médio Percentual: ${benfordResult.meanDeviationPct}%
- Qui-Quadrado (Chi-Square): ${benfordResult.chiSquareScore}
- Nível de Conformidade: ${benfordResult.conformityLevel}
- Documentos Suspeitos Sinalizados: ${JSON.stringify(benfordResult.suspiciousDocumentsFlagged || [])}

MATRIZ DE SEGREGAÇÃO DE FUNÇÕES (SoD):
${JSON.stringify(sodViolations, null, 2)}

TOTAL DE DOCUMENTOS AUDITADOS NO PERÍODO: ${documentsCount}

Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "opinionTitle": "string com título formal do laudo pericial",
  "riskRating": "BAIXO" | "MEDIO" | "ALTO" | "CRITICO",
  "laudoExecutiveSummary": "parágrafo executivo com síntese pericial fundamentada",
  "anomaliesIdentified": ["lista de anomalias concretas detectadas"],
  "recommendations": ["recomendações preventivas e corretivas para a controladoria"],
  "suggestedAuditSamplingPct": número percentual entre 5 e 40
}`;

  try {
    const res = await generateContentWithFallback({
      preferredModel: GEMINI_MODELS.PRO,
      contents: prompt,
      responseMimeType: 'application/json',
      customKey,
    });
    const parsed = JSON.parse(res.text);
    return { ...parsed, modelUsed: res.modelUsed };
  } catch (err) {
    console.warn('[DocAudit Forensic AI] Falha ao gerar parecer com IA:', err);
    return {
      opinionTitle: 'Parecer Forense Preliminar (Modo Contingência)',
      riskRating: 'MEDIO',
      laudoExecutiveSummary: 'Amostra sob conformidade aceitável com pontos de atenção pontuais em alçadas.',
      anomaliesIdentified: ['Variação nos dígitos médios da Lei de Benford.'],
      recommendations: ['Auditar documentos de valor superior a R$ 20.000.'],
      suggestedAuditSamplingPct: 10,
      modelUsed: 'heuristic-engine-fallback',
    };
  }
}

/**
 * GERAÇÃO DE ANÁLISE PREDITIVA DE TESOURARIA & LIQUIDEZ D+90 (Módulo 10)
 */
export async function generateTreasuryAiOpinion(
  summary: {
    startBalance: number;
    lowestProjectedBalance: number;
    lowestBalanceDate: string;
    totalInflowsPeriod: number;
    totalOutflowsPeriod: number;
    endingBalance: number;
    daysInTightLiquidity: number;
  },
  ddaInvoices: DdaElectronicInvoiceItem[],
  customKey?: string
): Promise<{
  liquidityVerdict: 'EXCELENTE' | 'ESTAVEL' | 'ATENCAO_REQUERIDA' | 'RISCO_DE_DEFICIT';
  cfoSummaryNote: string;
  strategicActionPlan: string[];
  workingCapitalTips: string[];
  discountingOpportunityEstimate: number;
  modelUsed: string;
}> {
  const prompt = `Você é o Diretor de Tesouraria e Especialista em Liquidez Corporativa (Head of Cash Management).
Analise a projeção de Fluxo de Caixa D+90 da empresa e o status dos boletos DDA:

DADOS DE TESOURARIA:
- Saldo Inicial: R$ ${summary.startBalance.toFixed(2)}
- Menor Saldo Projetado: R$ ${summary.lowestProjectedBalance.toFixed(2)} (Data: ${summary.lowestBalanceDate})
- Total de Entradas no Trimestre: R$ ${summary.totalInflowsPeriod.toFixed(2)}
- Total de Saídas Comprometidas: R$ ${summary.totalOutflowsPeriod.toFixed(2)}
- Saldo Final Previsto (D+90): R$ ${summary.endingBalance.toFixed(2)}
- Dias com Liquidez Apertada/Alerta: ${summary.daysInTightLiquidity} dias

BOLETOS ELETRÔNICOS DDA DO PERÍODO:
${JSON.stringify(ddaInvoices.map((d) => ({ beneficiario: d.beneficiaryName, valor: d.amount, vencimento: d.dueDate, status: d.matchStatus })), null, 2)}

Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "liquidityVerdict": "EXCELENTE" | "ESTAVEL" | "ATENCAO_REQUERIDA" | "RISCO_DE_DEFICIT",
  "cfoSummaryNote": "parecer executivo claro para o CFO sobre a curva de liquidez",
  "strategicActionPlan": ["ações práticas para proteger o colchão de liquidez"],
  "workingCapitalTips": ["dicas para otimização de contas a pagar (DPO) e antecipação com desconto dinâmico"],
  "discountingOpportunityEstimate": valor numérico em reais de economia potencial estimada
}`;

  try {
    const res = await generateContentWithFallback({
      preferredModel: GEMINI_MODELS.FLASH,
      contents: prompt,
      responseMimeType: 'application/json',
      customKey,
    });
    const parsed = JSON.parse(res.text);
    return { ...parsed, modelUsed: res.modelUsed };
  } catch (err) {
    return {
      liquidityVerdict: summary.lowestProjectedBalance < 150000 ? 'ATENCAO_REQUERIDA' : 'ESTAVEL',
      cfoSummaryNote: `Projeção D+90 com saldo final positivo de R$ ${summary.endingBalance.toLocaleString('pt-BR')}. Ponto crítico observado em ${summary.lowestBalanceDate}.`,
      strategicActionPlan: [
        'Monitorar concentração de vencimentos nos dias 15 a 20.',
        'Aproveitar propostas de Desconto Dinâmico para fornecedores homologados.',
      ],
      workingCapitalTips: [
        'Negociar extensão de prazo médio de pagamento (DPO) de fornecedores de TI.',
      ],
      discountingOpportunityEstimate: 4500.0,
      modelUsed: 'heuristic-engine-fallback',
    };
  }
}

/**
 * GERAÇÃO DE DIAGNÓSTICO DA REFORMA TRIBUTÁRIA COM IA (Módulo 9)
 */
export async function generateTaxReformAiDiagnosis(
  simulation: TaxReformSimulation,
  spedReport: SpedAuditReport,
  customKey?: string
): Promise<{
  executiveSummary: string;
  creditOpportunities: string[];
  splitPaymentImpact: string;
  complianceAlerts: string[];
  strategicActionList: string[];
  modelUsed: string;
}> {
  const prompt = `Você é o Sócio-Líder de Tributos e Auditor Fiscal Especialista na Reforma Tributária Brasileira (EC 132/2023 - IVA Dual: IBS/CBS).
Analise o diagnóstico da empresa com base nos seguintes dados simulados:

DADOS TRIBUTÁRIOS:
- Faturamento / Base Analisada: R$ ${simulation.grossTotal.toFixed(2)}
- Carga Tributária Atual (PIS/COFINS/ISS/ICMS): R$ ${simulation.currentRegimeTotalTax.toFixed(2)} (${simulation.currentRegimeEffectiveRate.toFixed(2)}%)
- Carga Tributária IBS + CBS: R$ ${simulation.newRegimeTotalTax.toFixed(2)} (${simulation.newRegimeEffectiveRate.toFixed(2)}%)
- Diferencial Nominal: R$ ${simulation.taxDifferentialAmount.toFixed(2)}
- Crédito Financeiro Estimado: R$ ${simulation.estimatedCreditAmount.toFixed(2)}
- Retenção Split Payment Estimada: R$ ${simulation.splitPaymentEstimate.taxAuthoritySplitDirect.toFixed(2)}

AUDITORIA SPED COMPLIANCE:
- Total de Registros Auditados: ${spedReport.totalRegistrosValidados}
- Status de Conformidade: ${spedReport.statusConformidade}
- Inconsistências Detectadas: ${spedReport.divergenciasApuradas}

Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "executiveSummary": "parecer executivo claro em português sobre o impacto líquido para a empresa",
  "creditOpportunities": ["oportunidades de aproveitamento integral de crédito tributário na cadeia B2B"],
  "splitPaymentImpact": "explicação do impacto do split payment bancário no fluxo de caixa operacional",
  "complianceAlerts": ["pontos de atenção para adequação dos sistemas fiscais e cadastros do Bloco 0150"],
  "strategicActionList": ["ações para mitigar custos tributários na transição 2026-2033"]
}`;

  try {
    const res = await generateContentWithFallback({
      preferredModel: GEMINI_MODELS.FLASH,
      contents: prompt,
      responseMimeType: 'application/json',
      customKey,
    });
    const parsed = JSON.parse(res.text);
    return { ...parsed, modelUsed: res.modelUsed };
  } catch (err) {
    return {
      executiveSummary: 'A transição para o IBS e CBS unifica as contribuições federais e municipais com creditamento amplo.',
      creditOpportunities: [
        'Aproveitamento integral de créditos sobre serviços de tecnologia e computação em nuvem.',
      ],
      splitPaymentImpact: 'O split payment debitará o IBS e CBS na liquidação financeira, reduzindo o descasamento temporal.',
      complianceAlerts: [
        'Homologar cadastros de fornecedores com CNPJs ativos e códigos CNAE corretos.',
      ],
      strategicActionList: [
        'Revisar cláusulas contratuais de repasse tributário nos contratos de longo prazo.',
      ],
      modelUsed: 'heuristic-engine-fallback',
    };
  }
}

/**
 * GERAÇÃO DE CONSULTORIA ESG & SUSTENTABILIDADE COM IA (Módulo 13)
 */
export async function generateEsgAiRecommendations(
  summary: EsgCorporateSustainabilitySummary,
  customKey?: string
): Promise<{
  carbonReductionPlan: string[];
  taxBenefitOpportunities: string[];
  supplierEngagementTips: string[];
  carbonOffsetBudgetEstimate: number;
  modelUsed: string;
}> {
  const prompt = `Você é o Diretor de Sustentabilidade Corporativa (Head of ESG & Carbon Accounting).
Analise o inventário de emissões de GEE associado às faturas corporativas da empresa:

MÉTRICAS DE CARBONO:
- Emissões Totais Calculadas: ${summary.totalTonCo2e.toFixed(2)} toneladas CO2e
- Escopo 1 (Direto): ${summary.scope1TonCo2e.toFixed(2)} toneladas CO2e
- Escopo 2 (Energia): ${summary.scope2TonCo2e.toFixed(2)} toneladas CO2e
- Escopo 3 (Cadeia de Suprimentos / Fornecedores): ${summary.scope3TonCo2e.toFixed(2)} toneladas CO2e
- Créditos de Carbono Recomendados: ${summary.recommendedCarbonCreditsCount} créditos
- Orçamento Estimado de Compensação: R$ ${summary.totalOffsetBudgetBrl.toFixed(2)}

Responda EXCLUSIVAMENTE em formato JSON com o seguinte formato:
{
  "carbonReductionPlan": ["medidas práticas para redução de emissões nos escopos 2 e 3"],
  "taxBenefitOpportunities": ["possíveis incentivos fiscais e créditos verdes vinculados a práticas sustentáveis"],
  "supplierEngagementTips": ["critérios ESG para inclusão de fornecedores homologados no procurement"],
  "carbonOffsetBudgetEstimate": valor numérico estimado em reais para neutralização em projetos certificados
}`;

  try {
    const res = await generateContentWithFallback({
      preferredModel: GEMINI_MODELS.FLASH,
      contents: prompt,
      responseMimeType: 'application/json',
      customKey,
    });
    const parsed = JSON.parse(res.text);
    return { ...parsed, modelUsed: res.modelUsed };
  } catch (err) {
    return {
      carbonReductionPlan: [
        'Priorizar fornecedores de data center com compromisso de 100% energia renovável.',
        'Digitalização integral de fluxos de aprovação eliminando impressões físicas.',
      ],
      taxBenefitOpportunities: [
        'Acesso a linhas de financiamento verde (Green Bonds) com taxas bonificadas pelo BACEN.',
      ],
      supplierEngagementTips: [
        'Exigir declaração de emissões e certidões ambientais na homologação de compras.',
      ],
      carbonOffsetBudgetEstimate: summary.totalOffsetBudgetBrl || (summary.recommendedCarbonCreditsCount * 120.0),
      modelUsed: 'heuristic-engine-fallback',
    };
  }
}

/**
 * COPILOTO CONVERSACIONAL DE AUDITORIA & GESTÃO CONTÁBIL DOCAUDIT AI
 */
export async function chatWithDocAuditCopilot(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemContext: {
    documentsCount: number;
    pendingReviews: number;
    totalAuditedAmount: number;
    currentModule: string;
  },
  customKey?: string
): Promise<{ reply: string; modelUsed: string }> {
  const systemInstruction = `Você é o "DocAudit Copilot", o assistente e consultor de Inteligência Artificial de elite da plataforma DocAudit AI.
Sua missão é auxiliar CFOs, Controllers, Auditores Fiscais e Gerentes Financeiros a extrair o máximo valor da plataforma com total clareza, didática impecável e precisão técnica.

CONHECIMENTO ESPECIALIZADO:
- Contabilidade societária brasileira (IFRS / CPCs, com foco em CPC 47 / IFRS 15 e partidas dobradas).
- Reforma Tributária (Emenda Constitucional 132/2023, CBS, IBS, Split Payment, transição fiscal).
- Auditoria Forense, Lei de Benford, Segregação de Funções (SoD) e conformidade SOX.
- Gestão de Tesouraria, Liquidez D+90, Desconto Dinâmico e Boletos DDA.
- Normas SPED (EFD Contribuições, EFD ICMS/IPI, ECD e ECF).
- Conectores ERPs (SAP S/4HANA, TOTVS Protheus, ContaAzul, Omie) e Certidões Negativas de Débito (CNDs).

ESTADO ATUAL DO SISTEMA:
- Faturas Processadas: ${systemContext.documentsCount}
- Faturas Aguardando Parecer Humano: ${systemContext.pendingReviews}
- Montante Total Auditado: R$ ${systemContext.totalAuditedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Módulo Atual no Navegador: ${systemContext.currentModule}

DIRETRIZES DE COMUNICAÇÃO:
1. Responda em Português do Brasil com linguagem profissional, cortês, didática e clara.
2. Seja objetivo e resolutivo. Quando o usuário fizer perguntas complexas, utilize tópicos organizados e exemplos práticos.
3. Não invente números fora do contexto fornecido. Se sugerir ações, oriente qual módulo da DocAudit AI ele deve acessar.`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const res = await generateContentWithFallback({
      preferredModel: GEMINI_MODELS.FLASH,
      contents,
      systemInstruction,
      customKey,
    });
    return { reply: res.text, modelUsed: res.modelUsed };
  } catch (err: any) {
    return {
      reply: `Olá! Sou o Copilot do DocAudit AI. No momento a conexão com a API do Gemini apresentou a seguinte observação: "${err?.message || 'Chave de API não informada'}". Você pode configurar sua chave GEMINI_API_KEY no painel de configurações para ativar todas as minhas capacidades conversacionais em tempo real!`,
      modelUsed: 'offline-copilot-fallback',
    };
  }
}
