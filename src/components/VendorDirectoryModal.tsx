import React, { useState } from 'react';
import { Building2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Plus, Search } from 'lucide-react';
import { MASTER_VENDORS } from '../../server/validationEngine.js';
import { VendorMaster } from '../types/finance.js';

export const VendorDirectoryModal: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vendors] = useState<VendorMaster[]>(MASTER_VENDORS);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Base de Fornecedores Homologados & Compliance (Passo 5)
            </h3>
            <p className="text-xs text-slate-500">
              Catálogo corporativo consultado automaticamente para verificação de idoneidade e bloqueios fiscais.
            </p>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por razão social, CNPJ ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((vendor) => {
          const isApproved = vendor.status === 'approved';
          const isBlocked = vendor.status === 'blocked';

          return (
            <div
              key={vendor.id}
              className={`p-4 rounded-xl border transition-all ${
                isBlocked
                  ? 'border-rose-200 bg-rose-50/40 ring-1 ring-rose-300/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-400">{vendor.id}</span>
                {isApproved ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    Homologado
                  </span>
                ) : isBlocked ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                    <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                    Bloqueado
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                    Em Análise
                  </span>
                )}
              </div>

              <h4 className="font-bold text-sm text-slate-900 leading-snug">
                {vendor.name}
              </h4>
              <div className="text-xs font-mono text-slate-600 mt-1">
                CNPJ/Tax ID: {vendor.taxId}
              </div>
              <div className="text-xs text-indigo-700 font-medium mt-1">
                Categoria: {vendor.category}
              </div>

              {vendor.notes && (
                <div
                  className={`mt-2.5 p-2 rounded-lg text-[11px] leading-relaxed border ${
                    isBlocked
                      ? 'bg-rose-100/60 text-rose-900 border-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-100'
                  }`}
                >
                  {vendor.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
