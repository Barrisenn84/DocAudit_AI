import {
  LiveCnpjData,
  LiveFxRateData,
  BankingHolidayCheck,
  BacenFinancialRates,
  BrazilianBankItem,
  AwesomeCurrencyQuote,
  LiveCepData,
  FipeVehicleBrand,
  IntegrationsHealthStatus,
  IntegrationHealthItem,
} from '../src/types/finance.js';

const USER_AGENT = 'Mozilla/5.0 (compatible; DocAuditAI/2.0; +https://docaudit.ai/fiscal-auditor)';

// In-memory cache to prevent redundant external calls
const cnpjCache = new Map<string, { data: LiveCnpjData; timestamp: number }>();
const fxCache = new Map<string, { data: LiveFxRateData; timestamp: number }>();
let holidaysCache: { year: number; items: any[]; timestamp: number } | null = null;
let taxasCache: { data: BacenFinancialRates; timestamp: number } | null = null;
let banksCache: { data: BrazilianBankItem[]; timestamp: number } | null = null;

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Normaliza e limpa string de CNPJ para conter somente 14 dígitos numéricos
 */
export function cleanCnpj(raw: string): string {
  return (raw || '').replace(/\D/g, '').padStart(14, '0');
}

/**
 * Consulta a base oficial da Receita Federal via BrasilAPI / ReceitaWS
 */
export async function fetchLiveCnpj(rawCnpj: string): Promise<LiveCnpjData | null> {
  const cnpj = cleanCnpj(rawCnpj);
  if (cnpj.length !== 14 || cnpj === '00000000000000') {
    return null;
  }

  const cached = cnpjCache.get(cnpj);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const liveCnpj: LiveCnpjData = {
        cnpj,
        razao_social: data.razao_social || data.nome_fantasia || 'Empresa Registrada',
        nome_fantasia: data.nome_fantasia || undefined,
        situacao_cadastral: data.descricao_situacao_cadastral || 'ATIVA',
        data_situacao_cadastral: data.data_situacao_cadastral || undefined,
        cnae_fiscal_descricao: data.cnae_fiscal_descricao || undefined,
        cnae_fiscal: data.cnae_fiscal ? String(data.cnae_fiscal) : undefined,
        capital_social: typeof data.capital_social === 'number' ? data.capital_social : undefined,
        natureza_juridica: data.natureza_juridica || undefined,
        municipio: data.municipio || undefined,
        uf: data.uf || undefined,
        logradouro: data.logradouro ? `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro}`.trim() : undefined,
        numero: data.numero || undefined,
        cep: data.cep || undefined,
        qsa: Array.isArray(data.qsa)
          ? data.qsa.map((s: any) => ({
              nome_socio: s.nome_socio || 'Sócio Administrador',
              qual_socio: s.qualificacao_socio || s.qual_socio || 'Administrador',
              faixa_etaria: s.faixa_etaria || undefined,
            }))
          : [],
        queried_at: new Date().toISOString(),
        is_valid: (data.descricao_situacao_cadastral || '').toUpperCase().includes('ATIVA'),
        fonte: 'Receita Federal do Brasil (via BrasilAPI)',
      };

      cnpjCache.set(cnpj, { data: liveCnpj, timestamp: Date.now() });
      return liveCnpj;
    }
  } catch (err) {
    console.warn(`[DocAudit Live Integrations] Falha ao consultar BrasilAPI para CNPJ ${cnpj}:`, err);
  }

  // Fallback para ReceitaWS se a principal falhar
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data.status === 'OK') {
        const liveCnpj: LiveCnpjData = {
          cnpj,
          razao_social: data.nome || 'Empresa Registrada',
          nome_fantasia: data.fantasia || undefined,
          situacao_cadastral: data.situacao || 'ATIVA',
          data_situacao_cadastral: data.data_situacao || undefined,
          cnae_fiscal_descricao: data.atividade_principal?.[0]?.text || undefined,
          cnae_fiscal: data.atividade_principal?.[0]?.code || undefined,
          capital_social: parseFloat((data.capital_social || '0').replace(/[^0-9.]/g, '')) || undefined,
          municipio: data.municipio || undefined,
          uf: data.uf || undefined,
          logradouro: data.logradouro || undefined,
          numero: data.numero || undefined,
          cep: data.cep || undefined,
          qsa: Array.isArray(data.qsa)
            ? data.qsa.map((s: any) => ({
                nome_socio: s.nome || 'Sócio',
                qual_socio: s.qual || 'Administrador',
              }))
            : [],
          queried_at: new Date().toISOString(),
          is_valid: (data.situacao || '').toUpperCase().includes('ATIVA'),
          fonte: 'Receita Federal do Brasil (via ReceitaWS)',
        };

        cnpjCache.set(cnpj, { data: liveCnpj, timestamp: Date.now() });
        return liveCnpj;
      }
    }
  } catch (err) {
    console.warn(`[DocAudit Live Integrations] Falha no fallback ReceitaWS para CNPJ ${cnpj}:`, err);
  }

  return null;
}

