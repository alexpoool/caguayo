import { apiClient } from '../lib/api';

const userActionTracker = {
  track: async (modulo: string, accion: string, detalle?: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      await apiClient.post('/logs', {
        nivel: 'INFO',
        tipo: 'ACTION',
        mensaje: `${modulo}: ${accion}`,
        detalle: detalle ? JSON.stringify(detalle).substring(0, 2000) : undefined,
        navegador: navigator.userAgent.substring(0, 100),
        usuario_id: user?.id_usuario,
        usuario_nombre: user?.nombre,
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
      
      await apiClient.post('/logs', {
        nivel: 'ERROR',
        tipo: 'FRONTEND',
        mensaje,
        detalle: detalle?.substring(0, 2000),
        navegador: navigator.userAgent.substring(0, 100),
        usuario_id: user?.id_usuario,
        usuario_nombre: user?.nombre,
      });
    } catch (e) {
      console.error('Error tracking error:', e);
    }
  },
};

export default userActionTracker;