import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  FileCheck2,
  FileText,
  TrendingUp,
  Tag,
  X,
  ExternalLink,
  Flame,
  CheckCircle2,
  Bell,
  Sparkles,
} from 'lucide-react';
import { AuditNotification } from '../types/finance.js';
import { useNotifications } from '../context/NotificationContext.js';

interface ToastNotificationsProps {
  onNavigateToDocument?: (docId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

const TOAST_DURATION_MS = 6500;

const ToastItem: React.FC<{
  notification: AuditNotification;
  onDismiss: (id: string) => void;
  onNavigateToDocument?: (docId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}> = ({ notification, onDismiss, onNavigateToDocument, onNavigateToTab }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const decrement = (interval / TOAST_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onDismiss(notification.id);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, notification.id, onDismiss]);

  const getSeverityStyle = () => {
    switch (notification.severity) {
      case 'critical':
        return {
          cardBg: 'bg-slate-900/95 border-rose-500/80 shadow-rose-950/40',
          accentBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          icon: <Flame className="w-4 h-4 text-rose-400 animate-pulse" />,
          barColor: 'bg-gradient-to-r from-rose-500 to-amber-500',
          badgeText: 'DIVERGÊNCIA CRÍTICA',
        };
      case 'warning':
        return {
          cardBg: 'bg-slate-900/95 border-amber-500/80 shadow-amber-950/40',
          accentBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          barColor: 'bg-amber-500',
          badgeText: 'ALERTA DE AUDITORIA',
        };
      case 'success':
        return {
          cardBg: 'bg-slate-900/95 border-emerald-500/80 shadow-emerald-950/40',
          accentBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          barColor: 'bg-emerald-500',
          badgeText: 'CONFORME',
        };
      default:
        return {
          cardBg: 'bg-slate-900/95 border-indigo-500/70 shadow-indigo-950/40',
          accentBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          icon: <FileText className="w-4 h-4 text-indigo-400" />,
          barColor: 'bg-indigo-500',
          badgeText: 'NOVO DOCUMENTO',
        };
    }
  };

  const style = getSeverityStyle();

  const handleActionClick = () => {
    if (notification.documentId && onNavigateToDocument) {
      onNavigateToDocument(notification.documentId);
    } else if (notification.type === 'BENCHMARK_ANOMALY' && onNavigateToTab) {
      onNavigateToTab('benchmarks');
    } else if (notification.type === 'DISCREPANCY_DETECTED' && onNavigateToTab) {
      onNavigateToTab('extraction');
    }
    onDismiss(notification.id);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-96 max-w-full overflow-hidden rounded-2xl border backdrop-blur-md shadow-2xl p-4 transition-all duration-300 transform translate-y-0 text-white ${style.cardBg}`}
      role="alert"
    >
      {/* Top Info Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            {style.icon}
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${style.accentBg}`}>
            {style.badgeText}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(notification.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => onDismiss(notification.id)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Fechar Notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-1 pr-1">
        <h4 className="text-xs font-bold text-slate-100 leading-snug line-clamp-1">
          {notification.title}
        </h4>
        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {notification.amount !== undefined && (
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {notification.vendorName ? <strong className="text-slate-200">{notification.vendorName}</strong> : 'Valor:'}
            </span>
            <span className="font-mono font-bold text-slate-100">
              {notification.currency === 'USD' ? '$' : 'R$'}{' '}
              {notification.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {(notification.documentId || notification.type === 'BENCHMARK_ANOMALY' || notification.type === 'DISCREPANCY_DETECTED') && (
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {notification.stepName ? `Etapa: ${notification.stepName}` : 'Auditoria em tempo real'}
          </span>
          <button
            onClick={handleActionClick}
            className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg border border-indigo-700/50 transition-all cursor-pointer"
          >
            <span>Inspecionar</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      )}

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className={`h-full transition-all duration-75 ${style.barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({
  onNavigateToDocument,
  onNavigateToTab,
}) => {
  const { activeToasts, dismissToast } = useNotifications();

  if (activeToasts.length === 0) return null;

  return (
    <aside aria-label="Notificações de auditoria em tempo real" className="fixed bottom-5 right-5 z-50 flex flex-col-reverse space-y-reverse space-y-3 pointer-events-auto max-w-sm sm:max-w-md">
      {activeToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          notification={toast}
          onDismiss={dismissToast}
          onNavigateToDocument={onNavigateToDocument}
          onNavigateToTab={onNavigateToTab}
        />
      ))}
    </aside>
  );
};
