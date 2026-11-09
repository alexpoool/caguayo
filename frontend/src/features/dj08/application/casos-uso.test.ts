import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoDj08 } from './casos-uso';
import type { Dj08Repositorio } from '../domain/dj08-repositorio';
import type { DJ08Input } from '../../../types/dj08';

function repositorioFalso(): Dj08Repositorio {
  return {
    listarActividades: vi.fn().mockResolvedValue([]),
    listarTributos: vi.fn().mockResolvedValue([]),
    listarDeclaraciones: vi.fn().mockResolvedValue([]),
    calcular: vi.fn().mockResolvedValue({}),
    guardarDeclaracion: vi.fn().mockResolvedValue({}),
    presentarDeclaracion: vi.fn().mockResolvedValue({}),
    eliminarDeclaracion: vi.fn().mockResolvedValue(undefined),
    exportarPdf: vi.fn().mockResolvedValue({ blob: new Blob(), nombre: 'a.pdf' }),
    exportarDeclaracionPdf: vi
      .fn()
      .mockResolvedValue({ blob: new Blob(), nombre: 'b.pdf' }),
  } as unknown as Dj08Repositorio;
}

const entrada = {} as DJ08Input;

describe('crearCasosUsoDj08', () => {
  it('delega cada operación en el puerto', async () => {
    const repo = repositorioFalso();
    const casos = crearCasosUsoDj08(repo);

    await casos.listarActividades();
    await casos.listarTributos();
    await casos.listarDeclaraciones();
    await casos.calcular(entrada);
    await casos.guardar(entrada);
    await casos.presentar(7);
    await casos.eliminar(7);
    await casos.exportarPdf(entrada);
    await casos.exportarDeclaracionPdf(7);

    expect(repo.listarActividades).toHaveBeenCalledOnce();
    expect(repo.listarTributos).toHaveBeenCalledOnce();
    expect(repo.listarDeclaraciones).toHaveBeenCalledOnce();
    expect(repo.calcular).toHaveBeenCalledWith(entrada);
    expect(repo.guardarDeclaracion).toHaveBeenCalledWith(entrada);
    expect(repo.presentarDeclaracion).toHaveBeenCalledWith(7);
    expect(repo.eliminarDeclaracion).toHaveBeenCalledWith(7);
    expect(repo.exportarPdf).toHaveBeenCalledWith(entrada);
    expect(repo.exportarDeclaracionPdf).toHaveBeenCalledWith(7);
  });
});
