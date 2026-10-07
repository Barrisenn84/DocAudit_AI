import {
  AccountingPeriod,
  AccountingPolicy,
  ChartOfAccountItem,
  CorporateEntity,
  JournalEntryLineCandidate,
  JournalEntryProposal,
  JournalProposalValidation,
  TransactionClassificationResult,
} from '../src/types/finance.js';

// ========================================================
// PLANO DE CONTAS CORPORATIVO (CHART OF ACCOUNTS)
// ========================================================
export const CHART_OF_ACCOUNTS: ChartOfAccountItem[] = [
  {
    code: '1.1.01.001',
    name: 'Banco Conta Movimento - Bradesco',
    type: 'ASSET',
    isActive: true,
    description: 'Disponibilidades bancárias para liquidação de pagamentos operacionais.',
    permittedDimensions: ['Tesouraria', 'Geral'],
  },
  {
    code: '1.1.02.001',
    name: 'Adiantamento a Fornecedores',
    type: 'ASSET',
    isActive: true,
    description: 'Valores pagos antecipadamente antes da entrega de produtos ou serviços.',
    permittedDimensions: ['Suprimentos', 'Compras'],
  },
  {
    code: '1.2.03.001',
    name: 'Servidores & Equipamentos de TI (Imobilizado)',
    type: 'ASSET',
    isActive: true,
    description: 'Bens de capital corpóreos de tecnologia com vida útil superior a 12 meses e valor relevante.',
    permittedDimensions: ['TI', 'Infraestrutura'],
    applicablePolicyIds: ['POL-CAPEX-05'],
  },
  {
    code: '2.1.01.001',
    name: 'Fornecedores Nacionais a Pagar',
    type: 'LIABILITY',
    isActive: true,
    description: 'Obrigações a pagar a fornecedores de bens e serviços no país.',
    permittedDimensions: ['Contas a Pagar', 'Financeiro'],
  },
  {
    code: '2.1.01.002',
    name: 'Fornecedores Estrangeiros a Pagar',
    type: 'LIABILITY',
    isActive: true,
    description: 'Obrigações em moeda estrangeira ou importação de serviços.',
    permittedDimensions: ['Contas a Pagar', 'Comércio Exterior'],
  },
  {
    code: '2.1.03.001',
    name: 'ISS a Recolher (Retenção na Fonte)',
    type: 'LIABILITY',
    isActive: true,
    description: 'Imposto municipal sobre serviços retido na fonte do prestador.',
    permittedDimensions: ['Fiscal', 'Tributário'],
  },
  {
    code: '3.1.01.001',
    name: 'Despesas com Computação em Nuvem & Hospedagem (AWS/GCP)',
    type: 'EXPENSE',
    isActive: true,
    description: 'Custos operacionais mensais com processamento em nuvem, bancos de dados elásticos e armazenamento.',
    permittedDimensions: ['TI', 'Engenharia de Software', 'Infraestrutura'],
    applicablePolicyIds: ['POL-IT-01'],
  },
  {
    code: '3.1.01.002',
    name: 'Despesas com Software & Assinaturas SaaS',
    type: 'EXPENSE',
    isActive: true,
    description: 'Licenciamento mensal ou anual de software por usuário ou consumo.',
    permittedDimensions: ['TI', 'Geral'],
    applicablePolicyIds: ['POL-IT-01'],
  },
  {
    code: '3.1.01.003',
    name: 'Serviços de Consultoria Técnica Especializada',
    type: 'EXPENSE',
    isActive: true,
    description: 'Honorários de consultorias externas jurídicas, contábeis e de arquitetura técnica.',
    permittedDimensions: ['Consultoria', 'Projetos'],
  },
  {
    code: '3.1.02.001',
    name: 'Despesas com Material de Escritório & Suprimentos',
    type: 'EXPENSE',
    isActive: true,
    description: 'Papelaria, consumíveis, materiais de impressão e suprimentos administrativos.',
    permittedDimensions: ['Administrativo', 'Facilities'],
    applicablePolicyIds: ['POL-FAC-02'],
  },
  {
    code: '3.1.02.002',
    name: 'Despesas com Fretes, Logística & Transportes',
    type: 'EXPENSE',
    isActive: true,
    description: 'Fretes sobre compras, remessas logísticas e transporte de cargas.',
    permittedDimensions: ['Logística', 'Operações'],
    applicablePolicyIds: ['POL-LOG-03'],
  },
  {
    code: '3.1.02.003',
    name: 'Despesas com Manutenção Predial & Reformas',
    type: 'EXPENSE',
    isActive: true,
    description: 'Serviços de conservação de instalações físicas, pintura, alvenaria e reparos elétricos.',
    permittedDimensions: ['Facilities', 'Administrativo'],
    applicablePolicyIds: ['POL-MAINT-04'],
  },
  {
    code: '3.1.99.999',
    name: 'Despesas Diversas Não Alocadas (CONTA INATIVA)',
    type: 'EXPENSE',
    isActive: false, // INATIVA PARA TESTAR REJEIÇÃO AUTOMÁTICA
    description: 'Conta suspensa pela controladoria. Proibido lançamento de novas partidas.',
    permittedDimensions: ['N/A'],
  },
];

