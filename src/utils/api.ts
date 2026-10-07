/**
 * Safe API request utility that protects against unexpected HTML responses
 * (e.g. <!doctype html> from proxy 502/504, Vite SPA fallback, or Express HTML errors)
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  retries = 1
): Promise<ApiResponse<T>> {
  const mergedHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  const reqOptions: RequestInit = {
    ...options,
    headers: mergedHeaders,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, reqOptions);
      const status = res.status;
      const rawText = await res.text();

      // Check if the response body is HTML (<!doctype, <html, or starts with '<')
      const trimmed = (rawText || '').trim();
      const isHtml =
        trimmed.startsWith('<') ||
        trimmed.toLowerCase().includes('<!doctype') ||
        trimmed.toLowerCase().includes('<html');

      if (isHtml) {
        let errorMsg = `Resposta inesperada do servidor (HTTP ${status}).`;
        if (status === 404) {
          errorMsg = `Endpoint não encontrado (404): ${url}`;
        } else if (status === 502 || status === 504 || status === 503) {
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          errorMsg = `Servidor em inicialização ou temporariamente indisponível (HTTP ${status}).`;
        } else {
          errorMsg = `O servidor retornou uma página HTML em vez de dados JSON (HTTP ${status}).`;
        }

        return {
          success: false,
          error: errorMsg,
          status,
        };
      }

      // If empty response
      if (!trimmed) {
        if (res.ok) {
          return {
            success: true,
            data: {} as T,
            status,
          };
        }
        return {
          success: false,
          error: `Resposta vazia do servidor (HTTP ${status}).`,
          status,
        };
      }

      // Safely parse JSON from text without throwing uncaught SyntaxErrors
      let data: any;
      try {
        data = JSON.parse(trimmed);
      } catch {
        return {
          success: false,
          error: `Resposta do servidor não pôde ser interpretada como JSON (HTTP ${status}).`,
          status,
        };
      }

      if (!res.ok) {
        return {
          success: false,
          data,
          error: data?.error || `Erro HTTP ${status}: ${res.statusText}`,
          status,
        };
      }

      return {
        success: true,
        data,
        error: data?.error,
        status,
      };
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      return {
        success: false,
        error: err?.message || 'Falha de conexão com o servidor de auditoria.',
        status: 0,
      };
    }
  }

  return {
    success: false,
    error: 'Tempo limite esgotado ao contatar o servidor.',
    status: 0,
  };
}
