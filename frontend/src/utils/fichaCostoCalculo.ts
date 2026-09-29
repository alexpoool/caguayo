// Espejo exacto de backend/src/services/ficha_costo_calculo.py
// (fórmulas de la hoja 'Ficha' del Excel oficial). NO modificar sin actualizar el backend.

export interface FichaCalculoInput {
  totalInsumos: number;
  gastoCombustible: number;
  salarioDirecto: number;
  gastoOsde: number;
  nivelProduccion: number;
  pctEnergia: number;
  pctAgua: number;
  pctOtrosGastosDirectos: number;
  pctVacaciones: number;
  coefGastosAsociados: number;
  coefGastosGenerales: number;
  coefGastosDistribucion: number;
  coefGastosFinancieros: number;
  pctSeguridadSocial: number;
  pctFuerzaTrabajo: number;
  pctUtilidad: number;
  pctImpuestoVentas: number;
}

export interface FichaCalculoResultado {
  gastoEnergia: number;
  gastoAgua: number;
  gastoMaterial: number;
  vacaciones: number;
  salarioTotal: number;
  otrosGastosDirectos: number;
  gastosAsociados: number;
  costoTotal: number;
  gastosGenerales: number;
  gastosDistribucion: number;
  gastosFinancieros: number;
  gastosTributarios: number;
  impuestoVentas: number;
  totalGastos: number;
  totalCostosGastos: number;
  utilidad: number;
  precioTarifa: number;
  precioUnitarioAjustado: number;
}

const pct = (base: number, porcentaje: number) => (base * porcentaje) / 100;

export function calcularFicha(input: FichaCalculoInput): FichaCalculoResultado {
  const f9 = input.totalInsumos; // insumos
  const f11 = pct(f9, input.pctEnergia); // energía
  const f12 = pct(f9, input.pctAgua); // agua
  const f8 = f9 + input.gastoCombustible + f11 + f12; // gasto material

  const f14 = input.salarioDirecto;
  const f15 = pct(f14, input.pctVacaciones); // vacaciones
  const f13 = f14 + f15; // salario total

  const f16 = pct(f9, input.pctOtrosGastosDirectos); // otros gastos directos
  const f18 = f13 * input.coefGastosAsociados; // gastos asociados a producción
  const f19 = f8 + f13 + f16 + f18; // costo total

  const f20 = f13 * input.coefGastosGenerales; // gastos generales y administración
  const f22 = f13 * input.coefGastosDistribucion; // gastos de distribución y venta
  const f24 = pct(f13, input.coefGastosFinancieros); // gastos financieros
  const f25 = input.gastoOsde;

  const f27 = pct(f13, input.pctSeguridadSocial + input.pctFuerzaTrabajo); // gastos tributarios

  const f29 = f20 + f22 + f24 + f25; // total de gastos
  const f30 = f19 + f29; // total de costos y gastos
  const f31 =
    ((f30 - f8 - f20 - f22 - f24 - f25 - f27) * input.pctUtilidad) / 100; // utilidad
  const f32 = f30 + f31; // precio o tarifa
  const f28 = pct(f32, input.pctImpuestoVentas); // impuesto sobre ventas (informativo)

  const divisor = 1 - input.pctImpuestoVentas / 100;
  const nivel = input.nivelProduccion > 0 ? input.nivelProduccion : 1;
  const f33 = f32 / divisor / nivel; // precio unitario ajustado

  return {
    gastoEnergia: f11,
    gastoAgua: f12,
    gastoMaterial: f8,
    vacaciones: f15,
    salarioTotal: f13,
    otrosGastosDirectos: f16,
    gastosAsociados: f18,
    costoTotal: f19,
    gastosGenerales: f20,
    gastosDistribucion: f22,
    gastosFinancieros: f24,
    gastosTributarios: f27,
    impuestoVentas: f28,
    totalGastos: f29,
    totalCostosGastos: f30,
    utilidad: f31,
    precioTarifa: f32,
    precioUnitarioAjustado: f33,
  };
}
