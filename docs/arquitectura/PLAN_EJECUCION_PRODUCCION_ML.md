# Plan de ejecución: Producción + Inteligencia de Stock

**Repositorio:** `alexpoool/caguayo`  
**Rama:** `feature/arquitectura-produccion-ml`  
**Base:** `podman`  
**Documento rector:** [ERP_PRODUCCION_INTELIGENCIA_STOCK.md](./ERP_PRODUCCION_INTELIGENCIA_STOCK.md)

Este plan organiza la implementación por entregables verificables. Las tareas marcadas como auditoría son bloqueantes: no se deben crear migraciones ni integrar movimientos hasta confirmar los contratos actuales.

## 1. Estrategia de trabajo

- Trabajar en ramas feature pequeñas derivadas de la rama de integración.
- Mantener el backend en `backend/src/` y el frontend en `frontend/src/container/`.
- No modificar el esquema de inventario existente para duplicarlo.
- Cada fase entrega código, migración cuando corresponda, pruebas y documentación.
- Migraciones deben ser compatibles con bases tenant existentes y con el mecanismo que replica esquema a nuevos tenants.
- Integrar mediante PR; no hacer push directo a ramas protegidas ni desplegar sin aprobación.
- Mantener los cambios de Producción y ML detrás de funcionalidades/permisos hasta completar pruebas.

## 2. Fase 0 — Auditoría del código y contratos (bloqueante)

### Backend e inventario
- [ ] Inspeccionar `backend/src/routes/api.py` y documentar cómo se registran routers.
- [ ] Encontrar y leer los servicios que confirman/anulan `Movimiento` y actualizan `Saldo`.
- [ ] Documentar estados válidos de `Movimiento`, factores de `TipoMovimiento` y movimientos pendientes.
- [ ] Verificar si `Saldo` es snapshot por producto/dependencia y cómo se reconstruye tras anulación.
- [ ] Inspeccionar modelos `DetalleVenta`, `DetalleCompra`, devoluciones, recepción y sus servicios.
- [ ] Determinar qué hechos representan demanda real y qué hechos representan movimientos de inventario; evitar contar dos veces una venta como demanda y salida.
- [ ] Inspeccionar `Dependencia`, `TipoDependencia` y reglas de tenant/empresa/almacén.
- [ ] Buscar unidades de medida y conversiones; documentar si faltan.
- [ ] Inspeccionar `FichaCosto`, `FichaInsumo`, `FichaManoObra`, RRHH y módulos contables para delimitar reutilización.
- [ ] Documentar autorización: dependencias, grupos, funcionalidades y verificaciones en endpoints.
- [ ] Inspeccionar `backend/src/database/connection.py`, middleware tenant y ciclo de vida de sesión.
- [ ] Inspeccionar `backend/alembic/env.py`, revisiones, múltiples heads y creación/replicación de DB tenant.
- [ ] Revisar tests y fixtures actuales del backend.

### Frontend
- [ ] Inspeccionar `frontend/src/app/App.tsx` (o archivo real de rutas), `cargadores.ts`, menú y registro de funcionalidades.
- [ ] Inspeccionar `frontend/src/container/inventario` y `frontend/src/container/compra` para seguir patrones.
- [ ] Identificar API client, hooks React Query, formularios, tablas y componentes reutilizables.
- [ ] Verificar pruebas unitarias, e2e, accesibilidad y límites de bundle.

**Entregable F0:** `docs/arquitectura/PRODUCCION_ML_AUDITORIA.md` con mapa de servicios, flujo de movimientos, modelo tenant/empresa/almacén, estrategia de migración y decisiones pendientes resueltas.

**Gate F0:** no avanzar a migraciones hasta tener confirmados los servicios de inventario, tenant isolation y estrategia de esquema para tenants nuevos.

## 3. Fase 1 — Fundaciones y contratos de dominio

### Backend
- [ ] Crear paquete `backend/src/modules/produccion/` siguiendo el patrón real de módulos.
- [ ] Crear paquete `backend/src/modules/inteligencia_stock/` o estructura equivalente, evitando duplicar routers/services ya existentes.
- [ ] Definir enums y transiciones de estados como dominio.
- [ ] Definir DTOs de entrada/salida separados de modelos SQLModel.
- [ ] Definir interfaces/adapters para Inventario, Compras, Productos y Costos.
- [ ] Definir contexto tenant/empresa/almacén tipado; reutilizar `get_current_db()` y la dependencia de sesión existente.
- [ ] Registrar funcionalidades/permisos siguiendo seeds y mecanismo de permisos actual.
- [ ] Crear pruebas unitarias de reglas y transiciones.

