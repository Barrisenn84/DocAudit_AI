import {
  ClosingChecklistResult,
  ClosingChecklistTask,
  CfoClosingReportResult,
  ProcessedDocument,
  JournalEntryProposal,
  ReconciliationBatchResult,
  ExceptionTriageResult,
  RevenueRecognitionResult,
} from '../src/types/finance.js';
import {
  ACCOUNTING_POLICIES,
  ACCOUNTING_PERIODS,
  CHART_OF_ACCOUNTS,
  CORPORATE_ENTITIES,
} from './accountingEngine.js';

export interface SystemAuditState {
  documents: ProcessedDocument[];
  proposals: JournalEntryProposal[];
  reconciliationBatches: ReconciliationBatchResult[];
  exceptions: ExceptionTriageResult[];
  revenueAnalyses: RevenueRecognitionResult[];
  freezeDate: string; // ex: 2026-10-05T00:00:00Z
  period: string;
  entity: string;
}

/**
 * Validação algorítmica estrita das 7 condições de bloqueio do fechamento
 */
export function evaluateClosingBlockers(state: SystemAuditState): {
  isBlocked: boolean;
  blockers: string[];
  metrics: {
    unreconciled_items_count: number;
    unsupported_material_items_count: number;
    critical_exceptions_open_count: number;
    unbalanced_proposals_count: number;
    unversioned_policies_count: number;
    post_freeze_unapproved_count: number;
    inconsistent_periods_count: number;
  };
} {
  const blockers: string[] = [];

  // 1. Banco sem reconciliação
  // Verifica o último lote de reconciliação ou itens pendentes
  let unreconciledCount = 0;
  if (state.reconciliationBatches.length > 0) {
    const latestBatch = state.reconciliationBatches[0];
    unreconciledCount = latestBatch.pairs.filter(
      (p) => p.match_status === 'no_match' || p.match_status === 'insufficient_data' || !p.is_reconciled
    ).length;
  } else {
    unreconciledCount = 3; // Nenhuma reconciliação rodada
  }

  if (unreconciledCount > 0) {
    blockers.push(`Banco sem reconciliação: Existem ${unreconciledCount} itens bancários pendentes de conciliação.`);
  }

  // 2. Saldo material sem suporte (>= 50.000 sem source_ids ou sem evidência)
  let unsupportedMaterialCount = 0;
  state.proposals.forEach((prop) => {
    prop.proposed_lines.forEach((l) => {
      const amount = Math.max(l.debito_candidato, l.credito_candidato);
      if (amount >= 50000 && (!l.source_ids || l.source_ids.length === 0)) {
        unsupportedMaterialCount++;
      }
    });
  });

  if (unsupportedMaterialCount > 0) {
    blockers.push(`Saldo material sem suporte: ${unsupportedMaterialCount} linhas com valor material (>= R$ 50k) sem documento comprobatório.`);
  }

  // 3. Exceção crítica aberta
  const openCriticalExceptions = state.exceptions.filter(
    (e) => (e.prioridade === 'critica' || e.is_material_or_critical) && e.status !== 'RESOLVED_BY_HUMAN'
  );
  const criticalExceptionsCount = openCriticalExceptions.length;

  if (criticalExceptionsCount > 0) {
    blockers.push(`Exceção crítica aberta: Existem ${criticalExceptionsCount} exceções críticas pendentes de homologação formal.`);
  }

  // 4. Lançamento desequilibrado
  const unbalancedProposals = state.proposals.filter(
    (p) => p.validation && (!p.validation.isBalanced || p.validation.isAutoRejected)
  );
  const unbalancedCount = unbalancedProposals.length;

  if (unbalancedCount > 0) {
    blockers.push(`Lançamento desequilibrado: ${unbalancedCount} propostas de lançamento contábil rejeitadas ou com débito != crédito.`);
  }

  // 5. Política sem versão
  const unversionedPolicies = ACCOUNTING_POLICIES.filter(
    (p) => !p.version || p.version.trim() === ''
  );
  const unversionedCount = unversionedPolicies.length;

  if (unversionedCount > 0) {
    blockers.push(`Política sem versão: ${unversionedCount} políticas contábeis sem controle formal de versionamento.`);
  }

  // 6. Alteração posterior ao freeze sem aprovação
  const freezeTimestamp = new Date(state.freezeDate).getTime();
  let postFreezeUnapprovedCount = 0;

  state.proposals.forEach((p) => {
    const propTime = new Date(p.created_at).getTime();
    if (propTime > freezeTimestamp && (!p.human_decision || p.human_decision.status !== 'APPROVED_FOR_POSTING')) {
      postFreezeUnapprovedCount++;
    }
  });

  if (postFreezeUnapprovedCount > 0) {
    blockers.push(`Alteração posterior ao freeze sem aprovação: ${postFreezeUnapprovedCount} lançamentos criados após a data de congelamento sem parecer da controladoria.`);
  }

  // 7. Período ou entidade inconsistente
  const closedPeriod = ACCOUNTING_PERIODS.find((p) => p.status === 'closed');
  let inconsistentCount = 0;

  state.proposals.forEach((p) => {
    p.proposed_lines.forEach((l) => {
      if (closedPeriod && l.periodo === closedPeriod.period_id) {
        inconsistentCount++;
      }
      const validEntity = CORPORATE_ENTITIES.some((e) => e.name === l.entidade);
      if (!validEntity) {
        inconsistentCount++;
      }
    });
  });

  if (inconsistentCount > 0) {
    blockers.push(`Período ou entidade inconsistente: ${inconsistentCount} partidas vinculadas a períodos fechados ou entidades desconhecidas.`);
  }

  return {
    isBlocked: blockers.length > 0,
    blockers,
    metrics: {
      unreconciled_items_count: unreconciledCount,
      unsupported_material_items_count: unsupportedMaterialCount,
      critical_exceptions_open_count: criticalExceptionsCount,
      unbalanced_proposals_count: unbalancedCount,
      unversioned_policies_count: unversionedCount,
      post_freeze_unapproved_count: postFreezeUnapprovedCount,
      inconsistent_periods_count: inconsistentCount,
    },
  };
}

