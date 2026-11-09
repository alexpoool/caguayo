import { API_BASE_URL } from '@/config/api';
const LOGIN_PATH = '/login';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const BASE_DATOS_KEY = 'auth_base_datos';

let redirectingToLogin = false;

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function redirectToLoginOnce(): void {
  if (redirectingToLogin || typeof window === 'undefined') return;
  if (window.location.pathname === LOGIN_PATH) return;
  redirectingToLogin = true;
  window.location.assign(LOGIN_PATH);
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    onHeaders?: (headers: Headers) => void
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    // `headers` va DESPUÉS del resto a propósito. Con `{ headers, ...options }`
    // las cabeceras propias de la llamada se impongan sobre las ya calculadas y
    // se pierden el Content-Type y, sobre todo, el Authorization: la subida de
    // ficheros salía sin autenticar.
    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      onHeaders?.(response.headers);

      if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
        authHelpers.clearAuth();
        redirectToLoginOnce();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);

        let errorMessage = `HTTP error! status: ${response.status}`;

        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => {
                const field = err.loc?.slice(1).join('.') || 'unknown';
                return `${field}: ${err.msg}`;
              })
              .join('\n');
          } else {
            errorMessage = errorData.detail;
          }
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      redirectingToLogin = false;

      // Handle 204 No Content responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>, onHeaders?: (headers: Headers) => void): Promise<T> {
    let url = endpoint;
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      url += `?${queryParams.toString()}`;
    }
    return this.request<T>(url, {}, onHeaders);
  }

  /**
   * `opts.raw` envía el cuerpo tal cual, sin pasar por JSON.stringify. Hace
   * falta para la subida de ficheros: un ArrayBuffer pasado por JSON.stringify
   * sale convertido en un objeto con las claves "0", "1"... en vez de los
   * bytes. Por defecto sigue haciendo JSON, como antes.
   */
  async post<T>(
    endpoint: string,
    data?: any,
    opts: { raw?: boolean; headers?: Record<string, string> } = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: opts.raw ? data : JSON.stringify(data),
      ...(opts.headers ? { headers: opts.headers } : {}),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

// Auth helpers
export const authHelpers = {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    redirectingToLogin = false;
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  setUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser(): any | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  setBaseDatos(baseDatos: string): void {
    localStorage.setItem(BASE_DATOS_KEY, baseDatos);
  },

  getBaseDatos(): string | null {
    return localStorage.getItem(BASE_DATOS_KEY);
  },

  removeBaseDatos(): void {
    localStorage.removeItem(BASE_DATOS_KEY);
  },

  clearAuth(): void {
    this.removeToken();
    this.removeUser();
    this.removeBaseDatos();
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};
