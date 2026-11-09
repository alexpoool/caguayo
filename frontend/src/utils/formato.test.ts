import { describe, expect, it } from 'vitest';
import { formatNumero, getNumberFormatter } from './formato';

describe('formato', () => {
  it('reutiliza el formateador para la misma configuración', () => {
    const opciones = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const primero = getNumberFormatter('es-CU', opciones);
    const segundo = getNumberFormatter('es-CU', opciones);

    expect(primero).toBe(segundo);
  });

  it('crea formateadores distintos para opciones distintas', () => {
    const entero = getNumberFormatter('es-CU', { maximumFractionDigits: 0 });
    const decimal = getNumberFormatter('es-CU', { maximumFractionDigits: 2 });

    expect(entero).not.toBe(decimal);
  });

  it('formatea con locale es-CU y las opciones recibidas', () => {
    const opciones = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };

    expect(formatNumero(1234.5, opciones)).toBe(
      new Intl.NumberFormat('es-CU', opciones).format(1234.5),
    );
  });
});