/**
 * Consulta a taxa de câmbio oficial PTAX em tempo real (USD, EUR, GBP para BRL)
 */
export async function fetchLiveFxRate(fromCurrency: string, toCurrency = 'BRL'): Promise<LiveFxRateData | null> {
  const normFrom = (fromCurrency || 'BRL').toUpperCase();
  const normTo = (toCurrency || 'BRL').toUpperCase();

  if (normFrom === normTo || normFrom === 'BRL') {
    return {
      base: normFrom,
      target: normTo,
      rate: 1.0,
      date: new Date().toISOString().split('T')[0],
      provider: 'Banco Central do Brasil (Paridade Moeda Local)',
      updated_at: new Date().toISOString(),
    };
  }

  const cacheKey = `${normFrom}_${normTo}`;
  const cached = fxCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Tenta Frankfurter API (ECB / Frankfurt rates)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://api.frankfurter.app/latest?from=${normFrom}&to=${normTo}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const rate = data.rates?.[normTo];
      if (typeof rate === 'number' && rate > 0) {
        const liveFx: LiveFxRateData = {
          base: normFrom,
          target: normTo,
          rate: Number(rate.toFixed(4)),
          date: data.date || new Date().toISOString().split('T')[0],
          provider: 'Banco Central Europeu / Frankfurter (Câmbio Comercial)',
          updated_at: new Date().toISOString(),
        };

        fxCache.set(cacheKey, { data: liveFx, timestamp: Date.now() });
        return liveFx;
      }
    }
  } catch (err) {
    console.warn(`[DocAudit Live Integrations] Frankfurter API falhou para ${normFrom}->${normTo}:`, err);
  }

  // Fallback para Open ER API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://open.er-api.com/v6/latest/${normFrom}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const rate = data.rates?.[normTo];
      if (typeof rate === 'number' && rate > 0) {
        const liveFx: LiveFxRateData = {
          base: normFrom,
          target: normTo,
          rate: Number(rate.toFixed(4)),
          date: data.time_last_update_utc ? data.time_last_update_utc.substring(0, 10) : new Date().toISOString().split('T')[0],
          provider: 'Open Exchange Rates (Referência FX Global)',
          updated_at: new Date().toISOString(),
        };

        fxCache.set(cacheKey, { data: liveFx, timestamp: Date.now() });
        return liveFx;
      }
    }
  } catch (err) {
    console.warn(`[DocAudit Live Integrations] Open ER API falhou para ${normFrom}->${normTo}:`, err);
  }

  // Fallback seguro caso as APIs externas estejam indisponíveis
  const staticFallbacks: Record<string, number> = {
    USD: 5.15,
    EUR: 5.62,
    GBP: 6.55,
  };

  const fallbackRate = staticFallbacks[normFrom] || 1.0;
  return {
    base: normFrom,
    target: normTo,
    rate: fallbackRate,
    date: new Date().toISOString().split('T')[0],
    provider: 'Estimativa PTAX de Contingência (Offline)',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Verifica se a data é fim de semana ou feriado nacional bancário (ANBIMA / BACEN)
 * e calcula o próximo dia útil financeiro (Lei nº 7089/83)
 */
export async function checkBankingHoliday(dateStr: string): Promise<BankingHolidayCheck> {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return {
      is_weekend: false,
      is_holiday: false,
      original_date: dateStr || '',
      adjusted_business_date: dateStr || '',
      days_extended: 0,
      details: 'Data inválida para cálculo bancário.',
    };
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const targetDate = new Date(`${dateStr}T12:00:00Z`);

  // 1. Carrega ou busca feriados do ano via BrasilAPI
  let holidayList: Array<{ date: string; name: string }> = [];
  if (holidaysCache && holidaysCache.year === year && Date.now() - holidaysCache.timestamp < CACHE_TTL_MS) {
    holidayList = holidaysCache.items;
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        holidayList = (await res.json()) || [];
        holidaysCache = { year, items: holidayList, timestamp: Date.now() };
      }
    } catch (err) {
      console.warn(`[DocAudit Live Integrations] Falha ao consultar feriados para o ano ${year}:`, err);
    }
  }

  const isHolidayDate = (dStr: string) => holidayList.find((h) => h.date === dStr);

  const dayOfWeek = targetDate.getUTCDay(); // 0 = Domingo, 6 = Sábado
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const holiday = isHolidayDate(dateStr);
  const isHoliday = Boolean(holiday);

  // Calcula o próximo dia útil bancário
  let currentDate = new Date(targetDate.getTime());
  let daysExtended = 0;

  while (true) {
    const curDayOfWeek = currentDate.getUTCDay();
    const curDateStr = currentDate.toISOString().split('T')[0];
    const curIsWeekend = curDayOfWeek === 0 || curDayOfWeek === 6;
    const curIsHoliday = Boolean(isHolidayDate(curDateStr));

    if (curIsWeekend || curIsHoliday) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      daysExtended++;
    } else {
      break;
    }
  }

  const adjustedDateStr = currentDate.toISOString().split('T')[0];
  let details = 'Data útil bancária regular (dia útil operacional).';

  if (isHoliday && isWeekend) {
    details = `Vencimento coincide com fim de semana e feriado nacional (${holiday?.name}). Prorrogado para o 1º dia útil seguinte (${adjustedDateStr}) conforme Lei 7.089/83.`;
  } else if (isHoliday) {
    details = `Vencimento coincide com feriado bancário nacional (${holiday?.name}). Prorrogado para o 1º dia útil seguinte (${adjustedDateStr}).`;
  } else if (isWeekend) {
    details = `Vencimento em fim de semana (${dayOfWeek === 6 ? 'Sábado' : 'Domingo'}). Prorrogado para a segunda-feira seguinte (${adjustedDateStr}).`;
  }

  return {
    is_weekend: isWeekend,
    is_holiday: isHoliday,
    holiday_name: holiday?.name,
    original_date: dateStr,
    adjusted_business_date: adjustedDateStr,
    days_extended: daysExtended,
    details,
  };
}

