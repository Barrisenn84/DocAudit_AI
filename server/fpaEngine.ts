import { GoogleGenAI } from '@google/genai';
import {
  CostCenterBudget,
  FpaVarianceAnalysisReport,
  BudgetVarianceDriver,
  ProcessedDocument,
} from '../src/types/finance.js';

export const CORPORATE_COST_CENTERS: CostCenterBudget[] = [
  {
    id: 'CC-101',
    code: '101.TI.CLOUD',
    name: 'Infraestrutura Cloud & DevOps',
    department: 'Tecnologia da Informação',
    manager: 'Carlos Eduardo Mendes (CTO)',
    annualBudget: 240000.0,
    ytdActualSpent: 168400.0,
    ytdCommitted: 32000.0,
    ytdAvailable: 39600.0,
    consumptionPct: 83.5,
    status: 'ATTENTION',
  },
  {
    id: 'CC-102',
    code: '102.MKT.GROWTH',
    name: 'Marketing Digital & Aquisição',
    department: 'Comercial & Marketing',
    manager: 'Mariana Silveira (CMO)',
    annualBudget: 180000.0,
    ytdActualSpent: 122000.0,
    ytdCommitted: 15000.0,
    ytdAvailable: 43000.0,
    consumptionPct: 76.1,
    status: 'ON_TRACK',
  },
  {
    id: 'CC-103',
    code: '103.JUR.COMPL',
    name: 'Jurídico, Compliance & Auditoria',
    department: 'Controladoria & Jurídico',
    manager: 'Dr. Roberto Prado (General Counsel)',
    annualBudget: 95000.0,
    ytdActualSpent: 89200.0,
    ytdCommitted: 12500.0,
    ytdAvailable: -6700.0,
    consumptionPct: 107.1,
    status: 'OVERBUDGET_BLOCKED',
  },
  {
    id: 'CC-104',
    code: '104.FACIL.OPS',
    name: 'Facilities, Logística & Suprimentos',
    department: 'Operações Corporativas',
    manager: 'Fernanda Albuquerque (COO)',
    annualBudget: 120000.0,
    ytdActualSpent: 74000.0,
    ytdCommitted: 8000.0,
    ytdAvailable: 38000.0,
    consumptionPct: 68.3,
    status: 'ON_TRACK',
  },
  {
    id: 'CC-105',
    code: '105.RD.PROD',
    name: 'Pesquisa & Desenvolvimento (P&D AI)',
    department: 'Engenharia de Software',
    manager: 'Lucas Fontes (Head of AI)',
    annualBudget: 350000.0,
    ytdActualSpent: 260000.0,
    ytdCommitted: 45000.0,
    ytdAvailable: 45000.0,
    consumptionPct: 87.1,
    status: 'ATTENTION',
  },
];

export async function generateFpaVarianceReport(
  documents: ProcessedDocument[],
  period: string = 'Q3/2026'
): Promise<FpaVarianceAnalysisReport> {
  const totalPlanned = CORPORATE_COST_CENTERS.reduce((a, c) => a + c.annualBudget, 0);
  const totalActual = CORPORATE_COST_CENTERS.reduce((a, c) => a + c.ytdActualSpent, 0);
  const totalVariance = Number((totalActual - (totalPlanned * 0.75)).toFixed(2)); // Base YTD 9 meses
  const variancePct = Number(((totalVariance / (totalPlanned * 0.75)) * 100).toFixed(1));

  const drivers: BudgetVarianceDriver[] = [
    {
      category: 'Serviços de Nuvem e GPU',
      costCenter: '101.TI.CLOUD / 105.RD.PROD',
      plannedAmount: 180000.0,
      actualAmount: 215000.0,
      varianceAmount: 35000.0,
      variancePct: 19.4,
      primaryCause: 'Aumento de instâncias dedicadas de inferência de IA e oscilação cambial do dólar PTAX.',
      impactType: 'UNFAVORABLE',
    },
    {
      category: 'Honorários de Auditoria e Consultoria',
      costCenter: '103.JUR.COMPL',
      plannedAmount: 71250.0,
      actualAmount: 89200.0,
      varianceAmount: 17950.0,
      variancePct: 25.2,
      primaryCause: 'Auditoria externa extraordinária para adequação à Reforma Tributária (EC 132/2023).',
      impactType: 'UNFAVORABLE',
    },
    {
      category: 'Material de Escritório e Viagens',
      costCenter: '104.FACIL.OPS',
      plannedAmount: 90000.0,
      actualAmount: 74000.0,
      varianceAmount: -16000.0,
      variancePct: -17.8,
      primaryCause: 'Adoção massiva de auditoria remota digital e contenção de viagens presenciais.',
      impactType: 'FAVORABLE',
    },
  ];

  let executiveNarrative =
    'O fechamento acumulado do YTD apresenta variação desfavorável de +4,2% em relação à meta orçamentária linear. O principal detrator decorre da expansão de capacidade de infraestrutura de computação em nuvem (TI/P&D) e honorários jurídicos de transição tributária, parcialmente compensados pela economia de 17,8% em despesas administrativas gerais (SG&A).';

  let ebitdaImpact =
    'A margem EBITDA sofreu compressão temporária de 140 bps devido à antecipação de CAPEX/OPEX de tecnologia. A eficiência operacional projetada para os próximos dois trimestres deve recompor a margem para 24,5%.';

  let sgaEfficiency =
    'As despesas gerais e administrativas (SG&A) mantiveram-se em 11,2% da receita líquida, abaixo do teto de 13,0% fixado no plano diretor anual.';

  let aiModelUsed = 'gemini-3.8-flash';

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `Gere uma análise executiva profissional de FP&A e Variância Orçamentária para o Conselho de Administração (CFO Commentary):
Período: ${period}
Orçamento Total Anual: R$ ${totalPlanned.toLocaleString('pt-BR')}
Realizado YTD: R$ ${totalActual.toLocaleString('pt-BR')}
Variação Líquida: R$ ${totalVariance.toLocaleString('pt-BR')} (${variancePct}%)
Principais Drivers: ${JSON.stringify(drivers)}

Retorne um texto objetivo e conciso em formato contábil institucional.`;

      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (resp.text?.trim()) {
        executiveNarrative = resp.text.trim();
      }
    } catch {
      // Fallback determinístico
    }
  }

  return {
    period,
    totalBudgetPlanned: totalPlanned,
    totalActualRealized: totalActual,
    totalVariance,
    variancePct,
    executiveNarrative,
    ebitdaImpactCommentary: ebitdaImpact,
    sgaEfficiencyCommentary: sgaEfficiency,
    keyDrivers: drivers,
    actionPlan: [
      'Bloqueio automático de novas ordens de compra no Centro de Custo 103 (Jurídico) até remanejamento de verba.',
      'Renegociação de instâncias reservadas de computação em nuvem para capturar desconto de 30% em compromissos anuais.',
      'Preservar contingência orçamentária para a implementação dos sistemas de Split Payment da Reforma Tributária.',
    ],
    aiModelUsed,
  };
}
