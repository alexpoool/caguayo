import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirBlob, descargarBlob } from './archivos';

describe('archivos', () => {
  const createObjectURL = vi.fn(() => 'blob:prueba');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('descarga un blob, dispara el ancla y libera la URL', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    descargarBlob(new Blob(['hola']), 'reporte.csv');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a')).toBeNull();

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
  });

  it('abre el blob y lo libera después del margen del visor', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    abrirBlob(new Blob(['pdf']));

    expect(open).toHaveBeenCalledWith('blob:prueba', '_blank');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
  });
});
