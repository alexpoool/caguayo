import { monedaService } from '../../../services/api';
import { rrhhService } from '../../../services/rrhh';
import type { RrhhRepositorio } from '../domain/rrhh';

/** Adaptador temporal sobre los servicios HTTP heredados de RRHH. */
export const rrhhApiRepositorio: RrhhRepositorio = {
  ...rrhhService,
  getMonedas: (skip, limit, onTotal) =>
    monedaService.getMonedas(skip, limit, onTotal),
};
