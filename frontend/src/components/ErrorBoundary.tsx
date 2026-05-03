import { Component, ReactNode } from 'react';
import { apiClient } from '../lib/api';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    const errorDetails = error.stack || error.message || String(error);
    
    apiClient.post('/logs', {
      nivel: 'ERROR',
      tipo: 'FRONTEND',
      mensaje: `React Error: ${error.message}`,
      detalle: errorDetails.substring(0, 2000),
      navegador: navigator.userAgent.substring(0, 100),
    }).catch(console.error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="text-red-600 font-semibold text-lg mb-2">
              Ha ocurrido un error
            </div>
            <p className="text-gray-600 text-sm mb-4">
              La aplicación encontró un error inesperado. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}