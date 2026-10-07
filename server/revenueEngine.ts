import {
  RevenueRecognitionFactSheet,
  RevenueRecognitionResult,
  RevenuePolicyTreatment,
} from '../src/types/finance.js';

export interface SampleRevenueContract {
  id: string;
  title: string;
  isComplex: boolean;
  recommendedModel: 'gemini-3.8-flash' | 'gemini-3.1-pro-preview';
  summary: string;
  contractText: string;
}

export const SAMPLE_REVENUE_CONTRACTS: SampleRevenueContract[] = [
  {
    id: 'CONTRACT-SaaS-ENT-2026',
    title: 'Contrato Master SaaS Enterprise com Preço Variável e SLA',
    isComplex: true,
    recommendedModel: 'gemini-3.8-flash',
    summary: 'Contrato de R$ 120.000 com preço fixo (R$ 80k) + variável por consumo (R$ 40k), 2 PPOs distintas e SLA de 99.9%.',
    contractText: `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE SOFTWARE COMO SERVIÇO (SaaS)
CONTRATO Nº: SaaS-ENT-2026-88

DAS PARTES:
CONTRATADA: TechCloud Brasil Soluções em Nuvem S.A., CNPJ: 10.999.888/0001-20
CONTRATANTE: Banco Investimento e Gestão Digital S.A., CNPJ: 22.333.444/0001-55
(Nota de Governança: As partes não são partes relacionadas / related parties).

CLÁUSULA 1 - DO OBJETO E OBRIGAÇÕES DE PERFORMANCE (PPOs):
1.1. O presente contrato compreende 2 obrigações de entrega distintas e contratualmente separáveis:
    a) Obrigação 1 (Licença e Acesso à Plataforma de Análise em Nuvem): Disponibilização contínua de acesso à plataforma durante o prazo de vigência contratual.
    b) Obrigação 2 (Serviços Profissionais de Integração e Setup Técnico): Customização de APIs e migração de bases de dados locais para a nuvem, a ser concluída em até 60 dias da data de assinatura.

CLÁUSULA 2 - DO PREÇO E CONTRAPRESTAÇÃO VARIÁVEL:
2.1. O valor total estimado do contrato é de R$ 120.000,00 (cento e vinte mil reais), composto por:
    a) Preço Fixo Incondicional: R$ 80.000,00, faturado em 12 parcelas mensais iguais de R$ 6.666,66.
    b) Preço Variável por Consumo: Até R$ 40.000,00, calculado com base no volume mensal de transações processadas que excederem a franquia de 1.000.000 de requisições, apurado no último dia útil de cada mês.
2.2. Descontos e Créditos: A CONTRATADA concedeu um crédito promocional de implementação no valor de R$ 5.000,00 a ser abatido na primeira fatura do serviço.

CLÁUSULA 3 - DA VIGÊNCIA E PRAZOS:
3.1. O contrato terá vigência de 12 (doze) meses, iniciando-se a prestação do serviço em 2026-10-01 e encerrando-se em 2027-09-30.
3.2. Data de Assinatura: 2026-09-25.
3.3. Renovação: Renovação automática por períodos sucessivos de 12 meses, salvo manifestação em contrário com antecedência de 30 dias.

CLÁUSULA 4 - DO NÍVEL DE SERVIÇO (SLA) E PENALIDADES:
4.1. A CONTRATADA garante disponibilidade mensal da plataforma de no mínimo 99,9% (SLA).
4.2. Caso o SLA não seja atingido, a CONTRATANTE terá direito a crédito compensatório de 5% sobre a mensalidade por cada 0,1% de indisponibilidade não programada.

CLÁUSULA 5 - DO CANCELAMENTO E REEMBOLSO:
5.1. Qualquer das partes poderá rescindir imotivadamente o presente contrato mediante aviso prévio por escrito de 60 (sessenta) dias.
5.2. Não haverá reembolso dos valores já faturados e executados até a data da rescisão efetiva.

CLÁUSULA 6 - DAS CONDIÇÕES DE ACEITAÇÃO E MODIFICAÇÕES:
6.1. Os serviços de integração serão considerados aceitos mediante assinatura do Termo de Aceite Definitivo (TAD) pelo Diretor de Tecnologia da CONTRATANTE.
6.2. Nenhuma alteração contratual será válida sem termo aditivo firmado por ambos os representantes legais.`,
  },
  {
    id: 'CONTRACT-SIMPLE-LICENSE',
    title: 'Contrato Simples de Assinatura de Software (Padrão)',
    isComplex: false,
    recommendedModel: 'gemini-3.8-flash',
    summary: 'Contrato linear de R$ 18.000 / ano, preço 100% fixo, 1 única PPO (licença contínua), sem preço variável nem SLA complexo.',
    contractText: `TERMO DE ADESÃO DE LICENÇA DE SOFTWARE ANUAL
CONTRATO Nº: LIC-SIMPLES-2026-14

PARTES:
CONTRATADA: SoftCorp Tecnologia Ltda, CNPJ: 05.111.222/0001-33
CONTRATANTE: Empresa Soluções Digitais S.A., CNPJ: 14.552.190/0001-88

OBJETO:
Concessão de licença de uso do software Gerenciador Fiscal Pro para 10 usuários simultâneos.
Única Obrigação de Performance: Disponibilização contínua do software over-time durante 12 meses.

VALOR E CONDIÇÕES DE PAGAMENTO:
Preço Fixo Total: R$ 18.000,00 (dezoito mil reais), em 12 parcelas de R$ 1.500,00.
Preço Variável: Não aplicável (zero).
Moeda: BRL.
Descontos ou Créditos: Nenhum desconto concedido.

VIGÊNCIA E CANCELAMENTO:
Início: 2026-10-01. Término: 2027-09-30.
Cancelamento: Rescisão sem justa causa mediante aviso prévio de 30 dias. Sem cláusula atípica.`,
  },
  {
    id: 'CONTRACT-RELATED-AMENDMENT',
    title: 'Aditivo Contratual com Parte Relacionada & Concessão de Direitos Futuros',
    isComplex: true,
    recommendedModel: 'gemini-3.8-flash',
    summary: 'Aditivo contratual de R$ 250.000 envolvendo empresas do mesmo grupo econômico (Related Party), alteração de escopo e direitos futuros.',
    contractText: `SEGUNDO TERMO ADITIVO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS CORPORATIVOS
ADITIVO Nº: ADIT-REL-2026-02

PARTES:
CONTRATADA: Soluções Digitais Participações S.A., CNPJ: 14.552.190/0003-40
CONTRATANTE: Empresa Soluções Digitais S.A., CNPJ: 14.552.190/0001-88
(AVISO CRÍTICO DE GOVERNANÇA: Empresas sob controle societário comum - PARTES RELACIONADAS / RELATED PARTIES).

CLÁUSULA 1 - DA ALTERAÇÃO CONTRATUAL E MODIFICAÇÃO DE ESCOPO:
1.1. O presente termo aditivo modifica substancialmente o escopo do contrato original, acrescendo o desenvolvimento de módulos customizados de inteligência artificial financeira.
1.2. Fica concedido à CONTRATANTE o direito irrevogável de utilizar gratuitamente e sem custos adicionais quaisquer novas ferramentas ou atualizações lançadas pela CONTRATADA nos próximos 36 meses (Concessão de Direitos Futuros Materiais).

CLÁUSULA 2 - DO VALOR ADITIVO E MATERIALIDADE:
2.1. O valor aditado ao contrato é de R$ 250.000,00 (duzentos e cinquenta mil reais), com cláusula de remuneração de sucesso variável de 10% sobre a economia tributária apurada (Preço Variável Relevante sem teto formal estipulado).

CLÁUSULA 3 - CANCELAMENTO ATÍPICO:
3.1. A rescisão do presente aditivo poderá ocorrer a qualquer momento sem qualquer aviso prévio ou pagamento de multa por deliberação unilateral do Conselho de Administração da holding.`,
  },
];

export const REVENUE_POLICIES = [
  {
    policy_id: 'POL-REV-01',
    name: 'IFRS 15 / CPC 47 - Reconhecimento de Licenças SaaS ao Longo do Tempo (Over Time)',
    description: 'A receita é reconhecida linearmente durante o período do contrato conforme o cliente usufrui dos benefícios contínuos.',
  },
  {
    policy_id: 'POL-REV-02',
    name: 'IFRS 15 / CPC 47 - Serviços de Implementação / Setup (Point in Time ou Combinado)',
    description: 'Se o serviço de setup for distinto, reconhece quando o controle e aceitação (TAD) forem entregues.',
  },
  {
    policy_id: 'POL-REV-03',
    name: 'IFRS 15 / CPC 47 - Estimativa de Contraprestação Variável com Restrição (Constraint)',
    description: 'Receita variável por consumo só é reconhecida se for altamente provável que não ocorrerá reversão significativa.',
  },
  {
    policy_id: 'POL-REV-04',
    name: 'CPC 05 / IAS 24 - Transações com Partes Relacionadas (Related Parties)',
    description: 'Exige divulgação segregada e auditoria substantiva de condições comutativas de mercado (arm\'s length).',
  },
];
