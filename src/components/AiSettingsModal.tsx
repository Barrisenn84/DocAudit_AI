import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  X,
} from 'lucide-react';
import { safeFetchJson } from '../utils/api.js';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusData, setStatusData] = useState<{
    isAvailable: boolean;
    activeModel: string;
    latencyMs: number;
    hasKey: boolean;
    error?: string;
  } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStatus = async () => {
    setIsTesting(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        health: {
          isAvailable: boolean;
          activeModel: string;
          latencyMs: number;
          hasKey: boolean;
          error?: string;
        };
      }>('/api/ai/status');

      if (res.success && res.data?.health) {
        setStatusData(res.data.health);
      }
    } catch {
      // Ignora erro
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMessage(null);
    }
  }, [isOpen]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await safeFetchJson<{ success: boolean; message: string }>('/api/ai/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });

      if (res.success) {
        setMessage({ text: 'Chave do Gemini configurada com sucesso!', type: 'success' });
        setApiKeyInput('');
        await fetchStatus();
        if (onKeyUpdated) onKeyUpdated();
      } else {
        setMessage({ text: res.error || 'Erro ao registrar chave.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Falha ao salvar chave.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Motor de Inteligência Artificial Gemini</h2>
              <p className="text-xs text-indigo-200">
                Google GenAI Oficial • Modelos Corporativos 2.5 Flash & 2.5 Pro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Status da Conexão IA:</span>
              </span>
              <button
                onClick={fetchStatus}
                disabled={isTesting}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Testar Conexão</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Disponibilidade</span>
                <span className="font-bold flex items-center space-x-1 mt-0.5">
                  {statusData?.isAvailable ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-700">Online & Ativa</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-amber-700">Chave Pendente</span>
                    </>
                  )}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Modelo Ativo</span>
                <span className="font-bold text-slate-800 mt-0.5 block truncate">
                  {statusData?.activeModel || 'gemini-2.5-flash'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px]">Latência</span>
                <span className="font-bold text-slate-800 mt-0.5 flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{statusData?.latencyMs ? `${statusData.latencyMs}ms` : '--'}</span>
                </span>
              </div>
            </div>

            {statusData?.error && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                {statusData.error}
              </p>
            )}
          </div>

          {/* Form to insert API key */}
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Chave de API do Google Gemini (GEMINI_API_KEY)</span>
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Insira sua chave: AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Você pode obter sua chave gratuita instantaneamente no{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 font-bold hover:underline inline-flex items-center space-x-0.5"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={isSaving || !apiKeyInput.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Salvar & Ativar IA</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
