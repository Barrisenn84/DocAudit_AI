import React, { useState } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileText,
  Volume2,
  VolumeX,
  Trash2,
  CheckCheck,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Layers,
  Radio,
} from 'lucide-react';
import { AuditNotification } from '../types/finance.js';
import { useNotifications } from '../context/NotificationContext.js';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument?: (docId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  onNavigateToTab,
}) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    isMuted,
    toggleMute,
    markAsRead,
    clearAllNotifications,
    triggerTestNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'discrepancies' | 'documents' | 'benchmarks'>('all');
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'discrepancies') {
      return notif.type === 'DISCREPANCY_DETECTED' || notif.severity === 'critical' || notif.severity === 'warning';
    }
    if (activeFilter === 'documents') {
      return notif.type === 'DOCUMENT_PROCESSED';
    }
    if (activeFilter === 'benchmarks') {
      return notif.type === 'BENCHMARK_ANOMALY';
    }
    return true;
  });

  const handleSimulate = async (type: 'DOCUMENT_PROCESSED' | 'DISCREPANCY_DETECTED' | 'BENCHMARK_ANOMALY') => {
    setIsSimulating(true);
    await triggerTestNotification(type);
    setIsSimulating(false);
  };

  const handleItemClick = (notif: AuditNotification) => {
    markAsRead(notif.id);
    if (notif.documentId && onSelectDocument) {
      onSelectDocument(notif.documentId);
      onClose();
    } else if (notif.type === 'BENCHMARK_ANOMALY' && onNavigateToTab) {
      onNavigateToTab('benchmarks');
      onClose();
    } else if (notif.type === 'DISCREPANCY_DETECTED' && onNavigateToTab) {
      onNavigateToTab('extraction');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="relative p-2 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">Centro de Monitoramento</h3>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{isConnected ? 'SSE AO VIVO' : 'CONECTANDO...'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Notificações instantâneas de novos documentos e divergências
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                isMuted ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/60'
              }`}
              title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar avisos sonoros'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Simulation Test Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Testar Notificação Realtime:</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleSimulate('DISCREPANCY_DETECTED')}
              disabled={isSimulating}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition-all cursor-pointer flex items-center space-x-1"
            >
              <Flame className="w-3 h-3 text-rose-600" />
              <span>Divergência</span>
            </button>
            <button
              onClick={() => handleSimulate('BENCHMARK_ANOMALY')}
              disabled={isSimulating}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-all cursor-pointer flex items-center space-x-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Sobrepreço</span>
            </button>
            <button
              onClick={() => handleSimulate('DOCUMENT_PROCESSED')}
              disabled={isSimulating}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-300 transition-all cursor-pointer flex items-center space-x-1"
            >
              <FileText className="w-3 h-3 text-indigo-600" />
              <span>Novo Doc</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Quick Actions */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('discrepancies')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                activeFilter === 'discrepancies'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Divergências
            </button>
            <button
              onClick={() => setActiveFilter('benchmarks')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                activeFilter === 'benchmarks'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Sobrepreços
            </button>
            <button
              onClick={() => setActiveFilter('documents')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                activeFilter === 'documents'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              Documentos
            </button>
          </div>

          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-all text-[11px] flex items-center space-x-1"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lidas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all text-[11px] flex items-center space-x-1"
                title="Limpar histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Nenhuma notificação no momento</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Quando um novo documento for processado ou uma inconsistência for detectada, os alertas aparecerão aqui em tempo real.
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isCrit = notif.severity === 'critical';
              const isWarn = notif.severity === 'warning';
              const isSucc = notif.severity === 'success';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-xl cursor-pointer transition-all border ${
                    !notif.read
                      ? isCrit
                        ? 'bg-rose-50/60 border-rose-200'
                        : isWarn
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-indigo-50/60 border-indigo-200'
                      : 'bg-white hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isCrit
                            ? 'bg-rose-100 text-rose-700'
                            : isWarn
                            ? 'bg-amber-100 text-amber-700'
                            : isSucc
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isCrit ? (
                          <Flame className="w-4 h-4" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {notif.message}
                        </p>
                        {notif.amount !== undefined && (
                          <div className="pt-1 flex items-center space-x-2 text-[11px]">
                            {notif.vendorName && (
                              <span className="font-medium text-slate-700">{notif.vendorName}</span>
                            )}
                            <span className="font-mono font-bold text-slate-900">
                              {notif.currency === 'USD' ? '$' : 'R$'}{' '}
                              {notif.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.documentId && (
                        <span className="inline-flex items-center text-[10px] text-indigo-600 font-semibold hover:underline">
                          <span>Inspecionar</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>Serviço SSE: <code>/api/notifications/stream</code></span>
          </span>
          <span>Atualização em tempo real</span>
        </div>
      </div>
    </div>
  );
};
