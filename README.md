# DocAudit AI — Plataforma Enterprise de Auditoria Financeira, Fiscal, Forense & Tesouraria com IA

<div align="center">

![Versão](https://img.shields.io/badge/Vers%C3%A3o-2.5.0--Enterprise-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-100%25%20Pronto%20para%20Produ%C3%A7%C3%A3o-success?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Google Gemini](https://img.shields.io/badge/IA-Gemini%202.5%20Flash%20%26%20Pro-8E75C4?style=for-the-badge&logo=google&logoColor=white)
![BrasilAPI](https://img.shields.io/badge/APIs-BrasilAPI%20%2B%20AwesomeAPI-009739?style=for-the-badge)

<p align="center">
  <b>Solução completa para CFOs, auditores contábeis, escritórios tributários e gestores financeiros.</b><br>
  Auditoria forense automatizada, conciliação D+0/D+1, inteligência tributária para a Reforma Tributária (IBS/CBS), projeção preditiva de tesouraria D+90, ESG e Copiloto Financeiro 24/7.
</p>

</div>

---

## 🎯 Visão Geral do Sistema

O **DocAudit AI** é uma plataforma SaaS e Enterprise de alta performance projetada para eliminar o trabalho manual e o erro humano na gestão financeira e fiscal corporativa. Combinando algoritmos matemáticos determinísticos com a potência cognitiva dos modelos **Google Gemini 2.5**, o sistema realiza auditorias profundas em segundos, gerando laudos periciais e estratégicos de nível executivo.

---

## 🚀 Módulos e Funcionalidades Principais

### 1. 🔍 Auditoria Forense SOX & Detecção de Fraudes
- **Análise da Lei de Benford:** Auditoria estatística do primeiro dígito para detecção de valores fictícios ou manipulados.
- **Segregação de Funções (SoD):** Identificação de violações de governança corporativa (mesmo usuário que cria e aprova pagamentos).
- **Laudo Pericial por IA:** Geração automática de parecer com classificação de risco e plano de ação imediato.

### 2. 📈 Tesouraria Preditiva D+90 & Fluxo de Caixa
- **Projeção Contínua de Liquidez:** Modelagem dia a dia para os próximos 90 dias com cálculo de saldo mínimo de segurança.
- **Parecer Preditivo por IA:** Análise qualitativa da queima de caixa (burn rate), pontos críticos de liquidez e recomendações de gestão de capital de giro (PMP/PMR).

### 3. ⚖️ Inteligência Fiscal & Reforma Tributária (IBS/CBS)
- **Auditoria de Retenções na Fonte:** Validação de PIS, COFINS, CSLL, IRRF e ISS em notas fiscais e arquivos SPED.
- **Simulador da Reforma Tributária:** Transição completa do ICMS e ISS para o IVA Dual (IBS estadual/municipal e CBS federal - EC 132).
- **Diagnóstico Tributário por IA:** Parecer fiscal com levantamento de créditos e estratégias de recuperação de tributos.

### 4. 🌱 Governança ESG & Auditoria de Carbono
- **Cálculo de Pegada de Carbono (GHG Protocol):** Emissões de toneladas de CO₂ equivalente divididas nos Escopos 1, 2 e 3 a partir de faturas de utilidades e logística.
- **Consultoria de Descarbonização por IA:** Recomendações de eficiência energética e monetização com créditos de carbono no mercado voluntário.

### 5. 🤖 Copiloto Financeiro Conversacional 24/7
- **Assistente Executivo Flutuante:** Responde dúvidas estratégicas, sintetiza cenários e audita transações em tempo real usando linguagem natural brasileira.
- **Ações Rápidas de 1 Clique:** Diagnósticos expressos de liquidez, riscos SOX e impactos tributários para diretores e conselhos.

### 6. 🌐 Conexão Nativas com APIs Gratuitas e Oficiais Brasileiras
- **AwesomeAPI:** Cotações ao vivo de moedas internacionais (USD, EUR, GBP) e Cripto (BTC, USDT).
- **BrasilAPI:**
  - Consulta oficial de CNPJ (Receita Federal).
  - Taxas de Juros Oficiais: SELIC, CDI e IPCA (Banco Central do Brasil).
  - Calendário de Feriados Bancários Nacionais (ANBIMA / BACEN).
  - Tabela COMPE de mais de 250 bancos brasileiros.
  - Validação cadastral automática por CEP.
  - Tabela FIPE oficial para avaliação de frotas e ativos.

### 7. 📂 Extrator Multiformato & Conciliação D+0/D+1
- Leitura e processamento de **PDFs, XMLs (NF-e, NFS-e), CSV, Planilhas Excel (XLSX), OFX bancário e OCR visual via Tesseract**.
- Motor de conciliação bancária automática com tolerância temporal e de centavos.

---

## 🛠️ Arquitetura Tecnológica

```
DocAudit_AI/
├── data/                    # Persistência atômica local em disco (.json)
├── server/                  # Serviços de Backend
│   ├── aiService.ts         # Orquestrador neural (Gemini 2.5 Flash / Pro + Fallbacks)
│   ├── liveIntegrations.ts  # Conectores com BrasilAPI & AwesomeAPI
│   └── storageService.ts    # Persistência segura e atômica em disco
├── src/                     # Aplicação Frontend React 19
│   ├── components/          # Componentes modulares de UI/UX
│   │   ├── AiCopilotWidget.tsx      # Copiloto conversacional flutuante
│   │   ├── AiSettingsModal.tsx      # Gestão de chave e latência da IA
│   │   ├── IntegrationsHubModal.tsx # Hub de cotações e APIs gratuitas
│   │   ├── ForensicsSoxView.tsx     # Visão Forense SOX + Laudo IA
│   │   ├── TreasuryCashFlowView.tsx # Visão Tesouraria + Parecer IA
│   │   ├── TaxAndSpedView.tsx       # Visão Tributária + Diagnóstico IA
│   │   └── EsgCarbonView.tsx        # Visão ESG + Consultoria IA
│   ├── types/               # Definições estritas TypeScript
│   └── App.tsx              # Componente principal do sistema
├── server.ts                # Servidor Express de produção e rotas REST
├── package.json             # Dependências e scripts de execução
├── tsconfig.json            # Configuração TypeScript rigorosa
└── vite.config.ts           # Configuração de build e empacotamento Vite
```

---

## 💻 Como Executar o Sistema

### Pré-requisitos
- **Node.js:** Versão 18.x ou superior (Recomendado: 20 LTS ou 22).
- **NPM:** 9.x ou superior.

### 1. Clonar o Repositório
```bash
git clone https://github.com/Barrisenn84/DocAudit_AI.git
cd DocAudit_AI
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo e insira sua chave do Google AI Studio:
```bash
cp .env.example .env
```
Edite o arquivo `.env`:
```env
GEMINI_API_KEY="sua_chave_do_google_ai_studio"
PORT=3000
```
> *Nota: Você também pode inserir ou alterar sua chave de IA diretamente pela interface do sistema clicando no botão "IA: Gemini 2.5" no cabeçalho.*

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
O sistema estará acessível em `http://localhost:3000`.

### 5. Compilar e Executar em Produção
```bash
# Validar tipagem e compilar bundle minificado
npm run lint
npm run build

# Iniciar servidor de produção
npm start
```

---

## 🔒 Segurança e Persistência de Dados

- **Armazenamento Atômico:** Todos os dados inseridos (documentos, conciliações, exceções e relatórios) são gravados em disco de forma segura na pasta `data/`, evitando perda de dados caso o servidor seja reiniciado.
- **Sanitização de Entradas:** Proteção contra injeção e validação estrita de formatos contábeis e fiscais.
- **Proteção de Segredos:** Chaves de API e arquivos de ambiente sensíveis são blindados no `.gitignore`.

---

## 💼 Pronto para Venda e Comercialização

O **DocAudit AI** está calibrado e estruturado para:
1. **Implantação SaaS Multitenant em Nuvem** (AWS, Render, Railway, Vercel ou VPS).
2. **Implantação On-Premise** para clientes corporativos com exigências restritas de compliance financeiro.
3. **Comercialização B2B:** Escritórios contábeis, consultorias tributárias, auditorias externas e médias/grandes empresas.

---

## 📑 Laudo Pericial de Auditoria Técnica

O laudo minucioso emitido na homologação para produção encontra-se documentado em:
- [Laudo de Auditoria Técnica & Certificação de Produção](./docs/LAUDO_AUDITORIA_TECNICA.md)

---

## 📄 Licença

Este software é licenciado sob uso corporativo e comercial. Todos os direitos reservados.
