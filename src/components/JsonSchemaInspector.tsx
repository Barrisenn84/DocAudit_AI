import React, { useState } from 'react';
import { BookOpen, Copy, Check, Code, ShieldCheck, Cpu } from 'lucide-react';
import { GeminiExtractionResult } from '../types/finance.js';

interface JsonSchemaInspectorProps {
  currentExtraction?: GeminiExtractionResult | null;
}

export const JsonSchemaInspector: React.FC<JsonSchemaInspectorProps> = ({ currentExtraction }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const promptText = `Você é o extrator de documentos financeiros da plataforma.

Extraia somente informações visíveis ou claramente legíveis no documento.
Não classifique a despesa, não escolha conta contábil, não calcule impostos
e não preencha campos ausentes com suposições.

Para cada campo, retorne:
- valor extraído ou null;
- confidence entre 0 e 1;
- status: observed, ambiguous ou missing;
- evidência textual;
- página ou localização, quando disponível.

Se houver conflito entre subtotal, imposto, linhas e total, preserve os valores
encontrados, crie uma exceção e não resolva silenciosamente.

Não use conhecimento externo.
Use exatamente o schema fornecido.
O schema deve conter campos como:
{
  "document_type": "invoice",
  "vendor_name": "string ou null",
  "vendor_tax_id": "string ou null",
  "invoice_number": "string ou null",
  "issue_date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "currency": "USD",
  "subtotal": 0,
  "tax_amount": 0,
  "total": 0,
  "line_items": [],
  "field_evidence": [],
  "exceptions": []
}`;

  const copyToClipboard = (text: string, isPrompt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPrompt) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 6 Backend Steps Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Motor de Auditoria Backend: As 6 Etapas Mandatórias
            </h3>
            <p className="text-xs text-slate-500">
              Executadas no servidor assim que o Gemini retorna os dados estruturados via JSON Schema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 1
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">1. Recalcular a soma das linhas</h4>
            <p className="text-xs text-slate-600 mt-1">
              Itera sobre <code className="font-mono text-indigo-600">line_items</code>, calcula a soma das linhas e compara com o subtotal e o total extraídos, com tolerância de precisão monetária.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 2
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">2. Comparar subtotal, imposto e total</h4>
            <p className="text-xs text-slate-600 mt-1">
              Valida a equação fiscal <code className="font-mono text-indigo-600">Subtotal + Imposto = Total</code>. Identifica divergências de arredondamento ou deduções ocultas.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 3
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">3. Validar moeda e datas</h4>
            <p className="text-xs text-slate-600 mt-1">
              Checa padrão ISO de moedas e formato <code className="font-mono text-indigo-600">YYYY-MM-DD</code>. Valida cronologia (data de vencimento não pode ser anterior à data de emissão).
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 4
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">4. Procurar duplicidade</h4>
            <p className="text-xs text-slate-600 mt-1">
              Compara contra o histórico por número de documento + fornecedor (ou mesma data + mesmo valor exato), prevenindo pagamento duplo acidental.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 5
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">5. Verificar o fornecedor</h4>
            <p className="text-xs text-slate-600 mt-1">
              Consulta o Vendor Master corporativo por CNPJ/Tax ID e razão social. Valida algoritmo de dígito verificador e bloqueios de Compliance.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Passo 6
            </span>
            <h4 className="font-bold text-sm text-slate-900 mt-2">6. Enviar divergências para revisão</h4>
            <p className="text-xs text-slate-600 mt-1">
              Roteamento automático: se limpo, <code className="font-mono text-emerald-700">APPROVED_AUTOMATIC</code>. Se houver discrepância em qualquer passo, encaminha para a esteira de revisão humana auditável.
            </p>
          </div>
        </div>
      </div>

      {/* Structured Output Prompt & JSON Schema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  System Instruction Estrita do Extrator
                </h4>
              </div>
              <button
                onClick={() => copyToClipboard(promptText, true)}
                className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-700 bg-slate-900 text-slate-200 p-4 rounded-xl overflow-y-auto max-h-96 whitespace-pre-wrap">
              {promptText}
            </pre>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Saída Estruturada do Documento Ativo (JSON)
                </h4>
              </div>
              {currentExtraction && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(currentExtraction, null, 2), false)}
                  className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>
            {currentExtraction ? (
              <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl overflow-y-auto max-h-96 whitespace-pre-wrap select-all">
                {JSON.stringify(currentExtraction, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                Selecione ou extraia um documento para visualizar a resposta JSON Schema gerada pelo Gemini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
