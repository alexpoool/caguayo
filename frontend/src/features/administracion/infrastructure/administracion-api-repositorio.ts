import { apiClient } from '@/shared/infrastructure/http/api';
import {
  backupsService,
  configuracionService,
  administracionService,
  dependenciasService,
} from '../../../services/administracion';
import {
  categoriasService,
  dj08Service,
  monedaService,
  subcategoriasService,
  tipoEntidadService,
} from '../../../services/api';
import type {
  AdministracionRepositorio,
  CredencialUsuario,
} from '../domain/administracion';

/** Adaptador temporal sobre los servicios HTTP heredados de Administración. */
export const administracionApiRepositorio: AdministracionRepositorio = {
  ...administracionService,
  ...dependenciasService,
  ...configuracionService,
  ...backupsService,
  ...monedaService,
  ...categoriasService,
  ...subcategoriasService,
  ...tipoEntidadService,
  ...dj08Service,
  listarCredenciales: () =>
    apiClient.get<CredencialUsuario[]>('/usuarios-lista'),
};