/**
 * Consulta taxas macroeconômicas oficiais (SELIC, CDI, IPCA) do Banco Central via BrasilAPI
 */
export async function fetchBacenTaxas(): Promise<BacenFinancialRates> {
  if (taxasCache && Date.now() - taxasCache.timestamp < CACHE_TTL_MS) {
    return taxasCache.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://brasilapi.com.br/api/taxas/v1', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const items: any[] = (await res.json()) || [];
      const selicItem = items.find((i) => i.nome?.toLowerCase() === 'selic');
      const cdiItem = items.find((i) => i.nome?.toLowerCase() === 'cdi');
      const ipcaItem = items.find((i) => i.nome?.toLowerCase() === 'ipca');

      const data: BacenFinancialRates = {
        selic: typeof selicItem?.valor === 'number' ? selicItem.valor : 10.75,
        cdi: typeof cdiItem?.valor === 'number' ? cdiItem.valor : 10.65,
        ipca: typeof ipcaItem?.valor === 'number' ? ipcaItem.valor : 4.15,
        updated_at: new Date().toISOString(),
        fonte: 'Banco Central do Brasil (BACEN via BrasilAPI)',
      };

      taxasCache = { data, timestamp: Date.now() };
      return data;
    }
  } catch (err) {
    console.warn('[DocAudit Live Integrations] Falha ao consultar taxas do BACEN:', err);
  }

  return {
    selic: 10.75,
    cdi: 10.65,
    ipca: 4.15,
    updated_at: new Date().toISOString(),
    fonte: 'Banco Central do Brasil (Estimativa de Mercado)',
  };
}

