import React from 'react';
import {
  ShieldCheck,
  FileCheck2,
  Cpu,
  Database,
  BookOpen,
  Layers,
  CheckSquare,
  FileBarChart,
  Terminal,
  Tag,
  Bell,
  Radio,
  Percent,
  Wallet,
  BarChart3,
  Fingerprint,
  Leaf,
  Server,
  Scale,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.js';

export type AppTab =
  | 'extraction'
  | 'classification'
  | 'journal'
  | 'revenue'
  | 'reconciliation'
  | 'triage'
  | 'closing'
  | 'cfo'
  | 'tax'
  | 'treasury'
  | 'fpa'
  | 'forensics'
  | 'esg'
  | 'erp'
  | 'benchmarks'
  | 'tools'
  | 'chart'
  | 'documents'
  | 'vendors';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  documentCount: number;
  pendingReviewCount: number;
  proposalCount?: number;
  exceptionsCount?: number;
  isClosingBlocked?: boolean;
  onOpenNotifications?: () => void;
  onOpenAiSettings?: () => void;
  onOpenIntegrationsHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  pendingReviewCount,
  proposalCount = 0,
  exceptionsCount = 0,
  onOpenNotifications,
  onOpenAiSettings,
  onOpenIntegrationsHub,
}) => {
  const { unreadCount, isConnected } = useNotifications();
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('extraction')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">DocAudit AI</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md">
                  Financeiro & Contábil
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden lg:block">
                Extração • Classificação • Lançamentos • Receita • Reconciliação • Exceções
              </p>
            </div>
          </div>

          {/* Navigation Tabs (All 6 modules) */}
          <nav className="flex items-center space-x-1 overflow-x-auto py-2 ml-4">
            <button
              onClick={() => setActiveTab('extraction')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'extraction'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>1. Extração</span>
            </button>

            <button
              onClick={() => setActiveTab('classification')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'classification'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Classificação</span>
            </button>

            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'journal'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>3. Lançamento</span>
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'revenue'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>4. Receita (IFRS 15)</span>
            </button>

            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'reconciliation'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>5. Reconciliação</span>
            </button>

            <button
              onClick={() => setActiveTab('triage')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'triage'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>6. Exceções</span>
            </button>

            <button
              onClick={() => setActiveTab('closing')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'closing'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>7. Fechamento</span>
            </button>

            <button
              onClick={() => setActiveTab('cfo')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'cfo'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileBarChart className="w-3.5 h-3.5 text-emerald-600" />
              <span>8. Relatório CFO</span>
            </button>

            <button
              onClick={() => setActiveTab('tax')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'tax'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>9. Tributário & SPED</span>
            </button>

            <button
              onClick={() => setActiveTab('treasury')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'treasury'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>10. Tesouraria D+90</span>
            </button>

            <button
              onClick={() => setActiveTab('fpa')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'fpa'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>11. FP&A & Budget</span>
            </button>

            <button
              onClick={() => setActiveTab('forensics')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'forensics'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5 text-rose-600" />
              <span>12. Forense & SOX</span>
            </button>

            <button
              onClick={() => setActiveTab('esg')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'esg'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>13. ESG Carbono</span>
            </button>

            <button
              onClick={() => setActiveTab('erp')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'erp'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>14. ERPs & CND</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'benchmarks'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>15. Benchmarks</span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'tools'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-violet-600" />
              <span>16. Function Calling</span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === 'chart'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Plano Contas</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Faturas ({documentCount})</span>
            </button>
          </nav>

          {/* Right Action: AI Settings, Integrations Hub & Real-Time Audit Notifications */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-200 ml-2">
            <button
              onClick={onOpenAiSettings}
              className="relative p-2 px-2.5 rounded-xl transition-all flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-xs cursor-pointer"
              title="Configurar Motor IA Gemini 2.5 & Diagnóstico de Saúde"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold hidden xl:inline">IA: Gemini 2.5</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              onClick={onOpenIntegrationsHub}
              className="relative p-2 px-2.5 rounded-xl transition-all flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-xs cursor-pointer"
              title="Hub de APIs Públicas Gratuitas (BrasilAPI, AwesomeAPI, BACEN, ANBIMA)"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold hidden xl:inline">APIs Gratuitas</span>
            </button>

            <button
              onClick={onOpenNotifications}
              className={`relative p-2 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                unreadCount > 0
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-xs animate-bounce-subtle'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title="Abrir Central de Monitoramento em Tempo Real"
            >
              <div className="relative">
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-rose-600' : 'text-slate-600'}`} />
                {isConnected && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </div>
              <span className="text-xs font-bold hidden xl:inline">
                {unreadCount > 0 ? `${unreadCount} alerta${unreadCount > 1 ? 's' : ''}` : 'Monitor'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-rose-600 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
