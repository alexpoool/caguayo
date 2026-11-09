import { describe, expect, it } from 'vitest';
import {
  formatFecha,
  formatFechaHora,
  formatFechaMesLargo,
  formatRangoFechasCorto,
  hoyLocal,
  toISODateLocal,
} from './fecha';

describe('fecha', () => {
  it('no desplaza fechas ISO al día anterior', () => {
    expect(formatFecha('2024-05-15')).toBe('15/05/2024');
    expect(formatFecha('2024-05-15T23:59:00')).toBe('15/05/2024');
  });

  it('formatea fechas locales sin pasar por UTC', () => {
    expect(toISODateLocal(new Date(2024, 0, 1))).toBe('2024-01-01');
    expect(toISODateLocal(new Date(2024, 11, 31, 23, 59))).toBe('2024-12-31');
  });

  it('hoyLocal devuelve una fecha válida', () => {
    expect(hoyLocal()).toBeInstanceOf(Date);
    expect(Number.isNaN(hoyLocal().getTime())).toBe(false);
  });

  it('formatea fecha y hora con y sin segundos', () => {
    expect(formatFechaHora('2024-05-15T14:30:45')).toBe('15/05/2024 14:30');
    expect(formatFechaHora('2024-05-15T14:30:45', true)).toBe('15/05/2024 14:30:45');
    expect(formatFechaHora('2024-05-15')).toBe('15/05/2024');
  });

  it('formatea mes largo y rangos', () => {
    expect(formatFechaMesLargo('2024-05-15')).toBe('15 de mayo de 2024');
    expect(formatRangoFechasCorto('2026-10-18', '2026-10-22')).toBe('18 oct – 22 oct 2026');
    expect(formatRangoFechasCorto('2026-12-18', '2027-01-05')).toBe('18 dic 2026 – 5 ene 2027');
    expect(formatRangoFechasCorto('2026-10-18', '2026-10-18')).toBe('18 oct 2026');
  });

  it('devuelve cadena vacía para valores inválidos', () => {
    expect(formatFecha(null)).toBe('');
    expect(formatFecha('')).toBe('');
    expect(formatFecha('no-es-fecha')).toBe('');
    expect(formatRangoFechasCorto(null, '2026-01-01')).toBe('');
  });
});
