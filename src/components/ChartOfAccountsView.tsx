import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import {
  ChartOfAccountItem,
  AccountingPolicy,
  AccountingPeriod,
  CorporateEntity,
} from '../types/finance.js';
import { safeFetchJson } from '../utils/api.js';

export const ChartOfAccountsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'accounts' | 'policies' | 'periods' | 'entities'>('accounts');
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);
  const [policies, setPolicies] = useState<AccountingPolicy[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [entities, setEntities] = useState<CorporateEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    safeFetchJson<{ success: boolean; accounts: ChartOfAccountItem[] }>('/api/chart-of-accounts')
      .then((res) => res.success && res.data?.accounts && setAccounts(res.data.accounts));

    safeFetchJson<{ success: boolean; policies: AccountingPolicy[] }>('/api/accounting-policies')
      .then((res) => res.success && res.data?.policies && setPolicies(res.data.policies));

    safeFetchJson<{ success: boolean; periods: AccountingPeriod[] }>('/api/accounting-periods')
      .then((res) => res.success && res.data?.periods && setPeriods(res.data.periods));

    safeFetchJson<{ success: boolean; entities: CorporateEntity[] }>('/api/corporate-entities')
      .then((res) => res.success && res.data?.entities && setEntities(res.data.entities));
  }, []);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.code.includes(searchTerm) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Parâmetros Contábeis: Plano de Contas, Políticas & Períodos
          </h2>
          <p className="text-xs text-slate-500">
            Regras mestras que regem a classificação e as rejeições automáticas de lançamentos.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setSubTab('accounts')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'accounts' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Plano de Contas ({accounts.length})
          </button>
          <button
            onClick={() => setSubTab('policies')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'policies' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Políticas ({policies.length})
          </button>
          <button
            onClick={() => setSubTab('periods')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'periods' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Períodos ({periods.length})
          </button>
          <button
            onClick={() => setSubTab('entities')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === 'entities' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entidades ({entities.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PLANO DE CONTAS */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar contas por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-500">
              Regra 1: A IA nunca cria contas novas fora desta lista.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAccounts.map((acc) => (
              <div
                key={acc.code}
                className={`p-3.5 rounded-xl border text-xs ${
                  acc.isActive ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {acc.code}
                  </span>
                  {acc.isActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ATIVA
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      INATIVA (Rejeição Automática)
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-900 leading-snug">{acc.name}</h4>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Grupo: {acc.type}</div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{acc.description}</p>
                {acc.permittedDimensions && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {acc.permittedDimensions.map((d, di) => (
                      <span key={di} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: POLÍTICAS CONTÁBEIS */}
      {subTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((pol) => (
            <div
              key={pol.policy_id}
              className={`p-4 rounded-xl border text-xs ${
                pol.isActive ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-indigo-700">{pol.policy_id}</span>
                {pol.isActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    VIGENTE
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    NÃO VIGENTE / EXPIRADA (Rejeição Automática)
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{pol.title}</h4>
              <p className="text-slate-600 mt-1">{pol.summary}</p>
              <div className="mt-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Regras da Política:</span>
                {pol.rules.map((r, ri) => (
                  <div key={ri} className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded">
                    • {r}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 3: PERÍODOS CONTÁBEIS */}
      {subTab === 'periods' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {periods.map((per) => (
            <div
              key={per.period_id}
              className={`p-4 rounded-xl border text-xs ${
                per.status === 'open' ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-slate-700">{per.period_id}</span>
                {per.status === 'open' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    ABERTO
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    FECHADO (Rejeição Automática)
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{per.name}</h4>
              <div className="text-[11px] text-slate-500 mt-2 font-mono">
                {per.startDate} até {per.endDate}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 4: ENTIDADES CORPORATIVAS */}
      {subTab === 'entities' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {entities.map((ent) => (
            <div
              key={ent.id}
              className={`p-4 rounded-xl border text-xs ${
                ent.isAllowed ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-slate-500">{ent.id}</span>
                {ent.isAllowed ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    AUTORIZADA
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    NÃO PERMITIDA (Rejeição Automática)
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900">{ent.name}</h4>
              <div className="font-mono text-slate-500 mt-1">CNPJ: {ent.taxId}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
