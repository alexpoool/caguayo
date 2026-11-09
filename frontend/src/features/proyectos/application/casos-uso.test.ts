import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoProyectos } from './casos-uso';
import type { ProyectosRepositorio } from '../domain/proyectos';

function repoFalso(
  overrides: Partial<ProyectosRepositorio> = {},
): ProyectosRepositorio {
  const repo = {
    getServicios: vi.fn().mockResolvedValue([]),
    createServicio: vi.fn().mockResolvedValue({}),
    updateServicio: vi.fn().mockResolvedValue({}),
    deleteServicio: vi.fn().mockResolvedValue(undefined),
    getSolicitudes: vi.fn().mockResolvedValue([]),
    getSolicitud: vi.fn().mockResolvedValue({}),
    createSolicitud: vi.fn().mockResolvedValue({}),
    updateSolicitud: vi.fn().mockResolvedValue({}),
    deleteSolicitud: vi.fn().mockResolvedValue(undefined),
    getAllEtapas: vi.fn().mockResolvedValue([]),
    getEtapasBySolicitud: vi.fn().mockResolvedValue([]),
    getEtapa: vi.fn().mockResolvedValue({}),
    createEtapa: vi.fn().mockResolvedValue({}),
    updateEtapa: vi.fn().mockResolvedValue({}),
    deleteEtapa: vi.fn().mockResolvedValue(undefined),
    getTareasByEtapa: vi.fn().mockResolvedValue([]),
    createTareaEtapa: vi.fn().mockResolvedValue({}),
    updateTareaEtapa: vi.fn().mockResolvedValue({}),
    deleteTareaEtapa: vi.fn().mockResolvedValue(undefined),
    getPersonasByEtapa: vi.fn().mockResolvedValue([]),
    createPersonaEtapa: vi.fn().mockResolvedValue({}),
    deletePersonaEtapa: vi.fn().mockResolvedValue(undefined),
    getFacturasServicio: vi.fn().mockResolvedValue([]),
    getFacturaServicio: vi.fn().mockResolvedValue({}),
    createFacturaServicio: vi.fn().mockResolvedValue({}),
    updateFacturaServicio: vi.fn().mockResolvedValue({}),
    deleteFacturaServicio: vi.fn().mockResolvedValue(undefined),
    validarPagoEtapa: vi.fn().mockResolvedValue({ valido: true, errores: [] }),
    getItemsByFactura: vi.fn().mockResolvedValue([]),
    aprobarFacturaServicio: vi.fn().mockResolvedValue({}),
    getOfertas: vi.fn().mockResolvedValue([]),
    createOferta: vi.fn().mockResolvedValue({}),
    updateOferta: vi.fn().mockResolvedValue({}),
    deleteOferta: vi.fn().mockResolvedValue(undefined),
    getItemsByOferta: vi.fn().mockResolvedValue([]),
    confirmarOferta: vi.fn().mockResolvedValue({}),
    getPagosByFactura: vi.fn().mockResolvedValue([]),
    createPago: vi.fn().mockResolvedValue({}),
    deletePago: vi.fn().mockResolvedValue(undefined),
    getCertificaciones: vi.fn().mockResolvedValue([]),
    getCertificacion: vi.fn().mockResolvedValue({}),
    getCertificacionesByEtapa: vi.fn().mockResolvedValue([]),
    createCertificacion: vi.fn().mockResolvedValue({}),
    updateCertificacion: vi.fn().mockResolvedValue({}),
    deleteCertificacion: vi.fn().mockResolvedValue(undefined),
    getLiquidaciones: vi.fn().mockResolvedValue([]),
    getLiquidacion: vi.fn().mockResolvedValue({}),
    createLiquidacion: vi.fn().mockResolvedValue({}),
    updateLiquidacion: vi.fn().mockResolvedValue({}),
    deleteLiquidacion: vi.fn().mockResolvedValue(undefined),
    confirmarLiquidacion: vi.fn().mockResolvedValue({}),
    validarLiquidar: vi.fn().mockResolvedValue({ valido: true, errores: [] }),
    getPagosDisponibles: vi.fn().mockResolvedValue([]),
    getDisponibleLiquidar: vi.fn().mockResolvedValue({ disponible: 0 }),
    getContratos: vi.fn().mockResolvedValue([]),
    getContrato: vi.fn().mockResolvedValue({}),
    createContrato: vi.fn().mockResolvedValue({}),
    getSuplementosByContrato: vi.fn().mockResolvedValue([]),
    getSuplemento: vi.fn().mockResolvedValue({}),
    createSuplemento: vi.fn().mockResolvedValue({}),
    getClientes: vi.fn().mockResolvedValue([]),
    getCliente: vi.fn().mockResolvedValue({}),
    createCliente: vi.fn().mockResolvedValue({}),
    getPersonasNaturales: vi.fn().mockResolvedValue([]),
    getTiposEntidad: vi.fn().mockResolvedValue([]),
    getMonedas: vi.fn().mockResolvedValue([]),
    getCuentasByClienteAll: vi.fn().mockResolvedValue([]),
    getCuentasByDependencia: vi.fn().mockResolvedValue([]),
    getEstadosContrato: vi.fn().mockResolvedValue([]),
    getUsuarios: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return repo as unknown as ProyectosRepositorio;
}

describe('crearCasosUsoProyectos', () => {
  it('delega servicios, solicitudes, etapas y tareas con sus parámetros', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoProyectos(repo);
    const onTotal = vi.fn();

    await casos.getServicios(0, 50, onTotal, 'abc');
    await casos.createServicio({} as never);
    await casos.updateServicio(1, {} as never);
    await casos.deleteServicio(1);

    await casos.getSolicitudes(0, 50, onTotal, { search: 'x' });
    await casos.getSolicitud(9);
    await casos.createSolicitud({} as never);
    await casos.updateSolicitud(9, {} as never);
    await casos.deleteSolicitud(9);

    await casos.getAllEtapas();
    await casos.getEtapasBySolicitud(9);
    await casos.getEtapa(4);
    await casos.createEtapa({} as never);
    await casos.updateEtapa(4, {} as never);
    await casos.deleteEtapa(4);

    await casos.getTareasByEtapa(4);
    await casos.createTareaEtapa({} as never);
    await casos.updateTareaEtapa(2, {} as never);
    await casos.deleteTareaEtapa(2);

    expect(repo.getServicios).toHaveBeenCalledWith(0, 50, onTotal, 'abc');
    expect(repo.getSolicitudes).toHaveBeenCalledWith(0, 50, onTotal, {
      search: 'x',
    });
    expect(repo.getEtapasBySolicitud).toHaveBeenCalledWith(9);
    expect(repo.deleteEtapa).toHaveBeenCalledWith(4);
    expect(repo.getTareasByEtapa).toHaveBeenCalledWith(4);
    expect(repo.deleteTareaEtapa).toHaveBeenCalledWith(2);
  });

  it('delega realizadores, facturas, ofertas y certificaciones', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoProyectos(repo);
    const onTotal = vi.fn();

    await casos.getPersonasByEtapa(4);
    await casos.createPersonaEtapa({} as never);
    await casos.deletePersonaEtapa(4, 7);

    await casos.getFacturasServicio(0, 50, onTotal, 'f');
    await casos.getFacturaServicio(3);
    await casos.createFacturaServicio({} as never);
    await casos.updateFacturaServicio(3, {} as never);
    await casos.deleteFacturaServicio(3);
    await casos.validarPagoEtapa(4);
    await casos.getItemsByFactura(3);
    await casos.aprobarFacturaServicio(3);

    await casos.getOfertas(0, 50, 'PENDIENTE', onTotal, 'o');
    await casos.createOferta({} as never);
    await casos.updateOferta(2, {} as never);
    await casos.deleteOferta(2);
    await casos.getItemsByOferta(2);
    await casos.confirmarOferta(2, 'PREFACTURA');

    await casos.getPagosByFactura(3);
    await casos.createPago({} as never);
    await casos.deletePago(5);

    await casos.getCertificaciones(0, 50, onTotal);
    await casos.getCertificacion(8);
    await casos.getCertificacionesByEtapa(4);
    await casos.createCertificacion({} as never);
    await casos.updateCertificacion(8, {} as never);
    await casos.deleteCertificacion(8);

    expect(repo.deletePersonaEtapa).toHaveBeenCalledWith(4, 7);
    expect(repo.getFacturasServicio).toHaveBeenCalledWith(0, 50, onTotal, 'f');
    expect(repo.validarPagoEtapa).toHaveBeenCalledWith(4);
    expect(repo.getOfertas).toHaveBeenCalledWith(
      0,
      50,
      'PENDIENTE',
      onTotal,
      'o',
    );
    expect(repo.confirmarOferta).toHaveBeenCalledWith(2, 'PREFACTURA');
    expect(repo.getCertificacionesByEtapa).toHaveBeenCalledWith(4);
  });

  it('delega liquidaciones, contratos, clientes y catálogos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoProyectos(repo);
    const onTotal = vi.fn();

    await casos.getLiquidaciones(0, 50, onTotal, 'liq');
    await casos.getLiquidacion(6);
    await casos.createLiquidacion({} as never);
    await casos.updateLiquidacion(6, {} as never);
    await casos.deleteLiquidacion(6);
    await casos.confirmarLiquidacion(6, { devengado: 100 });
    await casos.validarLiquidar(4, 7);
    await casos.getPagosDisponibles(4);
    await casos.getDisponibleLiquidar(4, 7);

    await casos.getContratos(0, 20, 3, 'c', onTotal);
    await casos.getContrato(3);
    await casos.createContrato({} as never);
    await casos.getSuplementosByContrato(3, 0, 20, 's');
    await casos.getSuplemento(2);
    await casos.createSuplemento({} as never);

    await casos.getClientes(0, 20, 'TCP', 'cli', onTotal);
    await casos.getCliente(7);
    await casos.createCliente({} as never);
    await casos.getPersonasNaturales();
    await casos.getTiposEntidad();

    await casos.getMonedas();
    await casos.getCuentasByClienteAll(7);
    await casos.getCuentasByDependencia(2);
    await casos.getEstadosContrato();
    await casos.getUsuarios();

    expect(repo.getLiquidaciones).toHaveBeenCalledWith(0, 50, onTotal, 'liq');
    expect(repo.confirmarLiquidacion).toHaveBeenCalledWith(6, {
      devengado: 100,
    });
    expect(repo.getDisponibleLiquidar).toHaveBeenCalledWith(4, 7);
    expect(repo.getContratos).toHaveBeenCalledWith(0, 20, 3, 'c', onTotal);
    expect(repo.getSuplementosByContrato).toHaveBeenCalledWith(3, 0, 20, 's');
    expect(repo.getClientes).toHaveBeenCalledWith(
      0,
      20,
      'TCP',
      'cli',
      onTotal,
    );
    expect(repo.getCuentasByClienteAll).toHaveBeenCalledWith(7);
    expect(repo.getCuentasByDependencia).toHaveBeenCalledWith(2);
  });
});