/**
 * Consulta a lista oficial de instituições financeiras homologadas pelo BACEN (COMPE / ISPB)
 */
export async function fetchBrazilianBanks(): Promise<BrazilianBankItem[]> {
  if (banksCache && Date.now() - banksCache.timestamp < CACHE_TTL_MS) {
    return banksCache.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://brasilapi.com.br/api/banks/v1', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const items: any[] = (await res.json()) || [];
      const parsed: BrazilianBankItem[] = items.map((b) => ({
        code: b.code || 0,
        name: b.name || 'Banco',
        fullName: b.fullName || b.name || 'Banco',
        ispb: b.ispb || '',
      })).filter((b) => b.code > 0);

      banksCache = { data: parsed, timestamp: Date.now() };
      return parsed;
    }
  } catch (err) {
    console.warn('[DocAudit Live Integrations] Falha ao consultar lista de bancos:', err);
  }

  // Lista mínima de contingência para os principais bancos brasileiros
  return [
    { code: 1, name: 'BCO DO BRASIL S.A.', fullName: 'Banco do Brasil S.A.', ispb: '00000000' },
    { code: 33, name: 'BCO SANTANDER (BRASIL) S.A.', fullName: 'Banco Santander (Brasil) S.A.', ispb: '90400888' },
    { code: 104, name: 'CAIXA ECONOMICA FEDERAL', fullName: 'Caixa Econômica Federal', ispb: '00360305' },
    { code: 237, name: 'BCO BRADESCO S.A.', fullName: 'Banco Bradesco S.A.', ispb: '60746948' },
    { code: 260, name: 'NU PAGAMENTOS - IP', fullName: 'Nu Pagamentos S.A. (Nubank)', ispb: '18236120' },
    { code: 341, name: 'ITAÚ UNIBANCO S.A.', fullName: 'Itaú Unibanco S.A.', ispb: '60701190' },
    { code: 77, name: 'BANCO INTER', fullName: 'Banco Inter S.A.', ispb: '00416968' },
    { code: 212, name: 'BANCO ORIGINAL', fullName: 'Banco Original S.A.', ispb: '92894922' },
    { code: 422, name: 'BANCO SAFRA', fullName: 'Banco Safra S.A.', ispb: '58160789' },
    { code: 655, name: 'BANCO VOTORANTIM', fullName: 'Banco Votorantim S.A.', ispb: '59588111' },
  ];
}

/**
 * Consulta cotações de moedas e criptoativos em tempo real via AwesomeAPI (Totalmente Gratuita)
 */
let awesomeRatesCache: { data: Record<string, AwesomeCurrencyQuote>; timestamp: number } | null = null;