/**
 * Constrói o contexto textual do banco de dados em tempo real para o Gemini
 */
export function buildDatabaseStatePrompt(state: SystemAuditState, blockersResult: ReturnType<typeof evaluateClosingBlockers>): string {
  return `ESTADO REAL DO BANCO DE DADOS DA PLATAFORMA DOCAUDIT:
============================================================
Período de Fechamento: ${state.period}
Entidade Principal: ${state.entity}
Data de Freeze Contábil: ${state.freezeDate}

1. MÓDULO DE EXTRAÇÃO FISCAL:
- Total de documentos ingeridos: ${state.documents.length}
- Documentos com pendência de revisão: ${state.documents.filter((d) => d.validation.step6_reviewRouting.overallStatus === 'PENDING_REVIEW' && !d.humanReview).length}
- Documentos com parecer humano aprovado: ${state.documents.filter((d) => d.humanReview?.status === 'APPROVED').length}
- Documentos com conflito de cálculo (ISS/Total): ${state.documents.filter((d) => !d.validation.step2_subtotalTaxTotalComparison.isConsistent).length}

2. MÓDULO DE LANÇAMENTOS CONTÁBEIS:
- Total de propostas geradas: ${state.proposals.length}
- Propostas aprovadas por auditor: ${state.proposals.filter((p) => p.human_decision?.status === 'APPROVED_FOR_POSTING').length}
- Propostas rejeitadas automaticamente pelo backend: ${state.proposals.filter((p) => p.validation?.isAutoRejected).length}
- Propostas com pendência de revisão: ${state.proposals.filter((p) => p.ai_needs_review || p.validation?.needsReview).length}

3. MÓDULO DE RECONCILIAÇÃO BANCÁRIA:
- Lotes executados: ${state.reconciliationBatches.length}
${state.reconciliationBatches.length > 0 ? `
- Último lote: Total ${state.reconciliationBatches[0].total_pairs} pares | Exatos: ${state.reconciliationBatches[0].exact_matches} | Parciais: ${state.reconciliationBatches[0].partial_matches} | Não reconciliados: ${state.reconciliationBatches[0].unmatched_items}` : '- Nenhum lote rodado no período.'}

4. MÓDULO DE TRIAGEM DE EXCEÇÕES:
- Total de exceções catalogadas: ${state.exceptions.length}
- Exceções críticas ou materiais abertas: ${state.exceptions.filter((e) => (e.prioridade === 'critica' || e.is_material_or_critical) && e.status !== 'RESOLVED_BY_HUMAN').length}
- Exceções resolvidas formalmente por humanos: ${state.exceptions.filter((e) => e.status === 'RESOLVED_BY_HUMAN').length}
- Detalhes de exceções abertas:
${state.exceptions.filter((e) => e.status !== 'RESOLVED_BY_HUMAN').map((e) => `  * [${e.exception_id}] ${e.title} (Prioridade: ${e.prioridade}, Categoria: ${e.category}, Impacto: ${e.impacto_potencial})`).join('\n')}

5. POLÍTICAS CONTÁBEIS & GOVERNANÇA:
${ACCOUNTING_POLICIES.map((p) => `- ${p.policy_id}: ${p.title} (Versão: ${p.version || 'SEM VERSÃO'}, Vigente: ${p.isActive ? 'Sim' : 'Não'})`).join('\n')}

DIAGNÓSTICO AUTOMÁTICO DE BLOQUEIOS DO BACKEND:
- Fechamento bloqueado? ${blockersResult.isBlocked ? 'SIM - BLOQUEIO RIGOROSO ATIVADO' : 'NÃO - DESBLOQUEADO'}
${blockersResult.blockers.map((b) => `  [!] ${b}`).join('\n')}
`;
}
