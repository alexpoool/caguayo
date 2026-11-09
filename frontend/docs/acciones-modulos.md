# Acciones de creación por módulo

Todos los botones que crean una entidad usan `CreateButton`. No reimplementes el
gradiente ni el icono `Plus` en la pantalla.

## Guía

```tsx
// Acción principal de la pantalla.
<CreateButton label="Nuevo cliente" onClick={abrirFormulario} />

// Alta al vuelo dentro de un formulario o selector.
<CreateButton label="Nuevo producto" variant="inline" onClick={abrir} />
```

Reglas:

- La etiqueta empieza con `Nuevo`, `Nueva` o `Crear`, con mayúscula inicial.
- `variant="solid"` para la acción principal; `variant="inline"` dentro de un
  formulario.
- El destino de `BackButton` siempre es explícito; no uses `navigate(-1)`.
- Si la acción no crea una entidad (agregar una fila a un formulario, aprobar,
  guardar), no uses `CreateButton`.

## Migración por módulo

| Módulo | Archivos migrados |
| --- | --- |
| Terceros | `clientes/components/list/ClientesList.tsx` |
| Compra | `compra/LiquidacionesPage.tsx`, `Anexos.tsx`, `Convenios.tsx`, `Cuentas.tsx`, `CuentasCliente.tsx`, `Monedas.tsx`, `Usuarios.tsx` |
| Tienda | `ventas/facturas/components/FacturasListView.tsx`, `ventas/ContratosPage.tsx`, `ventas/SuplementosPage.tsx`, `ventas/VentasEfectivoPage.tsx`, `ventas/ofertas/components/OfertasListView.tsx` |
| Proyectos | `proyecto/CertificacionesPage.tsx`, `EtapasPage.tsx`, `FacturasServicioPage.tsx`, `LiquidacionesPage.tsx`, `OfertasPage.tsx`, `PagosFacturaServicioPage.tsx`, `PreFacturasPage.tsx`, `ProyectosPage.tsx`, `RealizadoresPage.tsx`, `ServiciosPage.tsx`, `SolicitudesPage.tsx`, `TareasEtapaPage.tsx` |
| Administración | `Configuracion.tsx`, `Dependencias.tsx`, `Grupos.tsx` |
| RRHH | `rrhh/CatalogosPage.tsx`, `DepartamentosPage.tsx`, `EmpleadosPage.tsx`, `EvaluacionesPage.tsx`, `MovimientosPage.tsx`, `NominaPage.tsx`, `ObjetivosPage.tsx`, `PagosResultadoPage.tsx`, `PuestosPage.tsx`, `SolicitudesPage.tsx` |
| DJ08 | `dj08/DJ08Page.tsx` |

`pnpm check:ui` falla si un `<Button>` con `Plus` y color de marca vuelve a
aparecer fuera de `CreateButton`.
