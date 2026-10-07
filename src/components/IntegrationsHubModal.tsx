import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  TrendingUp,
  MapPin,
  Calendar,
  Zap,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  IntegrationsHealthStatus,
  AwesomeCurrencyQuote,
  LiveCepData,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface IntegrationsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsHubModal: React.FC<IntegrationsHubModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [healthData, setHealthData] = useState<IntegrationsHealthStatus | null>(null);
  const [rates, setRates] = useState<Record<string, AwesomeCurrencyQuote> | null>(null);
  const [cepInput, setCepInput] = useState('');
  const [cepResult, setCepResult] = useState<LiveCepData | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const fetchIntegrationsData = async () => {
    setIsLoadingAll(true);
    try {
      const [hRes, rRes] = await Promise.all([
        safeFetchJson<{ success: boolean; health: IntegrationsHealthStatus }>('/api/integrations/status'),
        safeFetchJson<{ success: boolean; rates: Record<string, AwesomeCurrencyQuote> }>('/api/integrations/awesome-rates'),
      ]);

      if (hRes.success && hRes.data?.health) setHealthData(hRes.data.health);
      if (rRes.success && rRes.data?.rates) setRates(rRes.data.rates);
    } catch (err) {
      console.error('Erro ao buscar dados das integrações:', err);
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrationsData();
    }
  }, [isOpen]);

  const handleSearchCep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cepInput || cepInput.replace(/\D/g, '').length !== 8) {
      setCepError('Informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsLoadingCep(true);
    setCepError(null);
    setCepResult(null);
    try {
      const clean = cepInput.replace(/\D/g, '');
      const res = await safeFetchJson<{ success: boolean; data: LiveCepData }>(`/api/integrations/cep/${clean}`);
      if (res.success && res.data?.data) {
        setCepResult(res.data.data);
      } else {
        setCepError(res.error || 'CEP não localizado na base nacional dos Correios/BrasilAPI.');
      }
    } catch (err: any) {
      setCepError(err.message || 'Falha ao consultar CEP.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/30">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Hub de APIs Governamentais & Câmbio ao Vivo</h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  100% Gratuitas & Oficiais
                </span>
              </div>
              <p className="text-xs text-slate-300">
                BrasilAPI • AwesomeAPI • Receita Federal • Banco Central do Brasil • ANBIMA
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchIntegrationsData}
              disabled={isLoadingAll}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Recarregar status e cotações"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAll ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* 1. Live Currency Rates (AwesomeAPI) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Cotações de Moedas & Criptoativos em Tempo Real (AwesomeAPI)</span>
              </h3>
              <span className="text-[11px] text-slate-500">Atualização contínua a cada 30s</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {rates ? (
                Object.values(rates).map((rate) => (
                  <div
                    key={rate.code}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all shadow-2xs hover:shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-700">{rate.code}/BRL</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          rate.pctChange >= 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rate.pctChange >= 0 ? `+${rate.pctChange}%` : `${rate.pctChange}%`}
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      R$ {rate.bid >= 1000 ? rate.bid.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : rate.bid.toFixed(4)}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Mín: R$ {rate.low < 1000 ? rate.low.toFixed(3) : rate.low.toLocaleString('pt-BR')}</span>
                      <span>Máx: R$ {rate.high < 1000 ? rate.high.toFixed(3) : rate.high.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-4 p-4 text-center text-xs text-slate-500">
                  Carregando cotações em tempo real...
                </div>
              )}
            </div>
          </div>

          {/* 2. Interactive Live CEP Lookup (BrasilAPI) */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Validador de Endereço & Domicílio Fiscal por CEP (BrasilAPI)</span>
            </h3>

            <form onSubmit={handleSearchCep} className="flex gap-2">
              <input
                type="text"
                value={cepInput}
                onChange={(e) => setCepInput(e.target.value)}
                placeholder="Ex: 01310-100 ou 01001000"
                className="flex-1 px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isLoadingCep}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                {isLoadingCep ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Consultar</span>
              </button>
            </form>

            {cepError && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {cepError}
              </p>
            )}

            {cepResult && (
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Logradouro</span>
                  <span className="font-bold text-slate-900">{cepResult.street || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Bairro</span>
                  <span className="font-bold text-slate-900">{cepResult.neighborhood || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Cidade / UF</span>
                  <span className="font-bold text-slate-900">{cepResult.city} - {cepResult.state}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Código IBGE</span>
                  <span className="font-mono font-bold text-indigo-700">{cepResult.ibge || '3550308'}</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Integrations Health Status List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Painel de Disponibilidade das Conexões Oficiais</span>
            </h3>

            <div className="space-y-2">
              {healthData?.services.map((srv, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        srv.status === 'ONLINE'
                          ? 'bg-emerald-500 ring-4 ring-emerald-100'
                          : srv.status === 'DEGRADED'
                          ? 'bg-amber-500 ring-4 ring-amber-100'
                          : 'bg-rose-500 ring-4 ring-rose-100'
                      }`}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{srv.service}</span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                            srv.status === 'ONLINE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {srv.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{srv.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-600 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>{srv.latencyMs}ms</span>
                    </span>
                    <a
                      href={srv.providerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Acessar documentação oficial"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Todas as requisições utilizam cache inteligente de 30 min para proteger taxa de limites.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
          >
            Fechar Hub
          </button>
        </div>
      </div>
    </div>
  );
};
