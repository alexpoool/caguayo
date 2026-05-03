const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const BASE_DATOS_KEY = 'auth_base_datos';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async logApiCall(endpoint: string, method: string, status: number, duration: number) {
    if (endpoint.startsWith('/logs') || endpoint.startsWith('/auth/')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nivel: status >= 500 ? 'ERROR' : 'INFO',
          tipo: 'REQUEST',
          mensaje: `${method} ${endpoint} - ${status}`,
          detalle: JSON.stringify({ duration_ms: Math.round(duration * 1000) }),
          endpoint,
          method,
          status_code: status,
          navegador: navigator.userAgent.substring(0, 100),
          usuario_id: user?.id_usuario,
          usuario_nombre: user?.nombre,
        }),
      });
    } catch {}
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      const startTime = Date.now();
      const response = await fetch(url, config);
      const duration = (Date.now() - startTime) / 1000;
      
      this.logApiCall(endpoint, options.method || 'GET', response.status, duration);

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
        
        throw new Error(errorMessage);
      }

      // Handle 204 No Content responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
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
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
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