### Esquema
- [ ] Definir nombres, PK/FK, NUMERIC, índices, constraints y políticas de borrado.
- [ ] Verificar imports en `backend/src/models/__init__.py` y registro de metadata en `backend/main.py`.
- [ ] Preparar migración Alembic solo después de cerrar F0.
- [ ] Validar upgrade desde una DB tenant existente y bootstrap de tenant nuevo.
- [ ] Verificar downgrade seguro cuando sea viable; no borrar datos productivos.

**Entregable F1:** módulos registrados, contratos, permisos y primera migración revisada.

## 4. Fase 2 — Maestro productivo (BOM, rutas y centros)

- [ ] Crear tipo de proceso: discreto, lote/proceso y ensamblaje.
- [ ] Implementar centros de trabajo y calendario/capacidad básica.
- [ ] Implementar rutas y operaciones secuenciadas.
- [ ] Implementar BOM con versiones y vigencia.
- [ ] Implementar BOM multinivel y detección de ciclos.
- [ ] Validar unidades y conversiones.
- [ ] Bloquear edición de versiones aprobadas/usadas; crear nueva versión.
- [ ] Implementar APIs y permisos.
- [ ] Crear pantallas siguiendo `frontend/src/container/` y cargadores lazy.
- [ ] Añadir tests unitarios, integración y e2e.

**Gate F2:** BOM multinivel consistente, versiones reproducibles y referencias a productos existentes.

## 5. Fase 3 — Órdenes y ejecución productiva

- [ ] Implementar creación y planificación de órdenes.
- [ ] Implementar máquina de estados con transiciones explícitas.
- [ ] Implementar snapshot de BOM/ruta por orden.
- [ ] Implementar asignación de centro y capacidad.
- [ ] Implementar operaciones, tiempos y cantidades.
- [ ] Implementar reservas mediante adapter de Inventario.
- [ ] Implementar consumo, backflush configurable y devolución.
- [ ] Implementar producción parcial, resultados, merma y suspensión.
- [ ] Implementar lote terminado y genealogía cuando Inventario soporte lotes.
- [ ] Implementar historial/auditoría.
- [ ] Implementar idempotencia y concurrencia.
- [ ] Implementar pantallas de órdenes, ejecución y trazabilidad.

**Gate F3:** una orden puede planificarse, aprobarse, ejecutarse parcialmente, suspenderse/reanudarse y finalizar sin alterar inventario directamente.

## 6. Fase 4 — Integración de inventario y MRP

- [ ] Documentar el contrato del servicio real de movimiento.
- [ ] Crear adapter que invoque el servicio de Inventario en la misma unidad transaccional cuando sea posible.
- [ ] Implementar reserva supervisada.
- [ ] Implementar consumo/devolución/merma y recepción de producto terminado.
- [ ] Implementar referencias de origen únicas y claves idempotentes.
- [ ] Implementar outbox si la integración cruza procesos.
- [ ] Implementar conciliación de consumos vs movimientos vs saldo.
- [ ] Implementar explosión BOM multinivel.
- [ ] Implementar necesidades brutas/netas por período.
- [ ] Incorporar stock utilizable, reservas, recepciones confirmadas, producción prevista y lead time.
- [ ] Crear corridas MRP reproducibles y propuestas de compra/fabricación.
- [ ] Aprobar propuestas y convertirlas mediante casos de uso de Compras/Producción.
- [ ] Pruebas de concurrencia, repetición HTTP, fallos y compensación.

**Gate F4:** no hay duplicados ni divergencias de saldo; MRP no duplica demanda ni compromisos.

## 7. Fase 5 — Costeo completo de producción

