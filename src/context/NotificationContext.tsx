import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuditNotification, NotificationSeverity } from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

interface NotificationContextType {
  notifications: AuditNotification[];
  unreadCount: number;
  isConnected: boolean;
  activeToasts: AuditNotification[];
  isMuted: boolean;
  toggleMute: () => void;
  markAsRead: (id?: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  dismissToast: (id: string) => void;
  triggerTestNotification: (type?: 'DOCUMENT_PROCESSED' | 'DISCREPANCY_DETECTED' | 'BENCHMARK_ANOMALY', customMessage?: string) => Promise<void>;
  addManualToast: (toast: Omit<AuditNotification, 'id' | 'timestamp'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_TOASTS = 4;
const TOAST_DURATION_MS = 6500;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AuditNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<AuditNotification[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Play subtle audio alert if not muted
  const playAlertTone = useCallback((severity: NotificationSeverity) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (severity === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); // A4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (severity === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(493.88, ctx.currentTime); // B4
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Audio playback might be restricted before user gesture
    }
  }, []);

  const addToast = useCallback((notif: AuditNotification) => {
    setActiveToasts((prev) => {
      // Avoid duplicate toasts with same ID
      if (prev.some((t) => t.id === notif.id)) return prev;
      const updated = [notif, ...prev];
      return updated.slice(0, MAX_TOASTS);
    });

    if (!isMuted && notif.type !== 'SYSTEM_INFO') {
      playAlertTone(notif.severity);
    }
  }, [isMuted, playAlertTone]);

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch initial notification history
  const fetchInitialNotifications = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; notifications: AuditNotification[] }>('/api/notifications');
      if (res.success && Array.isArray(res.data?.notifications)) {
        setNotifications(res.data.notifications);
      }
    } catch (e) {
      console.warn('Could not fetch notifications history:', e);
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    fetchInitialNotifications();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/notifications/stream');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: AuditNotification = JSON.parse(e.data);
            if (!data.id) return;

            setNotifications((prev) => {
              if (prev.some((n) => n.id === data.id)) return prev;
              return [{ ...data, read: false }, ...prev];
            });

            if (data.type !== 'SYSTEM_INFO') {
              addToast(data);
            }
          } catch (parseErr) {
            console.warn('Error parsing SSE event data:', parseErr);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnection in 5 seconds
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [addToast]);

  const markAsRead = async (id?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (id ? (n.id === id ? { ...n, read: true } : n) : { ...n, read: true }))
    );
    try {
      await safeFetchJson('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
    } catch (e) {
      console.warn('Failed to sync mark-read to server:', e);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setActiveToasts([]);
    try {
      await safeFetchJson('/api/notifications', { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to clear notifications on server:', e);
    }
  };

  const triggerTestNotification = async (
    type: 'DOCUMENT_PROCESSED' | 'DISCREPANCY_DETECTED' | 'BENCHMARK_ANOMALY' = 'DISCREPANCY_DETECTED',
    customMessage?: string
  ) => {
    try {
      await safeFetchJson('/api/notifications/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, customMessage }),
      });
    } catch (e) {
      console.warn('Failed to trigger test notification:', e);
    }
  };

  const addManualToast = (toast: Omit<AuditNotification, 'id' | 'timestamp'>) => {
    const fullToast: AuditNotification = {
      ...toast,
      id: `TOAST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [fullToast, ...prev]);
    addToast(fullToast);
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        activeToasts,
        isMuted,
        toggleMute,
        markAsRead,
        clearAllNotifications,
        dismissToast,
        triggerTestNotification,
        addManualToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
