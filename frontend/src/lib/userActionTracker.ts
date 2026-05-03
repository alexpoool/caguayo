const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const userActionTracker = {
  track: async (modulo: string, accion: string, detalle?: any) => {
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
          nivel: 'INFO',
          tipo: 'ACTION',
          mensaje: `${modulo}: ${accion}`,
          detalle: detalle ? JSON.stringify(detalle).substring(0, 2000) : null,
          navegador: navigator.userAgent.substring(0, 100),
          usuario_id: user?.id_usuario,
          usuario_nombre: user?.nombre,
        }),
      });
    } catch (e) {
      console.error('Error tracking action:', e);
    }
  },
  
  trackError: async (mensaje: string, detalle?: string) => {
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
          nivel: 'ERROR',
          tipo: 'FRONTEND',
          mensaje,
          detalle: detalle?.substring(0, 2000),
          navegador: navigator.userAgent.substring(0, 100),
          usuario_id: user?.id_usuario,
          usuario_nombre: user?.nombre,
        }),
      });
    } catch (e) {
      console.error('Error tracking error:', e);
    }
  },
};

export default userActionTracker;