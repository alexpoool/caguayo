// Tipos de la Ficha de Costo (espejo de backend/src/dto/ficha_costo_dto.py)

export interface FichaInsumoInput {
  id_producto?: number | null;
  codigo: string;
  nombre: string;
  um?: string | null;
  norma_consumo: number;
  precio_unitario: number;
}

export interface FichaManoObraInput {
  id_tarifa?: number | null;
  categoria: string;
  tarifa_horaria: number;
  norma_tiempo: number;
}

// Catálogo de tarifas por hora (hoja Tarifas)
export interface FichaTarifa {
  id_tarifa: number;
  categoria: string;
  tarifa_horaria: number;
}

export interface FichaTarifaInput {
  categoria: string;
  tarifa_horaria: number;
}

export interface FichaCostoInput {
  id_producto: number;
  // El backend lo asigna (= id_ficha); opcional al crear
  numero_ficha?: string;
  nivel_produccion: number;
  pct_energia: number;
  pct_agua: number;
  pct_otros_gastos_directos: number;
  pct_vacaciones: number;
  coef_gastos_asociados: number;
  coef_gastos_generales: number;
  coef_gastos_distribucion: number;
  coef_gastos_financieros: number;
  pct_seguridad_social: number;
  pct_fuerza_trabajo: number;
  pct_utilidad: number;
  pct_impuesto_ventas: number;
  gasto_combustible: number;
  gasto_osde: number;
  elaborado_por?: string | null;
  aprobado_por?: string | null;
  fecha_elaboracion: string;
  fecha_aprobacion?: string | null;
  insumos: FichaInsumoInput[];
  mano_obra: FichaManoObraInput[];
}

export interface FichaInsumoRead extends FichaInsumoInput {
  id_ficha_insumo: number;
  id_ficha: number;
  costo: number;
}

export interface FichaManoObraRead extends FichaManoObraInput {
  id_ficha_mano_obra: number;
  id_ficha: number;
  gasto_salario: number;
}

export interface FichaCostoRead extends FichaCostoInput {
  id_ficha: number;
  producto_nombre?: string | null;
  total_insumos: number;
  gasto_energia: number;
  gasto_agua: number;
  gasto_material: number;
  salario_directo: number;
  vacaciones: number;
  salario_total: number;
  otros_gastos_directos: number;
  gastos_asociados: number;
  costo_total: number;
  gastos_generales: number;
  gastos_distribucion: number;
  gastos_financieros: number;
  gastos_tributarios: number;
  impuesto_ventas: number;
  total_gastos: number;
  total_costos_gastos: number;
  utilidad: number;
  precio_tarifa: number;
  precio_unitario_ajustado: number;
  insumos: FichaInsumoRead[];
  mano_obra: FichaManoObraRead[];
}
