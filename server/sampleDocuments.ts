export interface SampleDocumentItem {
  id: string;
  name: string;
  documentType: 'invoice' | 'receipt' | 'bank_statement';
  description: string;
  expectedScenario: string;
  sampleText: string;
  mockExtraction?: any;
}

export const SAMPLE_DOCUMENTS: SampleDocumentItem[] = [
  {
    id: 'sample-clean-aws',
    name: 'Fatura de Nuvem - AWS Cloud Brasil',
    documentType: 'invoice',
    description: 'Documento fiscal perfeitamente consistente de fornecedor homologado.',
    expectedScenario: 'Aprovação Automática: Cálculos 100% consistentes, fornecedor aprovado, sem duplicidade.',
    sampleText: `=======================================================
DOCUMENTO AUXILIAR DA NOTA FISCAL DE SERVIÇO ELETRÔNICA
=======================================================
EMISSOR:
Razão Social: AWS Serviços de Nuvem Ltda
CNPJ: 23.412.247/0001-10
Endereço: Av. Presidente Juscelino Kubitschek, 2041 - São Paulo - SP

TOMADOR DO SERVIÇO:
Empresa Soluções Digitais S.A.
CNPJ: 14.552.190/0001-88

DADOS DA FATURA:
Número da Fatura: AWS-2026-90412
Tipo de Documento: invoice
Data de Emissão: 2026-09-15
Data de Vencimento: 2026-10-15
Moeda: BRL

DISCRIMINAÇÃO DOS SERVIÇOS:
-------------------------------------------------------
Item 1: Amazon Elastic Compute Cloud (EC2) - Instâncias Linux
Qtd: 1 | Valor Unitário: R$ 3.200,00 | Total: R$ 3.200,00

Item 2: Amazon Simple Storage Service (S3) - Armazenamento Seguro
Qtd: 1 | Valor Unitário: R$ 850,00 | Total: R$ 850,00

Item 3: Amazon Relational Database Service (RDS Multi-AZ)
Qtd: 1 | Valor Unitário: R$ 1.950,00 | Total: R$ 1.950,00
-------------------------------------------------------

TOTAIS E TRIBUTOS:
Subtotal: R$ 6.000,00
Impostos Federais e Municipais (ISS/PIS/COFINS): R$ 600,00
TOTAL A PAGAR: R$ 6.600,00
=======================================================`,
  },
  {
    id: 'sample-math-mismatch',
    name: 'Fatura Kalunga - Erro de Cálculo & Imposto',
    documentType: 'invoice',
    description: 'Fatura contendo divergência entre soma dos itens e subtotal, além de subtotal + imposto ≠ total.',
    expectedScenario: 'Revisão Obrigatória: Discrepância na soma de linhas (Step 1) e na equação tributária (Step 2).',
    sampleText: `=======================================================
KALUNGA COMÉRCIO E INDÚSTRIA GRÁFICA LTDA
CNPJ: 43.283.811/0001-50
DANFE / NOTA FISCAL ELETRÔNICA Nº: NF-88194
=======================================================
Data de Emissão: 2026-09-20
Data de Vencimento: 2026-10-05
Moeda: BRL

ITENS DA NOTA:
Item 1: Papel Sulfite A4 75g Caixa 5000 fls
Qtd: 5 | Preço Unit: R$ 180,00 | Total Item: R$ 900,00

Item 2: Cadeira Presidente Ergonômica Pro
Qtd: 2 | Preço Unit: R$ 650,00 | Total Item: R$ 1.300,00

Item 3: Teclado e Mouse Sem Fio Logitech
Qtd: 4 | Preço Unit: R$ 150,00 | Total Item: R$ 600,00
-------------------------------------------------------
(Nota: Soma real dos itens = 900 + 1300 + 600 = R$ 2.800,00)

RESUMO FINANCEIRO IMPRESSO NO DOCUMENTO:
Subtotal Impresso: R$ 2.650,00
Valor do ICMS/Impostos: R$ 250,00
VALOR TOTAL DA NOTA FISCAL: R$ 3.100,00
=======================================================
OBSERVAÇÃO DO EMISSOR: Desconto promocional aplicado em linha não discriminada.`,
  },
  {
    id: 'sample-blocked-vendor-dates',
    name: 'Fatura Logística - Fornecedor Bloqueado & Vencimento Invertido',
    documentType: 'invoice',
    description: 'Fornecedor cadastrado com bloqueio em compliance e data de vencimento anterior à data de emissão.',
    expectedScenario: 'Alerta Crítico: Bloqueio Cadastral Ativo (Step 5) e Cronologia Invertida (Step 3).',
    sampleText: `=======================================================
GLOBAL SUPPLY LOGISTICS LTDA
CNPJ: 11.222.333/0001-44
FATURA COMERCIAL Nº GSL-7701
=======================================================
Data de Emissão: 2026-09-28
Data de Vencimento: 2026-09-10
Moeda: BRL

SERVIÇO:
Transporte Rodoviário Fracionado de Cargas Especiais
Valor do Frete: R$ 4.500,00
Taxa de Seguro de Carga: R$ 350,00

Subtotal: R$ 4.850,00
Imposto (ICMS Transporte): R$ 582,00
TOTAL: R$ 5.432,00
=======================================================`,
  },
  {
    id: 'sample-duplicate-aws',
    name: 'Fatura AWS - Teste de Duplicidade (Mesmo Nº e Fornecedor)',
    documentType: 'invoice',
    description: 'Documento reutilizando o número AWS-2026-90412 do mesmo fornecedor.',
    expectedScenario: 'Alerta Crítico: Duplicidade Detectada (Step 4 - Prevenção contra pagamento duplicado).',
    sampleText: `=======================================================
DOCUMENTO AUXILIAR DA NOTA FISCAL DE SERVIÇO ELETRÔNICA
=======================================================
EMISSOR:
AWS Serviços de Nuvem Ltda
CNPJ: 23.412.247/0001-10
Fatura Nº: AWS-2026-90412
Data de Emissão: 2026-09-15
Data de Vencimento: 2026-10-15
Moeda: BRL

Item 1: Amazon Elastic Compute Cloud (EC2)
Total: R$ 3.200,00
Item 2: Amazon Simple Storage Service (S3)
Total: R$ 850,00
Item 3: Amazon Relational Database Service (RDS)
Total: R$ 1.950,00

Subtotal: R$ 6.000,00
Impostos: R$ 600,00
TOTAL: R$ 6.600,00
=======================================================`,
  },
  {
    id: 'sample-unregistered-receipt',
    name: 'Recibo Comercial - Fornecedor Novo Não Cadastrado',
    documentType: 'receipt',
    description: 'Recibo emitido por pequena empresa de manutenção predial sem cadastro prévio.',
    expectedScenario: 'Revisão: Fornecedor Novo Não Homologado (Step 5) e Ausência de CNPJ formatado.',
    sampleText: `=======================================================
RECIBO DE PRESTAÇÃO DE SERVIÇOS Nº REC-552
=======================================================
Emitente: João Silva Pinturas e Reformas ME
Identificação Fiscal: Não informada
Data de Emissão: 2026-09-25
Data de Vencimento: 2026-09-25
Moeda: BRL

Descrição:
Pintura e reparos em drywall na sala de reuniões do 4º andar
Valor dos Serviços: R$ 1.200,00
Material de acabamento: R$ 350,00

Subtotal: R$ 1.550,00
Impostos Retidos: R$ 0,00
TOTAL PAGO: R$ 1.550,00
=======================================================`,
  },
  {
    id: 'sample-csv-invoice',
    name: 'Fatura de Telecomunicações (Arquivo CSV)',
    documentType: 'invoice',
    description: 'Fatura com múltiplos itens e impostos estruturada em formato CSV com cabeçalhos tabulares.',
    expectedScenario: 'Ingestão e Extração de CSV: Parseamento de linhas de itens, subtotal, impostos e total líquido.',
    sampleText: `document_type,vendor_name,vendor_tax_id,invoice_number,issue_date,due_date,currency,subtotal,tax_amount,total
invoice,Embratel Telecomunicações S.A.,33.530.486/0001-29,EMB-2026-7781,2026-09-20,2026-10-20,BRL,4800.00,480.00,5280.00

item_number,description,quantity,unit_price,line_total
1,Link Dedicado de Fibra Óptica 1Gbps,1,3500.00,3500.00
2,Tronco SIP Telefonia IP Corporativa 60 canais,1,1300.00,1300.00`,
  },
  {
    id: 'sample-complex-statement-csv',
    name: 'Lote de Extrato e Transações (CSV 340 Linhas)',
    documentType: 'bank_statement',
    description: 'Extrato corporativo completo com 340 transações, estornos, multimoedas (USD/EUR) e tripla duplicidade.',
    expectedScenario: 'Auditoria de Extrato: Extração de 340 linhas, total consolidado de R$ 1.507.237,39 e auditoria de anomalias.',
    sampleText: `data,descrição,valor,moeda
2026-01-02,Material de escritório,218.86,BRL
2026-01-02,Restaurante reunião cliente,243.71,BRL
2026-01-04,Correios e encomendas,86.86,BRL
2026-01-04,HubSpot,1162.50,BRL
2026-01-04,Uber corporativo,80.63,BRL
2026-01-06,Café e copa,149.22,BRL
2026-01-06,Material de escritório,223.62,BRL
2026-01-06,Microsoft 365,845.06,BRL
2026-01-08,Adobe Creative Cloud,303.90,BRL
2026-01-08,Telefonia móvel,365.38,BRL
2026-01-08,Uber corporativo,82.36,BRL
2026-01-10,Café e copa,152.40,BRL
2026-01-10,Condomínio comercial,907.87,BRL
2026-01-10,Passagem aérea Recife–São Paulo,1370.69,BRL
2026-01-12,Adobe Creative Cloud,310.30,BRL
2026-01-12,Hospedagem cliente,774.45,BRL
2026-01-12,Limpeza e conservação,669.30,BRL
2026-01-14,Condomínio comercial,926.79,BRL
2026-01-14,Serviço contábil,1293.60,BRL
2026-01-14,Slack Technologies,727.65,BRL
2026-01-16,Aluguel escritório,6732.00,BRL
2026-01-16,GitHub Enterprise,484.11,BRL
2026-01-16,Hospedagem cliente,790.42,BRL
2026-01-18,Energia elétrica,1278.34,BRL
2026-01-18,Seguro frota,2150.00,BRL
2026-01-18,Serviço contábil,1320.00,BRL
2026-01-20,GitHub Enterprise,493.89,BRL
2026-01-20,Manutenção preventiva veículo 01,1262.50,BRL
2026-01-20,Reembolso de fornecedor — Consultoria jurídica,653.97,BRL
2026-01-22,Energia elétrica,1303.91,BRL
2026-01-22,Microsoft Azure,1682.90,BRL
2026-01-22,Publicidade Google Ads,1912.86,BRL
2026-01-24,Google Cloud Platform,2253.05,BRL
2026-01-24,Internet corporativa,514.90,BRL
2026-01-24,Manutenção preventiva veículo 01,1287.50,BRL
2026-01-26,Estorno / crédito — Combustível veículo 02,-149.29,BRL
2026-01-26,OpenAI API,711.07,BRL
2026-01-26,Publicidade Google Ads,1950.36,BRL
2026-01-28,Combustível veículo 01,328.07,BRL
2026-01-28,Google Cloud Platform,2296.80,BRL
2026-01-28,Publicidade Meta Ads,2205.00,BRL
2026-01-30,Infraestrutura AWS,4072.69,BRL
2026-01-30,OpenAI API,724.74,BRL
2026-01-30,Restaurante reunião cliente,280.79,BRL
2026-08-28,Serviço de TI — possível duplicidade,2500.00,BRL
2026-08-29,SERVIÇO DE TI,2500.00,BRL
2026-08-30,SERVIÇO DE TI,2500.00,BRL
2026-09-08,Valor muito alto — teste de limite,999999.99,BRL
2026-09-19,Câmbio USD — serviço internacional,980.75,USD
2026-09-20,Câmbio EUR — serviço internacional,1240.50,EUR
2026-09-24,Transferência interna — conta operacional,-15000.00,BRL
2026-09-30,Pagamento recebido — Cliente ACME,-12500.00,BRL`,
  },
];
