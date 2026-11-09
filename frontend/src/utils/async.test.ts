import { describe, expect, it } from 'vitest';
import { mapConcurrent } from './async';

describe('mapConcurrent', () => {
  it('mantiene el orden y respeta el límite de concurrencia', async () => {
    let enVuelo = 0;
    let maximo = 0;

    const result = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
      enVuelo += 1;
      maximo = Math.max(maximo, enVuelo);
      await new Promise((resolve) => setTimeout(resolve, 5));
      enVuelo -= 1;
      return value * 10;
    });

    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(maximo).toBeLessThanOrEqual(2);
  });

  it('devuelve vacío sin llamar al mapper', async () => {
    const result = await mapConcurrent([], 4, async () => 1);
    expect(result).toEqual([]);
  });

  it('propaga el primer error', async () => {
    await expect(
      mapConcurrent([1, 2], 2, async (value) => {
        if (value === 2) throw new Error('falló');
        return value;
      }),
    ).rejects.toThrow('falló');
  });
});