- [ ] Definir política de valoración de materiales con Contabilidad/Inventario.
- [ ] Integrar consumos y devoluciones reales.
- [ ] Definir captura de mano de obra (tiempos de operación, tarifa y fuente autorizada).
- [ ] Definir tasas de costos indirectos por centro y vigencia.
- [ ] Implementar acumulación de WIP.
- [ ] Implementar costo estándar/previsto y costo real.
- [ ] Calcular variaciones de precio, cantidad, eficiencia y absorción.
- [ ] Definir tratamiento de merma, coproductos y subproductos.
- [ ] Definir moneda/tipo de cambio y fecha de valoración.
- [ ] Integrar con asientos mediante contrato de Contabilidad; no generar cuentas arbitrarias.
- [ ] Reconciliar costo de orden, entrada de terminados y asiento.
- [ ] Pruebas contables y de redondeo Decimal.

**Gate F5:** orden no cierra sin conciliación; costos reproducibles y auditables.

## 8. Fase 6 — Data pipeline automático

- [ ] Crear extracción incremental por tenant desde movimientos confirmados, ventas, compras/recepciones, devoluciones y producción.
- [ ] Implementar watermark por fuente y tenant.
- [ ] Implementar backfill histórico configurable e idempotente.
- [ ] Resolver estados/anulaciones y no duplicar ventas con salidas de inventario.
- [ ] Construir serie temporal diaria/semanal por empresa/producto/almacén.
- [ ] Construir indicadores de stockout y demanda censurada.
- [ ] Normalizar calendario, unidades, monedas y zonas horarias.
- [ ] Validar consistencia contra `Saldo` y totales operativos.
- [ ] Crear dataset snapshots y checksums.
- [ ] Implementar calidad de datos, reporte de cobertura y alertas.
- [ ] Implementar jobs persistentes con retry, heartbeat y tenant context.
- [ ] Tests de aislamiento entre tenants y reejecución.

**Gate F6:** pipeline reproducible, sin fuga de datos entre tenants y con conciliación histórica.

## 9. Fase 7 — Primer motor ML

- [ ] Implementar baseline naive estacional/media móvil.
- [ ] Implementar Exponential Smoothing/StatsForecast según disponibilidad de datos.
- [ ] Implementar LightGBM con features temporales sin leakage.
- [ ] Implementar Croston/SBA/TSB para demanda intermitente si los datos lo justifican.
- [ ] Implementar fallback jerárquico para SKU con poco historial.
- [ ] Implementar backtesting rolling-origin por horizonte.
- [ ] Calcular MAE, RMSE, WAPE, MASE y bias.
- [ ] Evaluar intervalos/cuantiles y cobertura.
- [ ] Implementar promoción de modelo solo si supera baseline y criterios por segmento.
- [ ] Registrar modelo, versión, dataset, features, parámetros, métricas y artefacto.
- [ ] Implementar inferencia batch y guardar pronósticos.
- [ ] Implementar monitorización de drift y error real.
- [ ] Tests de data leakage, determinismo, fallback y modelo obsoleto.

**Gate F7:** ningún modelo pasa a activo sin evaluación fuera de muestra y baseline; los pronósticos identifican su versión y confianza.

## 10. Fase 8 — Stock proyectado y recomendaciones supervisadas

- [ ] Implementar proyección determinista por período.
- [ ] Separar stock físico, reservado, disponible, recepciones, producción prevista, compromisos y demanda pronosticada.
- [ ] Implementar punto de reorden y stock de seguridad según distribución/lead time.
- [ ] Implementar alertas de agotamiento y exceso.
- [ ] Implementar explicación de recomendación, restricciones y expiración.
- [ ] Implementar aprobación/rechazo/modificación con auditoría.
- [ ] Revalidar stock y restricciones al aprobar.
- [ ] Convertir recomendación a propuesta de compra/orden mediante servicios existentes.
- [ ] Evitar conversión doble con idempotencia.
- [ ] Implementar feedback de predicción vs demanda real.

**Gate F8:** ML recomienda; solo usuarios autorizados convierten; una recomendación caducada no se ejecuta.

## 11. Fase 9 — Frontend, observabilidad y despliegue

