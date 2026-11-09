import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { add, div, formatCifra, mul, percentToMultiplier, sub, toFixed, toNumber } from './decimal';

describe('decimal', () => {
  it('suma y resta sin perder precisión', () => {
    expect(add('0.1', '0.2').toString()).toBe('0.3');
    expect(sub('1.1', '0.9').toString()).toBe('0.2');
  });

  it('multiplica y divide con precisión financiera', () => {
    expect(mul('1234.56', '3').toFixed(2)).toBe('3703.68');
    expect(div('10', '4').toString()).toBe('2.5');
    expect(mul('0', '999999').toString()).toBe('0');
    expect(mul('-5', '2').toString()).toBe('-10');
  });

  it('convierte porcentajes a multiplicador', () => {
    expect(percentToMultiplier(10).toString()).toBe('0.1');
    expect(percentToMultiplier(0).toString()).toBe('0');
  });

  it('formatea con decimales fijos', () => {
    expect(toFixed(new Decimal('1.005'), 2)).toBe('1.01');
    expect(toNumber(new Decimal('42.5'))).toBe(42.5);
  });

  it('recorta ceros finales con formatCifra', () => {
    expect(formatCifra('100.50')).toBe('100.5');
    expect(formatCifra(0)).toBe('0');
    expect(formatCifra(null)).toBe('0');
    expect(formatCifra('')).toBe('0');
    expect(formatCifra('123.456789', 3)).toBe('123.457');
  });
});
