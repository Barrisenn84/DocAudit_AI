import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { safeFetchJson } from '../utils/api.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface AiCopilotWidgetProps {
  currentModule: string;
  onOpenAiSettings?: () => void;
}

export const AiCopilotWidget: React.FC<AiCopilotWidgetProps> = ({
  currentModule,
  onOpenAiSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Olá! Sou o **DocAudit Copilot**, seu consultor de Inteligência Artificial para controladoria, auditoria fiscal e tesouraria. Como posso ajudar na gestão do seu negócio hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.1-flash-lite',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (userPromptText?: string) => {
    const textToSend = (userPromptText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userPromptText) setInput('');
    setIsLoading(true);

    try {
      const apiHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await safeFetchJson<{
        success: boolean;
        response: { reply: string; modelUsed: string };
      }>('/api/ai/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistory,
          currentModule,
        }),
      });

      if (res.success && res.data?.response) {
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: res.data.response.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: res.data.response.modelUsed,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errMessage: Message = {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content:
            res.error ||
            'Não foi possível conectar com os servidores do Gemini no momento. Verifique sua chave no painel de configurações.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errMessage]);
      }
    } catch (err: any) {
      const errMessage: Message = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `Falha na requisição: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Como o IBS e CBS impactarão nossos contratos de tecnologia?',
    'Explique o risco estatístico da Lei de Benford nas nossas notas fiscais.',
    'Como proteger o caixa nos dias de liquidez apertada em D+90?',
    'O que falta para fecharmos o mês Fast-Close sem ressalvas?',
  ];

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 ring-4 ring-white/80 cursor-pointer animate-in fade-in"
          title="Abrir Copiloto de Inteligência Artificial DocAudit AI"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-indigo-700" />
          </div>
          <span className="text-xs font-bold tracking-tight pr-1">Copilot IA</span>
        </button>
      )}

      {/* Floating Drawer / Chat Box */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-6 ${
            isExpanded
              ? 'w-[90vw] md:w-[650px] h-[85vh]'
              : 'w-[92vw] sm:w-[440px] h-[580px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center ring-1 ring-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm tracking-tight">DocAudit Copilot</h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                    IA Ativa
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Módulo Atual: <span className="text-indigo-200 font-semibold">{currentModule}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Restaurar tamanho' : 'Maximizar'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Sugestões:</span>
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[10px] font-medium text-slate-600 bg-white hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-slate-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`mt-1.5 text-[9px] flex items-center justify-between gap-2 ${
                      msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && (
                      <span className="font-mono text-[8px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>DocAudit Copilot analisando bases e gerando resposta...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao Copiloto Financeiro..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-100 rounded-xl border border-transparent focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
