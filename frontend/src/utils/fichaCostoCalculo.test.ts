import { describe, expect, it } from 'vitest';
import { calcularFicha, type FichaCalculoInput } from './fichaCostoCalculo';

const fixture: FichaCalculoInput = {
  totalInsumos: 1000,
  gastoCombustible: 100,
  salarioDirecto: 500,
  gastoOsde: 50,
  nivelProduccion: 10,
  pctEnergia: 10,
  pctAgua: 2,
  pctOtrosGastosDirectos: 5,
  pctVacaciones: 9.09,
  coefGastosAsociados: 1.2,
  coefGastosGenerales: 0.5,
  coefGastosDistribucion: 0.3,
  coefGastosFinancieros: 2,
  pctSeguridadSocial: 12.5,
  pctFuerzaTrabajo: 2.5,
  pctUtilidad: 20,
  pctImpuestoVentas: 10,
};

describe('calcularFicha', () => {
  it('reproduce la fórmula de la ficha de costo', () => {
    const r = calcularFicha(fixture);

    expect(r.gastoEnergia).toBeCloseTo(100, 4);
    expect(r.gastoAgua).toBeCloseTo(20, 4);
    expect(r.gastoMaterial).toBeCloseTo(1220, 4);
    expect(r.vacaciones).toBeCloseTo(45.45, 4);
    expect(r.salarioTotal).toBeCloseTo(545.45, 4);
    expect(r.otrosGastosDirectos).toBeCloseTo(50, 4);
    expect(r.gastosAsociados).toBeCloseTo(654.54, 4);
    expect(r.costoTotal).toBeCloseTo(2469.99, 4);
    expect(r.gastosGenerales).toBeCloseTo(272.725, 4);
    expect(r.gastosDistribucion).toBeCloseTo(163.635, 4);
    expect(r.gastosFinancieros).toBeCloseTo(10.909, 4);
    expect(r.gastosTributarios).toBeCloseTo(81.8175, 4);
    expect(r.totalGastos).toBeCloseTo(497.269, 4);
    expect(r.totalCostosGastos).toBeCloseTo(2967.259, 4);
    expect(r.utilidad).toBeCloseTo(233.6345, 4);
    expect(r.precioTarifa).toBeCloseTo(3200.8935, 4);
    expect(r.impuestoVentas).toBeCloseTo(320.08935, 4);
    expect(r.precioUnitarioAjustado).toBeCloseTo(355.6548, 4);
  });

  it('usa nivel 1 cuando la producción es cero y evita dividir por cero', () => {
    const r = calcularFicha({ ...fixture, nivelProduccion: 0 });
    expect(r.precioUnitarioAjustado).toBeCloseTo(3556.5483, 4);
    expect(Number.isFinite(r.precioUnitarioAjustado)).toBe(true);
  });

  it('no altera el resultado con entradas en cero', () => {
    const r = calcularFicha({
      ...fixture,
      totalInsumos: 0,
      gastoCombustible: 0,
      salarioDirecto: 0,
      gastoOsde: 0,
    });
    expect(r.costoTotal).toBe(0);
    expect(r.precioTarifa).toBe(0);
    expect(r.precioUnitarioAjustado).toBe(0);
  });
});