- [ ] Crear contenedores/páginas Producción y Inteligencia de Stock.
- [ ] Añadir cargadores lazy en `frontend/src/app/rutas/cargadores.ts`.
- [ ] Integrar menú y funcionalidades según autorización.
- [ ] Mostrar real vs pronosticado, intervalos, stock proyectado y timestamp.
- [ ] Crear pantallas de configuración de horizonte por empresa/producto/almacén.
- [ ] Crear dashboard de alertas/recomendaciones y aprobaciones.
- [ ] Crear vistas de modelos, calidad, cobertura y última ejecución.
- [ ] Añadir métricas/logs de workers y jobs.
- [ ] Añadir health checks y alertas.
- [ ] Ejecutar `uv run pytest` y `ruff check` según configuración backend.
- [ ] Ejecutar `pnpm check`, `pnpm test:coverage` y `pnpm e2e` según scripts vigentes.
- [ ] Probar upgrade en copia de DB tenant y creación de tenant nuevo.
- [ ] Desplegar primero en entorno piloto y mantener feature flags.
- [ ] Documentar rollback y restauración.

**Gate F9:** pruebas backend/frontend aprobadas, aislamiento multi-tenant verificado, migraciones validadas y plan de rollback probado.

## 12. Orden recomendado de PR

1. `docs: audit inventory, tenant and integration contracts`
2. `feat(produccion): add domain foundation and permissions`
3. `feat(produccion): add BOM routes and work centers`
4. `feat(produccion): add work orders and execution`
5. `feat(produccion): integrate inventory movements`
6. `feat(produccion): add MRP and material planning`
7. `feat(produccion): add order costing`
8. `feat(ml): add tenant-safe historical pipeline`
9. `feat(ml): add forecasting baselines and evaluation`
10. `feat(ml): add stock projection and recommendations`
11. `feat(frontend): add production and intelligent stock UI`
12. `test: add end-to-end production and ML acceptance coverage`

Cada PR debe ser revisable, contener pruebas y no mezclar refactorizaciones ajenas al alcance.

## 13. Comandos de verificación (ajustar a scripts vigentes)

```bash
# Backend
cd backend
uv sync
uv run pytest
uv run ruff check .

# Frontend
cd ../frontend
pnpm install
pnpm check
pnpm test:coverage
pnpm e2e
```

No ejecutar migraciones contra bases productivas desde desarrollo. Usar copias aisladas y verificar todos los tenants de prueba.

## 14. Definition of Done

Una fase se considera terminada únicamente cuando:
- cumple reglas de negocio y autorización;
- incluye tests automatizados relevantes;
- tiene migración compatible cuando modifica esquema;
- conserva aislamiento tenant;
- registra auditoría e idempotencia en operaciones críticas;
- actualiza documentación y OpenAPI;
- pasa checks de backend/frontend aplicables;
- tiene evidencia de integración con el servicio dueño de los datos;
- no introduce duplicación de catálogos ni de movimientos.

## 15. Riesgos principales y mitigación

| Riesgo | Mitigación |
|---|---|
| Movimientos históricos no representan demanda real | Definir hechos de demanda y reconciliar ventas/devoluciones |
| Stockout censura demanda | Marcar disponibilidad y usar métodos apropiados |
| Tenant ContextVar ausente en worker | Resolver tenant validado y establecer contexto explícito por job |
| Esquema no se replica a tenants nuevos | Gate de migración y prueba de bootstrap |
| Doble conteo en MRP | Ledger de demanda/recepciones con origen único |
| Recomendación desactualizada | TTL y recálculo al aprobar |
| ML con pocos datos | Baseline y fallback jerárquico |
| Costeo duplica ficha de costo | Delimitar costo industrial por orden frente a ficha comercial |
| Integración parcial con inventario | Transacción compartida u outbox + conciliación |
| Complejidad operativa excesiva | MVP sin microservicios; escalar workers/cola por métricas |

## 16. Primer sprint ejecutable

El primer sprint no implementa todavía ML ni órdenes. Cierra las incertidumbres del sistema existente:

1. Trazar creación, confirmación, anulación y saldo de un movimiento.
2. Trazar compra/recepción y venta/devolución hasta el movimiento.
3. Identificar cómo se resuelve tenant, empresa y almacén.
4. Verificar unidades de medida y costos.
5. Mapear permisos y rutas.
6. Probar creación de tenant y migración Alembic.
7. Escribir el informe de auditoría y ADRs de integración.

**Resultado del primer sprint:** contratos de integración verificables y diseño listo para la primera migración de Producción.
