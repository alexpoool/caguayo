import { describe, expect, it } from 'vitest';
import { calcularTendencia } from './tendencias';
import type { ResumenDashboard } from '../domain/dashboard';

function resumen(crecimiento: number): ResumenDashboard {
  return {
    ventas_crecimiento_porcentaje: crecimiento,
  } as ResumenDashboard;
}

describe('calcularTendencia', () => {
  it('marca subida cuando el crecimiento es positivo', () => {
    expect(calcularTendencia(resumen(12.5))).toEqual({
      trend: 'up',
      value: 12.5,
    });
  });

  it('marca bajada cuando el crecimiento es negativo', () => {
    expect(calcularTendencia(resumen(-4))).toEqual({
      trend: 'down',
      value: -4,
    });
  });

  it('marca neutral cuando no hay crecimiento o no hay datos', () => {
    expect(calcularTendencia(resumen(0)).trend).toBe('neutral');
    expect(calcularTendencia(undefined).trend).toBe('neutral');
  });
});