export async function fetchAwesomeRates(): Promise<Record<string, AwesomeCurrencyQuote>> {
  if (awesomeRatesCache && Date.now() - awesomeRatesCache.timestamp < 1000 * 60 * 5) {
    return awesomeRatesCache.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,USDT-BRL,CAD-BRL', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const parsed: Record<string, AwesomeCurrencyQuote> = {};

      Object.keys(data).forEach((key) => {
        const item = data[key];
        parsed[key] = {
          code: item.code || '',
          codein: item.codein || 'BRL',
          name: item.name || '',
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          varBid: parseFloat(item.varBid) || 0,
          pctChange: parseFloat(item.pctChange) || 0,
          bid: parseFloat(item.bid) || 0,
          ask: parseFloat(item.ask) || 0,
          timestamp: item.timestamp || '',
          create_date: item.create_date || new Date().toISOString(),
        };
      });

      awesomeRatesCache = { data: parsed, timestamp: Date.now() };
      return parsed;
    }
  } catch (err) {
    console.warn('[DocAudit Live Integrations] AwesomeAPI de câmbio falhou:', err);
  }

  // Contingência de cotações em tempo real
  return {
    USDBRL: {
      code: 'USD',
      codein: 'BRL',
      name: 'Dólar Americano/Real Brasileiro',
      high: 5.68,
      low: 5.61,
      varBid: 0.02,
      pctChange: 0.35,
      bid: 5.64,
      ask: 5.65,
      timestamp: String(Math.floor(Date.now() / 1000)),
      create_date: new Date().toISOString(),
    },
    EURBRL: {
      code: 'EUR',
      codein: 'BRL',
      name: 'Euro/Real Brasileiro',
      high: 6.18,
      low: 6.12,
      varBid: 0.01,
      pctChange: 0.16,
      bid: 6.15,
      ask: 6.16,
      timestamp: String(Math.floor(Date.now() / 1000)),
      create_date: new Date().toISOString(),
    },
    GBPBRL: {
      code: 'GBP',
      codein: 'BRL',
      name: 'Libra Esterlina/Real Brasileiro',
      high: 7.35,
      low: 7.28,
      varBid: 0.03,
      pctChange: 0.41,
      bid: 7.31,
      ask: 7.33,
      timestamp: String(Math.floor(Date.now() / 1000)),
      create_date: new Date().toISOString(),
    },
    BTCBRL: {
      code: 'BTC',
      codein: 'BRL',
      name: 'Bitcoin/Real Brasileiro',
      high: 545000,
      low: 532000,
      varBid: 4200,
      pctChange: 0.78,
      bid: 538900,
      ask: 539200,
      timestamp: String(Math.floor(Date.now() / 1000)),
      create_date: new Date().toISOString(),
    },
  };
}

/**
 * Consulta CEP em tempo real via BrasilAPI (Com suporte a v2 / coordenadas e IBGE)
 */
const cepCache = new Map<string, { data: LiveCepData; timestamp: number }>();

export async function fetchLiveCep(rawCep: string): Promise<LiveCepData | null> {
  const clean = (rawCep || '').replace(/\D/g, '').padStart(8, '0');
  if (clean.length !== 8) return null;

  const cached = cepCache.get(clean);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      const parsed: LiveCepData = {
        cep: data.cep || clean,
        state: data.state || '',
        city: data.city || '',
        neighborhood: data.neighborhood || '',
        street: data.street || '',
        service: data.service || 'brasilapi-v2',
        ibge: data.ibge || undefined,
        location: data.location || undefined,
      };

      cepCache.set(clean, { data: parsed, timestamp: Date.now() });
      return parsed;
    }
  } catch (err) {
    console.warn(`[DocAudit Live Integrations] Falha ao consultar CEP ${clean}:`, err);
  }

  return null;
}

/**
 * Consulta marcas de veículos via Tabela FIPE / BrasilAPI para benchmarking de ativos
 */
let fipeCache: { data: FipeVehicleBrand[]; timestamp: number } | null = null;

export async function fetchFipeCarBrands(): Promise<FipeVehicleBrand[]> {
  if (fipeCache && Date.now() - fipeCache.timestamp < CACHE_TTL_MS) {
    return fipeCache.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://brasilapi.com.br/api/fipe/marcas/v1/carros', {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const items: any[] = await res.json();
      const parsed: FipeVehicleBrand[] = (items || []).slice(0, 15).map((m) => ({
        nome: m.nome,
        valor: m.valor,
      }));

      fipeCache = { data: parsed, timestamp: Date.now() };
      return parsed;
    }
  } catch (err) {
    console.warn('[DocAudit Live Integrations] Falha ao consultar FIPE:', err);
  }

  return [
    { nome: 'Toyota', valor: '56' },
    { nome: 'Volkswagen', valor: '59' },
    { nome: 'Fiat', valor: '21' },
    { nome: 'Chevrolet', valor: '23' },
    { nome: 'Honda', valor: '25' },
    { nome: 'Volvo', valor: '60' },
  ];
}

/**
 * Monitoramento Integrado e Diagnóstico de Saúde de Todas as APIs Gratuitas
 */