// ========================================================
// POLÍTICAS CONTÁBEIS VIGENTES (ACCOUNTING POLICIES)
// ========================================================
export const ACCOUNTING_POLICIES: AccountingPolicy[] = [
  {
    policy_id: 'POL-IT-01',
    title: 'Política de Serviços em Nuvem & SaaS',
    version: 'v2.4',
    effectiveFrom: '2025-01-01',
    isActive: true,
    summary: 'Apropriação como despesa operacional mensal (OPEX) no período de competência da prestação.',
    rules: [
      'Faturas de consumo de infraestrutura devem ser reconhecidas na competência do mês faturado.',
      'Contratos anuais pagos antecipadamente devem ser diferidos em despesas antecipadas.',
      'Impostos retidos (IRRF/PIS/COFINS/ISS) devem ser discriminados na contrapartida.',
    ],
  },
  {
    policy_id: 'POL-FAC-02',
    title: 'Política de Materiais de Consumo & Pequenos Suprimentos',
    version: 'v1.8',
    effectiveFrom: '2025-01-01',
    isActive: true,
    summary: 'Classificação direta em resultado para itens de consumo imediato de valor não capitalizável.',
    rules: [
      'Itens unitários inferiores a R$ 1.500 devem ser alocados como despesa no ato do recebimento.',
      'Bens duráveis de escritório superiores a R$ 1.500 devem ser avaliados para imobilização.',
    ],
  },
  {
    policy_id: 'POL-LOG-03',
    title: 'Política de Fretes e Transportes de Cargas',
    version: 'v1.2',
    effectiveFrom: '2025-01-01',
    isActive: true,
    summary: 'Fretes sobre insumos de consumo vs fretes sobre imobilizado.',
    rules: [
      'Frete sobre compra de bens para uso e consumo é registrado diretamente em despesa de transporte.',
      'CT-e ou nota fiscal de transporte deve estar anexada como evidência mandatória.',
    ],
  },
  {
    policy_id: 'POL-MAINT-04',
    title: 'Política de Conservação & Manutenção Predial',
    version: 'v1.5',
    effectiveFrom: '2025-01-01',
    isActive: true,
    summary: 'Diferenciação entre reparos operacionais e benfeitorias em imóveis.',
    rules: [
      'Pinturas e reparos rotineiros são alocados como despesa operacional de manutenção.',
      'Reformas estruturais que aumentem a vida útil do imóvel devem ser capitalizadas.',
    ],
  },
  {
    policy_id: 'POL-CAPEX-05',
    title: 'Política de Imobilização de Hardware & TI (CAPEX)',
    version: 'v3.0',
    effectiveFrom: '2025-01-01',
    isActive: true,
    summary: 'Critérios formais para ativação no grupo não circulante (Ativo Imobilizado).',
    rules: [
      'Ativação obrigatória para servidores e computadores individuais com valor unitário >= R$ 5.000.',
      'Vida útil estimada de 5 anos com depreciação linear.',
    ],
  },
  {
    policy_id: 'POL-EXP-OLD',
    title: 'Política de Telecomunicações Legada (EXPIRADA / NÃO VIGENTE)',
    version: 'v0.9-revogada',
    effectiveFrom: '2020-01-01',
    effectiveTo: '2024-12-31',
    isActive: false, // NÃO VIGENTE PARA TESTE DE REJEIÇÃO AUTOMÁTICA
    summary: 'Política revogada pela Instrução Normativa 12/2024.',
    rules: ['Política revogada e não permitida para novos lançamentos.'],
  },
];

