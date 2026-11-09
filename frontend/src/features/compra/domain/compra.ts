import type {
  AnexoOperacionesDevolucion,
  AnexoOperacionesProducto,
  AnexoOperacionesResultado,
  Cliente,
  ClienteSimple,
  Cuenta,
  Moneda,
  Productos as Producto,
  Subcategorias as Subcategoria,
  TipoConvenio,
} from '@/types/index';
import type {
  FichaCostoInput,
  FichaCostoRead,
  FichaInsumoInput,
  FichaManoObraInput,
  FichaTarifa,
  FichaTarifaInput,
} from '@/types/fichaCosto';

export type {
  AnexoOperacionesDevolucion,
  AnexoOperacionesProducto,
  AnexoOperacionesResultado,
  Cliente,
  ClienteSimple,
  Cuenta,
  FichaCostoInput,
  FichaCostoRead,
  FichaInsumoInput,
  FichaManoObraInput,
  FichaTarifa,
  FichaTarifaInput,
  Moneda,
  Producto,
  Subcategoria,
  TipoConvenio,
};

export interface Convenio {
  id_convenio: number;
  codigo?: string;
  codigo_convenio?: string;
  id_cliente: number;
  nombre_convenio: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio: number;
  cliente?: ClienteSimple;
  tipo_convenio?: TipoConvenio;
}

export interface AnexoItem {
  id_item_anexo: number;
  id_producto: number;
  entrada: number;
  vendido?: number;
  precio_compra: number;
  precio_venta: number;
  id_moneda: number;
  codigo?: string;
  producto?: { id_producto: number; nombre: string; codigo?: string };
  precios?: {
    id_moneda: number;
    precio_venta: number;
    precio_compra?: number;
  }[];
}

export interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  codigo_anexo?: string;
  numero_anexo?: string;
  id_dependencia?: number | null;
  comision?: number;
  dependencia_nombre?: string;
  id_producto?: number | null;
  convenios?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo?: string;
  };
  anexo_convenio?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo_anexo?: string;
  };
  items_anexo?: AnexoItem[];
}

export interface ProductosEnLiquidacion {
  id_producto_en_liquidacion: number;
  codigo: string;
  id_producto: number;
  cantidad: number;
  precio: number;
  id_moneda: number;
  tipo_compra: 'FACTURA' | 'VENTA_EFECTIVO' | 'ANEXO';
  id_factura?: number;
  id_venta_efectivo?: number;
  id_anexo?: number;
  liquidada: boolean;
  fecha: string;
  fecha_liquidacion?: string;
  producto?: any;
  moneda?: any;
  anexo?: { id_anexo: number; nombre_anexo: string };
  producto_nombre?: string;
  cantidad_original?: number;
  cantidad_liquidada?: number;
}

export interface ProductosEnLiquidacionCreate {
  id_producto: number;
  cantidad: number;
  precio: number;
  id_moneda: number;
  tipo_compra: 'FACTURA' | 'VENTA_EFECTIVO' | 'ANEXO';
  id_factura?: number;
  id_venta_efectivo?: number;
  id_anexo?: number;
}

export interface Liquidacion {
  id_liquidacion: number;
  codigo: string;
  id_cliente: number;
  id_convenio?: number;
  id_anexo?: number;
  id_moneda: number;
  liquidada: boolean;
  fecha_emision: string;
  fecha_liquidacion?: string;
  observaciones?: string;
  devengado: number;
  tributario: number;
  comision_bancaria: number;
  gasto_empresa: number;
  importe: number;
  neto_pagar: number;
  porcentaje_agencia: number;
  importe_agencia: number;
  tributario_monto: number;
  tipo_pago: string;
  cliente?: any;
  moneda?: any;
  productos_en_liquidacion?: ProductosEnLiquidacion[];
  convenio?: any;
  anexo?: any;
}

export interface LiquidacionCreate {
  id_cliente: number;
  id_convenio?: number;
  id_anexo?: number;
  id_moneda: number;
  devengado?: number;
  tributario?: number;
  comision_bancaria?: number;
  gasto_empresa?: number;
  tipo_pago?: string;
  observaciones?: string;
  producto_ids: number[];
  porcentaje_agencia?: number;
}

export interface ValidacionExistencias {
  valido: boolean;
  errores: { mensaje: string }[];
}