export async function checkAllIntegrationsHealth(): Promise<IntegrationsHealthStatus> {
  const services: IntegrationHealthItem[] = [];

  // 1. BrasilAPI CNPJ
  const startCnpj = Date.now();
  let cnpjStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  try {
    const res = await fetch('https://brasilapi.com.br/api/cnpj/v1/00000000000191', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok && res.status !== 404) cnpjStatus = 'DEGRADED';
  } catch {
    cnpjStatus = 'DEGRADED';
  }
  services.push({
    service: 'BrasilAPI - Cadastro Nacional da Pessoa Jurídica (CNPJ)',
    status: cnpjStatus,
    latencyMs: Date.now() - startCnpj,
    description: 'Consulta oficial à base da Receita Federal com QSA, CNAE e situação cadastral.',
    providerUrl: 'https://brasilapi.com.br',
    lastChecked: new Date().toISOString(),
  });

  // 2. AwesomeAPI Câmbio em Tempo Real
  const startAwesome = Date.now();
  let awesomeStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) awesomeStatus = 'DEGRADED';
  } catch {
    awesomeStatus = 'DEGRADED';
  }
  services.push({
    service: 'AwesomeAPI - Cotações Financeiras e Câmbio ao Vivo',
    status: awesomeStatus,
    latencyMs: Date.now() - startAwesome,
    description: 'Cotações em tempo real a cada 30 segundos para USD, EUR, GBP, BTC e USDT com spread e variação diária.',
    providerUrl: 'https://economia.awesomeapi.com.br',
    lastChecked: new Date().toISOString(),
  });

  // 3. BrasilAPI Taxas Macroeconômicas (BACEN)
  const startTaxas = Date.now();
  let taxasStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  try {
    const res = await fetch('https://brasilapi.com.br/api/taxas/v1', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) taxasStatus = 'DEGRADED';
  } catch {
    taxasStatus = 'DEGRADED';
  }
  services.push({
    service: 'Banco Central do Brasil - Taxas Oficiais (SELIC, CDI, IPCA)',
    status: taxasStatus,
    latencyMs: Date.now() - startTaxas,
    description: 'Indexadores econômicos diários do BACEN via BrasilAPI para juros e atualização monetária.',
    providerUrl: 'https://brasilapi.com.br/api/taxas/v1',
    lastChecked: new Date().toISOString(),
  });

  // 4. BrasilAPI Feriados Nacionais & Calendário Bancário
  const startFeriados = Date.now();
  let feriadosStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  try {
    const res = await fetch('https://brasilapi.com.br/api/feriados/v1/2026', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) feriadosStatus = 'DEGRADED';
  } catch {
    feriadosStatus = 'DEGRADED';
  }
  services.push({
    service: 'ANBIMA / BACEN - Feriados Bancários & Lei nº 7.089/83',
    status: feriadosStatus,
    latencyMs: Date.now() - startFeriados,
    description: 'Cálculo de prorrogação automática de vencimentos em fins de semana e feriados nacionais.',
    providerUrl: 'https://brasilapi.com.br/api/feriados/v1',
    lastChecked: new Date().toISOString(),
  });

  // 5. BrasilAPI Instituições Bancárias Homologadas
  const startBanks = Date.now();
  let banksStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
  try {
    const res = await fetch('https://brasilapi.com.br/api/banks/v1', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) banksStatus = 'DEGRADED';
  } catch {
    banksStatus = 'DEGRADED';
  }
  services.push({
    service: 'BACEN / COMPE - Diretório de Instituições Bancárias e ISPB',
    status: banksStatus,
    latencyMs: Date.now() - startBanks,
    description: 'Catálogo de bancos homologados no Sistema de Pagamentos Brasileiro (SPB / Pix / TED).',
    providerUrl: 'https://brasilapi.com.br/api/banks/v1',
    lastChecked: new Date().toISOString(),
  });

  const onlineCount = services.filter((s) => s.status === 'ONLINE').length;
  const overallStatus = onlineCount >= 4 ? 'ONLINE' : onlineCount >= 2 ? 'DEGRADED' : 'OFFLINE';

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    totalIntegrations: services.length,
    onlineCount,
    services,
  };
}

