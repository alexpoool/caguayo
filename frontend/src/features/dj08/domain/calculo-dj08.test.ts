import { describe, expect, it } from 'vitest';
import { calcularDj08Local } from './calculo-dj08';
import type { ActividadEconomica, DJ08Input, Tributo } from '../../../types/dj08';

function entrada(parcial: Partial<DJ08Input> = {}): DJ08Input {
  return {
    ano_fiscal: 2026,
    opera_en_municipio: true,
    minimo_exento: 39120,
    contribucion_restauracion: 0,
    pagos_arrendamiento: 0,
    importe_exonerado_reparaciones: 0,
    otros_descuentos: 0,
    bonificacion_mfp: 0,
    cuotas_mensuales: 0,
    otros_pagos_anticipados: 0,
    total_retenciones: 0,
    bonificaciones_autorizadas: 0,
    impuesto_declaracion_rectificada: 0,
    pago_declaracion_anterior: 0,
    bonificacion_pronto_pago: 0,
    impuesto_pagado_dj_ano: 0,
    recargo_mora: 0,
    ...parcial,
  };
}

function actividad(ingresos: number, gastos: number): ActividadEconomica {
  return {
    id_actividad: 1,
    codigo: 'A',
    nombre: 'Actividad',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-12-31',
    ingresos,
    gastos,
    orden: 1,
  };
}

function tributo(importe: number): Tributo {
  return { id_tributo: 1, nombre: 'Tributo', importe };
}

describe('calcularDj08Local', () => {
  it('calcula la base y la escala progresiva', () => {
    const r = calcularDj08Local(
      entrada(),
      [actividad(100_000, 20_000)],
      [tributo(5_000)],
    );

    expect(r.total_ingresos).toBe(100_000);
    expect(r.total_gastos).toBe(20_000);
    expect(r.total_tributos).toBe(5_000);
    expect(r.base_imponible).toBe(35_880);
    expect(r.escala_total_base).toBe(35_880);
    expect(r.escala[0].base_tramo).toBe(25_000);
    expect(r.escala[1].base_tramo).toBe(10_880);
    expect(r.escala[2].base_tramo).toBe(0);
    expect(r.impuesto_escala).toBe(2_338);
    expect(r.impuesto_pagar).toBe(2_338);
    expect(r.total_pagar).toBe(2_338);
  });

  it('calcula el tramo exacto de 100.000', () => {
    const r = calcularDj08Local(entrada(), [actividad(100_000, 0)], []);

    expect(r.base_imponible).toBe(60_880);
    expect(r.escala_total_base).toBe(60_880);
    expect(r.impuesto_escala).toBe(5_382);
  });

  it('descuenta pagos anticipados, retenciones y bonificaciones', () => {
    const r = calcularDj08Local(
      entrada({
        cuotas_mensuales: 500,
        total_retenciones: 300,
        bonificaciones_autorizadas: 100,
      }),
      [actividad(100_000, 20_000)],
      [tributo(5_000)],
    );

    expect(r.impuesto_escala).toBe(2_338);
    expect(r.impuesto_pagar).toBe(1_438);
    expect(r.total_pagar).toBe(1_438);
  });

  it('trata las cuotas como devolución cuando superan el impuesto', () => {
    const r = calcularDj08Local(entrada({ cuotas_mensuales: 1_000 }), [], []);

    expect(r.impuesto_pagar).toBe(0);
    expect(r.total_devolver).toBe(1_000);
  });

  it('usa la diferencia de la declaración rectificada', () => {
    const r = calcularDj08Local(
      entrada({
        impuesto_declaracion_rectificada: 5_000,
        pago_declaracion_anterior: 2_000,
      }),
      [actividad(100_000, 20_000)],
      [tributo(5_000)],
    );

    expect(r.diferencia_pagar).toBe(3_000);
    expect(r.diferencia_devolver).toBe(0);
    expect(r.total_pagar).toBe(3_000);
  });

  it('suma el recargo por mora al total a pagar', () => {
    const r = calcularDj08Local(
      entrada({ recargo_mora: 50 }),
      [actividad(100_000, 20_000)],
      [tributo(5_000)],
    );

    expect(r.total_pagar).toBe(2_388);
  });
});
