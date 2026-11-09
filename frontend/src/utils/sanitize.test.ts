import { describe, expect, it } from 'vitest';
import { escapeHtml } from './sanitize';
import {
  esFechaValida,
  esNumeroPositivo,
  esPorcentaje,
  fechaNoAnterior,
  required,
  seleccionValida,
} from './validacionFormularios';

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("' OR 1=1 --")).toBe('&#039; OR 1=1 --');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('devuelve vacío para nulos', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });
});

describe('validación de formularios', () => {
  it('required acepta texto y rechaza vacío o cero', () => {
    expect(required('Cliente', 'Nombre')).toBeNull();
    expect(required('   ', 'Nombre')).toBe('Nombre es requerido');
    expect(required(null, 'Nombre')).toBe('Nombre es requerido');
    expect(required(0, 'Monto')).toBe('Monto es requerido');
  });

  it('valida números positivos y porcentajes', () => {
    expect(esNumeroPositivo('12.5', 'Monto')).toBeNull();
    expect(esNumeroPositivo(0, 'Monto')).toBe('Monto debe ser mayor que 0');
    expect(esNumeroPositivo(0, 'Monto', true)).toBeNull();
    expect(esNumeroPositivo('abc', 'Monto')).toBe('Monto debe ser un número válido');
    expect(esPorcentaje(100, 'IVA')).toBeNull();
    expect(esPorcentaje(101, 'IVA')).toBe('IVA debe estar entre 0 y 100');
  });

  it('valida fechas y orden entre fechas', () => {
    expect(esFechaValida('2026-11-07', 'Fecha')).toBeNull();
    expect(esFechaValida('', 'Fecha')).toBe('Fecha es requerido');
    expect(esFechaValida('no-es-fecha', 'Fecha')).toBe('Fecha no es una fecha válida');
    expect(fechaNoAnterior('2026-11-07', '2026-11-01', 'Fecha')).toBeNull();
    expect(fechaNoAnterior('2026-10-31', '2026-11-01', 'Fecha')).toBe(
      'Fecha no puede ser anterior a la fecha de inicio',
    );
  });

  it('valida selecciones', () => {
    expect(seleccionValida(3, 'Cliente')).toBeNull();
    expect(seleccionValida('', 'Cliente')).toBe('Seleccione un cliente');
    expect(seleccionValida(0, 'Cliente')).toBe('Seleccione un cliente');
  });
});