export interface OperacionesAnexo {
  productos?: AnexoOperacionesProducto[];
  devoluciones?: AnexoOperacionesDevolucion[];
}

export interface ResultadoOperacionesAnexo {
  id_anexo: number;
  agregados: AnexoOperacionesResultado[];
  devoluciones: AnexoOperacionesResultado[];
}

export interface FirmasFicha {
  elaborado_por?: string | null;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
}

export interface DocumentoFicha {
  blob: Blob;
  nombre: string;
}

/** Puerto de compra. La UI no conoce servicios ni HTTP. */
export interface CompraRepositorio {
  listarConvenios(
    clienteId?: number,
    search?: string,
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
  ): Promise<Convenio[]>;
  crearConvenio(data: Partial<Convenio>): Promise<Convenio>;
  actualizarConvenio(
    id: number,
    data: Partial<Convenio>,
  ): Promise<Convenio>;
  eliminarConvenio(id: number): Promise<void>;
  listarClientes(
    skip?: number,
    limit?: number,
    tipoRelacion?: string,
    search?: string,
  ): Promise<Cliente[]>;
  obtenerCliente(id: number): Promise<Cliente>;
  listarTiposConvenio(): Promise<TipoConvenio[]>;

  listarAnexos(
    convenioId?: number,
    search?: string,
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
  ): Promise<Anexo[]>;
  crearAnexo(data: Partial<Anexo>): Promise<Anexo>;
  operacionesAnexo(
    id: number,
    data: OperacionesAnexo,
  ): Promise<ResultadoOperacionesAnexo>;
  listarProductos(
    skip?: number,
    limit?: number,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<Producto[]>;
  obtenerProducto(id: number): Promise<Producto>;
  obtenerSiguienteCodigo(idSubcategoria: number): Promise<string>;
  listarMonedas(skip?: number, limit?: number): Promise<Moneda[]>;
  listarSubcategorias(): Promise<Subcategoria[]>;

  listarProductosEnLiquidacion(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<ProductosEnLiquidacion[]>;
  listarProductosEnLiquidacionPendientes(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<ProductosEnLiquidacion[]>;
  listarProductosEnLiquidacionLiquidadas(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<ProductosEnLiquidacion[]>;
  crearProductoEnLiquidacion(
    data: ProductosEnLiquidacionCreate,
  ): Promise<ProductosEnLiquidacion>;
  actualizarProductoEnLiquidacion(
    id: number,
    data: Partial<ProductosEnLiquidacionCreate>,
  ): Promise<ProductosEnLiquidacion>;
  eliminarProductoEnLiquidacion(id: number): Promise<void>;

  listarLiquidaciones(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<Liquidacion[]>;
  listarLiquidacionesPendientes(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<Liquidacion[]>;
  listarLiquidacionesLiquidadas(
    skip?: number,
    limit?: number,
    clienteId?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<Liquidacion[]>;
  crearLiquidacion(data: LiquidacionCreate): Promise<Liquidacion>;
  eliminarLiquidacion(id: number): Promise<void>;
  aprobarLiquidacion(id: number): Promise<{ success: boolean; message: string }>;
  listarProductosPendientesCliente(
    clienteId: number,
    anexoId?: number,
    monedaId?: number,
  ): Promise<ProductosEnLiquidacion[]>;
  validarExistencias(
    productos: { id_producto: number; cantidad: number }[],
    dependenciaId?: number,
    anexoId?: number,
  ): Promise<ValidacionExistencias>;
  listarCuentasCliente(idCliente: number): Promise<Cuenta[]>;

  listarFichas(params?: {
    id_producto?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<FichaCostoRead[]>;
  crearFicha(data: FichaCostoInput): Promise<FichaCostoRead>;
  actualizarFicha(
    id: number,
    data: Partial<FichaCostoInput>,
  ): Promise<FichaCostoRead>;
  exportarFichaExcel(
    id: number,
    firmas: FirmasFicha,
  ): Promise<DocumentoFicha>;
  exportarFichaPdf(id: number, firmas: FirmasFicha): Promise<DocumentoFicha>;
  listarTarifas(params?: {
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<FichaTarifa[]>;
  crearTarifa(data: FichaTarifaInput): Promise<FichaTarifa>;
  actualizarTarifa(
    id: number,
    data: Partial<FichaTarifaInput>,
  ): Promise<FichaTarifa>;
  eliminarTarifa(id: number): Promise<void>;
}