// ========================================================
// PERÍODOS CONTÁBEIS (ACCOUNTING PERIODS)
// ========================================================
export const ACCOUNTING_PERIODS: AccountingPeriod[] = [
  {
    period_id: '2026-10',
    name: 'Outubro / 2026',
    status: 'open',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  },
  {
    period_id: '2026-09',
    name: 'Setembro / 2026',
    status: 'open',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  },
  {
    period_id: '2026-08',
    name: 'Agosto / 2026',
    status: 'closed', // FECHADO PARA TESTE DE REJEIÇÃO
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  },
  {
    period_id: '2026-07',
    name: 'Julho / 2026',
    status: 'closed', // FECHADO
    startDate: '2026-07-01',
    endDate: '2026-07-31',
  },
];

// ========================================================
// ENTIDADES CORPORATIVAS PERMITIDAS
// ========================================================
export const CORPORATE_ENTITIES: CorporateEntity[] = [
  {
    id: 'ENT-01',
    name: 'Empresa Soluções Digitais S.A. (Matriz - SP)',
    taxId: '14.552.190/0001-88',
    isAllowed: true,
  },
  {
    id: 'ENT-02',
    name: 'Soluções Digitais Filial RJ Ltda',
    taxId: '14.552.190/0002-69',
    isAllowed: true,
  },
  {
    id: 'ENT-99',
    name: 'Entidade Externa Não Autorizada',
    taxId: '99.999.999/0001-99',
    isAllowed: false, // NÃO PERMITIDA PARA TESTE DE REJEIÇÃO
  },
];

