import { apiClient } from '../lib/api';

export interface StockReportData {
    id_producto: number;
    codigo: string;
    nombre: string;
    stock_actual: string; 
}

export interface MovimientosReportData {
    id_movimiento: number;
    fecha: string;
    producto: string;
    tipo: string;
    cantidad: number;
    factor: number;
    dependencia: string;
    observacion: string;
    saldo: number;
}

export const reportesService = {
    getInventarioStock: async (idDependencia?: number, fechaCorte?: string) => {
        return await apiClient.get<StockReportData[]>('/reportes/inventario/stock', { 
            id_dependencia: idDependencia,
            fecha_corte: fechaCorte
        });
    },

    getInventarioMovimientos: async (filters: {
        fecha_inicio?: string;
        fecha_fin?: string;
        id_dependencia?: number;
        id_producto?: number;
    }) => {
        return await apiClient.get<MovimientosReportData[]>('/reportes/inventario/movimientos', filters);
    },

    downloadStockPdf: async (idDependencia?: number, fechaCorte?: string) => {
        return await apiClient.download('/reportes/inventario/stock/pdf', { 
            id_dependencia: idDependencia,
            fecha_corte: fechaCorte
        }, 'existencias_por_producto.pdf');
    },

    downloadMovimientosPdf: async (filters: {
        fecha_inicio?: string;
        fecha_fin?: string;
        id_dependencia?: number;
        id_producto?: number;
    }) => {
        return await apiClient.download('/reportes/inventario/movimientos/pdf', filters, 'reporte_movimientos.pdf');
    }
};