// ========================================================
// BACKEND OFFICIAL CALCULATION & REJECTION ENGINE
// ========================================================
export function validateJournalProposalBackend(
  lines: JournalEntryLineCandidate[],
  existingProposals: JournalEntryProposal[] = [],
  documentSourceId?: string
): JournalProposalValidation {
  const rejectionReasons: string[] = [];
  const reviewTriggers: string[] = [];

  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    const d = typeof line.debito_candidato === 'number' ? line.debito_candidato : 0;
    const c = typeof line.credito_candidato === 'number' ? line.credito_candidato : 0;
    totalDebits += d;
    totalCredits += c;
  }

  totalDebits = Math.round((totalDebits + Number.EPSILON) * 100) / 100;
  totalCredits = Math.round((totalCredits + Number.EPSILON) * 100) / 100;
  const balanceDiff = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;
  const isBalanced = balanceDiff <= 0.01 && (totalDebits > 0 || totalCredits > 0);

  // -------------------------------------------------------------
  // AS 7 CONDIÇÕES DE REJEIÇÃO AUTOMÁTICA OBRIGATÓRIAS
  // -------------------------------------------------------------

  // 1. Débitos e créditos não fecharem
  if (!isBalanced) {
    rejectionReasons.push(
      `DESEQUILÍBRIO CONTÁBIL: Soma de débitos (R$ ${totalDebits.toFixed(2)}) difere dos créditos (R$ ${totalCredits.toFixed(2)}). Diferença: R$ ${balanceDiff.toFixed(2)}.`
    );
  }

  // Validação linha por linha
  for (const line of lines) {
    // 2. Conta estiver inativa ou inexistente
    const acc = CHART_OF_ACCOUNTS.find((a) => a.code === line.conta);
    if (!acc) {
      rejectionReasons.push(`CONTA INEXISTENTE: A conta '${line.conta}' não existe no plano de contas corporativo.`);
    } else if (!acc.isActive) {
      rejectionReasons.push(
        `CONTA INATIVA: A conta '${line.conta} - ${acc.name}' está inativa/bloqueada para novos lançamentos.`
      );
    }

    // 3. O período estiver fechado
    const period = ACCOUNTING_PERIODS.find((p) => p.period_id === line.periodo);
    if (!period) {
      rejectionReasons.push(`PERÍODO NÃO CADASTRADO: O período contábil '${line.periodo}' não é reconhecido.`);
    } else if (period.status === 'closed') {
      rejectionReasons.push(
        `PERÍODO FECHADO: O período contábil '${line.periodo}' (${period.name}) está formalmente fechado para lançamentos.`
      );
    }

    // 4. Faltar evidência (source_ids vazios)
    if (!line.source_ids || line.source_ids.length === 0 || !line.source_ids[0]) {
      rejectionReasons.push(
        `FALTA DE EVIDÊNCIA: A linha ${line.line_number} (${line.conta}) não possui 'source_ids' vinculados a documento válido.`
      );
    }

    // 5. A política não estiver vigente
    if (line.policy_id) {
      const pol = ACCOUNTING_POLICIES.find((p) => p.policy_id === line.policy_id);
      if (!pol) {
        rejectionReasons.push(
          `POLÍTICA INEXISTENTE: A política informada '${line.policy_id}' na linha ${line.line_number} não existe no sistema.`
        );
      } else if (!pol.isActive) {
        rejectionReasons.push(
          `POLÍTICA NÃO VIGENTE: A política '${line.policy_id}' (${pol.title}) está revogada ou expirada.`
        );
      }
    } else {
      rejectionReasons.push(`POLÍTICA AUSENTE: A linha ${line.line_number} não referencia nenhuma política contábil.`);
    }

    // 6. A entidade não corresponder ou for não autorizada
    const ent = CORPORATE_ENTITIES.find((e) => e.name === line.entidade || e.id === line.entidade);
    if (!ent) {
      rejectionReasons.push(
        `ENTIDADE NÃO RECONHECIDA: A entidade '${line.entidade}' na linha ${line.line_number} não pertence ao grupo corporativo.`
      );
    } else if (!ent.isAllowed) {
      rejectionReasons.push(
        `ENTIDADE NÃO PERMITIDA: A entidade '${ent.name}' não possui autorização para lançamentos contábeis.`
      );
    }
  }

  // 7. Houver duplicidade
  if (documentSourceId) {
    const existing = existingProposals.find(
      (p) =>
        p.source_document_id === documentSourceId &&
        p.validation.status !== 'AUTOMATICALLY_REJECTED' &&
        Math.abs(p.validation.totalDebits - totalDebits) < 0.01
    );
    if (existing) {
      rejectionReasons.push(
        `PROPOSTA DUPLICADA: Já existe uma proposta ativa (${existing.proposal_id}) gerada para o documento '${documentSourceId}' com o mesmo valor total.`
      );
    }
  }

  // -------------------------------------------------------------
  // GATILHOS DE REVISÃO HUMANA (NEEDS_REVIEW)
  // -------------------------------------------------------------
  // Materialidade (> R$ 5.000)
  if (totalDebits >= 5000) {
    reviewTriggers.push(`Valor material relevante (R$ ${totalDebits.toFixed(2)} >= R$ 5.000,00).`);
  }

  // Linhas com valores elevados ou múltiplos centros de dimensão
  if (lines.length > 2) {
    reviewTriggers.push(`Lançamento composto com ${lines.length} partidas.`);
  }

  const isAutoRejected = rejectionReasons.length > 0;
  const needsReview = isAutoRejected || reviewTriggers.length > 0;

  let status: 'AUTOMATICALLY_REJECTED' | 'PENDING_HUMAN_REVIEW' | 'PROPOSAL_VALIDATED' = 'PROPOSAL_VALIDATED';
  let details = '';

  if (isAutoRejected) {
    status = 'AUTOMATICALLY_REJECTED';
    details = `REJEIÇÃO AUTOMÁTICA DO SISTEMA: ${rejectionReasons.length} critério(s) mandatório(s) violado(s).`;
  } else if (needsReview) {
    status = 'PENDING_HUMAN_REVIEW';
    details = `PROPOSTA EQUILIBRADA (R$ ${totalDebits.toFixed(2)}) roteada para revisão humana por critério de materialidade/política.`;
  } else {
    status = 'PROPOSAL_VALIDATED';
    details = `PROPOSTA VALIDADA: Débitos e créditos rigorosamente equilibrados (R$ ${totalDebits.toFixed(2)}), contas ativas e período aberto.`;
  }

  return {
    totalDebits,
    totalCredits,
    isBalanced,
    balanceDifference: balanceDiff,
    isAutoRejected,
    rejectionReasons,
    needsReview,
    reviewTriggers,
    status,
    details,
  };
}
