# Arquitectura técnica: Producción + Inteligencia de Stock

**Proyecto:** ERP Caguayo  
**Estado:** propuesta técnica aprobada para implementación incremental  
**Rama de trabajo:** `feature/arquitectura-produccion-ml` (creada desde `podman`)  
**Alcance:** producción mixta, inventario híbrido, costeo completo y predicción ML supervisada.

## 1. Objetivo

Integrar en Caguayo un dominio de Producción y una plataforma de inteligencia de stock que comparta los datos transaccionales del ERP, sin duplicar productos, existencias, movimientos, compras ni ventas.

La solución tiene dos planos:

- **Plano transaccional:** registra operaciones empresariales confirmadas y mantiene sus invariantes.
- **Plano analítico/predictivo:** extrae históricos, entrena modelos, pronostica demanda, proyecta existencias y propone acciones.

Los modelos ML nunca escriben directamente en tablas transaccionales ni ejecutan compras, reservas, consumos o fabricación. Toda acción pasa por los casos de uso del ERP y por autorización humana.

## 2. Decisiones arquitectónicas

| Dimensión | Decisión |
|---|---|
| Estilo | Monolito modular por dominios; workers separados para tareas asíncronas |
| Producción | Discreta, por lotes/procesos y ensamblaje |
| Alcance | BOM, rutas, centros de trabajo, MRP, órdenes, ejecución, mermas, trazabilidad y costos |
| Inventario | Híbrido: cálculos/propuestas automáticos y confirmación supervisada |
| Costos | Materiales reales, mano de obra, costos indirectos, variaciones y WIP |
| ML | Pronóstico de demanda y cálculo determinista de stock proyectado |
| Horizonte | Configurable por empresa, producto/familia y almacén; horizonte y granularidad versionados |
| Granularidad | Tenant + empresa + producto + almacén/dependencia + período |
| Autonomía | Supervisada; ninguna acción transaccional autónoma |
| Datos | Extracción automática de las bases tenant del ERP |
| Persistencia | PostgreSQL existente, con tablas de dominio nuevas y separación lógica |
| API | FastAPI bajo `/api/v1` |
| Frontend | React + TypeScript siguiendo contenedores y rutas existentes |

## 3. Hallazgos del repositorio que condicionan el diseño

La rama `podman` inspeccionada muestra:

- Backend en `backend/src/`, no en `backend/app/`.
- Registro de modelos en `backend/src/models/__init__.py`.
- La aplicación importa modelos y routers desde `backend/main.py` y `backend/src/routes/api.py`.
- Conexiones multi-tenant mediante `ContextVar` en `backend/src/database/connection.py`; los engines se cachean por nombre de base de datos.
- Modelos existentes `Productos`, `Movimiento`, `Saldo`, `Compra`, `Ventas` y `FichaCosto`.
- `Saldo` es un snapshot acumulado por producto y dependencia; documenta que solo incluye movimientos confirmados.
- `Movimiento` tiene estados, tipo con factor, producto y dependencia; es una fuente histórica central, pero se debe verificar su ciclo completo de confirmación/anulación antes de usarla como verdad analítica.
- El frontend usa `frontend/src/container/` y cargadores lazy en `frontend/src/app/rutas/cargadores.ts`.
- Alembic está en `backend/alembic`; `backend/alembic/env.py` importa `SQLModel` desde `src.models`.
- README documenta Python 3.13+, FastAPI, SQLModel, PostgreSQL y uv.

**Regla de integración:** extender estas convenciones. No crear `backend/app/`, un segundo catálogo de productos, un segundo saldo, ni una base de datos paralela de inventario.

### 3.1 Multi-tenancy

El contexto tenant debe resolverse en el proceso API mediante el mecanismo existente. Para workers no existe un request middleware que establezca el contexto: cada mensaje de trabajo debe transportar un identificador tenant validado y el worker debe establecer explícitamente el contexto de base de datos antes de abrir sesiones.

No confiar en un nombre de base de datos arbitrario suministrado por el cliente. Resolver tenant desde un registro/control plane autorizado y validar allowlist/credenciales.

No se comparten datasets, features, modelos específicos de tenant ni pronósticos entre clientes. Un modelo global solo se podrá introducir en el futuro mediante un proceso explícito de anonimización/consentimiento y evaluación; no forma parte del MVP.

### 3.2 Empresa, almacén y dependencia

La granularidad requerida es tenant + empresa + producto + almacén + fecha. En el esquema actual existen `Dependencia` y `id_dependencia` en movimientos/saldos. No asumir que toda dependencia es almacén ni que dependencia equivale a empresa: verificar catálogo y reglas funcionales en la auditoría de inventario.

Definir una interfaz de contexto analítico que resuelva:
- tenant_id lógico (sin exponer credenciales);
- empresa_id, si existe como entidad explícita;
- warehouse_id / id_dependencia;
- product_id / id_producto;
- unidad base y conversiones;
- moneda y zona horaria aplicables.

Si el esquema actual no contiene una empresa explícita por tenant, documentar la equivalencia de negocio y no inventar una FK.

## 4. Contextos y límites de dominio

### 4.1 Producción

Responsabilidades:
- productos fabricables y políticas de fabricación;
- BOM versionadas multinivel;
- rutas y operaciones;
- centros de trabajo, calendarios y capacidad;
- planificación y MRP;
- órdenes y transiciones de estado;
- reservas, consumos, devoluciones y mermas;
- resultados, lotes, calidad y trazabilidad;
- WIP y costos reales/estándar.

### 4.2 Inteligencia de stock

Responsabilidades:
- extracción automática de hechos históricos;
- dataset/feature snapshots reproducibles;
- entrenamiento y evaluación temporal;
- registro/versionado de modelos;
- pronósticos con intervalos;
- stock proyectado y riesgo de agotamiento;
- alertas, recomendaciones y feedback.

### 4.3 Integraciones

- **Inventario:** consultar disponibilidad y ejecutar movimientos a través de servicios/casos de uso existentes; nunca SQL directo a tablas de otro dominio.
- **Compras:** generar propuestas de abastecimiento; convertirlas a documentos de compra solo tras aprobación.
- **Ventas:** extraer demanda observada, distinguiendo ventas, devoluciones, anulaciones y períodos de rotura de stock.
- **Contabilidad/costos:** producción acumula costos; contabilidad determina cuentas y asientos. Reutilizar `FichaCosto` solo donde su semántica coincida; no confundir ficha/precio de costo con costeo real por orden.
- **RRHH:** si se utiliza nómina/asistencia para mano de obra, consumir servicios o vistas autorizadas y definir reglas de imputación; no acoplar producción a tablas internas de RRHH.

## 5. Arquitectura lógica y despliegue

### 5.1 Procesos

1. **API FastAPI:** endpoints, autenticación, autorización, validación y casos de uso.
2. **Worker de extracción:** lectura incremental por tenant y persistencia de snapshots analíticos.
3. **Worker ML:** features, entrenamiento, backtesting e inferencia.
4. **Worker de planificación:** cálculo MRP y propuestas deterministas.
5. **Scheduler:** dispara extracción, pronósticos, evaluación y monitorización.

Los workers se ejecutan como procesos independientes. No entrenar ni ejecutar inferencia pesada dentro de una petición HTTP.

### 5.2 Cola y trabajos

MVP: tabla persistente de trabajos en PostgreSQL con estados `PENDING/RUNNING/SUCCEEDED/FAILED/RETRY`, lease/heartbeat, intentos, timestamps y clave idempotente. Scheduler puede ser APScheduler o el mecanismo de despliegue ya adoptado.

Escalar a Celery + Redis solo si métricas de volumen/concurrencia lo justifican. No introducir infraestructura obligatoria antes de medir.

### 5.3 Consistencia

- Operaciones de inventario y producción: transacciones ACID cuando comparten tenant DB.
- Para efectos que cruzan procesos: Transactional Outbox, consumidores idempotentes y reintentos.
- Cada movimiento productivo guarda referencia de origen única (tipo_documento + id_documento + línea + operación).
- Restricción única de idempotencia para impedir doble consumo/entrada.
- ML nunca comparte una transacción con una orden productiva.

## 6. Modelo de dominio de Producción

Prefijo de tablas: `prod_`. Nombres definitivos se ajustan a las convenciones de los modelos actuales.

### 6.1 Configuración y estructura

- `prod_tipo_proceso`: discreto, lote/proceso, ensamblaje.
- `prod_centro_trabajo`: dependencia/ubicación, capacidad, calendario y estado.
- `prod_ruta` y `prod_ruta_operacion`: secuencia, tiempos estándar, centro y precedencias.
- `prod_bom`: cabecera de lista de materiales, producto fabricado, versión, vigencia y estado.
- `prod_bom_linea`: componente, cantidad, unidad, merma esperada, operación de consumo, opcionalidad y tipo (material/subproducto).
- Las BOM aprobadas y utilizadas por una orden son inmutables. Una modificación crea una nueva versión.
- BOM multinivel admite subensambles y productos fabricados como componentes. Prevenir ciclos en el grafo BOM.

### 6.2 Ejecución

- `prod_orden`: tenant implícito por DB, empresa/contexto, producto, almacén destino, cantidad, BOM/ruta snapshot, fechas, prioridad, estado y versión de concurrencia.
- `prod_orden_operacion`: operación, centro, secuencia, cantidades, tiempos, estado y operador.
- `prod_reserva`: material, almacén, cantidad, estado y referencia al movimiento/servicio de inventario.
- `prod_consumo`: material, cantidad real, unidad, lote origen y movimiento inventario asociado.
- `prod_devolucion`: material devuelto y movimiento asociado.
- `prod_resultado`: cantidad buena, rechazada, lote terminado, ubicación y recepción inventario.
- `prod_merma`: cantidad, causa, operación y tratamiento.
- `prod_lote` / `prod_trazabilidad_lote`: genealogía de lotes origen-destino cuando el inventario soporte lotes.
- `prod_historial_estado`: transición, usuario, fecha, motivo y correlación.
- `prod_evento_outbox`: eventos transaccionales pendientes de publicar.

### 6.3 Costos

- `prod_costo_orden`: versión de cálculo, estado, total materiales, mano de obra, indirectos, WIP y costo unitario.
- `prod_costo_detalle`: concepto, fuente, cantidad, tarifa, moneda, importe y referencia documental.
- `prod_tasa_centro`: tasa por centro/actividad con vigencia.
- `prod_variacion_costo`: variaciones de cantidad, precio, eficiencia y absorción.
- `prod_imputacion_contable`: referencia externa al asiento/documento contable; no duplicar libro mayor.

Todos los importes y cantidades usan Decimal/NUMERIC con precisión explícita, nunca float. Guardar moneda, tipo de cambio y fecha de valoración cuando aplique.

## 7. Estados y reglas de órdenes

Estados base:
`BORRADOR -> PLANIFICADA -> APROBADA -> EN_PRODUCCION -> FINALIZADA -> CERRADA`.

Estados laterales: `SUSPENDIDA`, `CANCELADA`; transiciones explícitas y validadas en backend.

Reglas:
- Planificar requiere producto fabricable, BOM/ruta vigentes, cantidad y fechas válidas.
- Aprobar requiere permisos, verificación de capacidad y política de materiales.
- Iniciar requiere recursos y reservas según política.
- Suspender exige motivo y conserva consumos.
- Finalizar requiere registrar producción buena/rechazada, consumos, devoluciones y mermas; admite producción parcial si se configura.
- Cerrar requiere conciliación de inventario y costeo; una orden cerrada no se edita.
- Correcciones se realizan con documentos compensatorios auditables.
- Cancelar una orden con movimientos no borra ni altera el histórico; requiere reversos explícitos.

Controlar concurrencia mediante versionado optimista o bloqueo de fila. Las transiciones se implementan como casos de uso, no como PATCH arbitrario.

## 8. Integración híbrida de inventario

| Acción | Comportamiento |
|---|---|
| Consultar existencias/saldos | Automático, solo lectura |
| Explosión BOM y cálculo de necesidades | Automático |
| Proponer reserva | Automático |
| Confirmar reserva | Usuario autorizado |
| Proponer consumo por backflush | Automático si la política lo permite |
| Confirmar consumo | Operario/supervisor según configuración |
| Devoluciones y mermas | Supervisadas |
| Proponer recepción de producto terminado | Automático |
| Confirmar entrada | Usuario autorizado |
| Reversar movimiento | Documento compensatorio autorizado |

Las integraciones llaman servicios de inventario. No insertar directamente en `movimiento` ni recalcular `saldos` desde Producción.

Antes de implementar, documentar el servicio actual de confirmación/anulación de movimientos, factores de `TipoMovimiento`, estados, reglas de dependencia y transacción.

## 9. MRP y planificación

ML pronostica demanda; MRP calcula necesidades deterministas.

Flujo:
1. Seleccionar pronóstico aprobado y horizonte.
2. Incorporar pedidos reales, reservas, órdenes abiertas y demanda independiente.
3. Explosión multinivel de BOM según versión/fecha.
4. Calcular necesidades brutas por período.
5. Descontar stock utilizable, reservas, recepciones confirmadas y producción prevista sin doble conteo.
6. Aplicar stock de seguridad, lote mínimo, múltiplos, lead time y calendario.
7. Generar propuestas de fabricación o compra.
8. Someter cada propuesta a aprobación.
9. Recalcular al aprobar para evitar usar datos obsoletos.

No sumar ventas reales y pronóstico para el mismo período sin una política que evite duplicar demanda. El horizonte, bucket (día/semana/mes) y fecha de corte son parte de cada corrida MRP.

## 10. Diseño de inteligencia de stock

### 10.1 Pipeline automático

- Extraer desde cada tenant los movimientos confirmados, ventas/detalles, compras/recepciones, devoluciones, ajustes y producción.
- Mantener watermark por fuente y tenant; soportar backfill y re-procesamiento.
- Construir hechos diarios por tenant/empresa/producto/almacén/unidad.
- Registrar stockout/censura de demanda; no tratar ventas cero por falta de stock como demanda cero.
- Normalizar zona horaria, calendario, moneda y unidades.
- Validar duplicados, negativos, fechas, estados y consistencia con saldos.
- Guardar snapshots reproducibles del dataset y la versión del pipeline.

### 10.2 Modelos candidatos

Baseline obligatorio: naive estacional/media móvil y suavizado exponencial.

Candidatos:
- StatsForecast/Statsmodels para series estadísticas.
- LightGBM o CatBoost con features temporales y covariables.
- Croston/SBA/TSB para demanda intermitente.

LSTM/TFT no forman parte del MVP. Solo se evalúan si backtesting y volumen de datos justifican complejidad adicional.

Selección por familia/segmento según desempeño fuera de muestra; no forzar un modelo distinto por SKU si no hay suficiente historia. Fallback jerárquico: SKU-almacén -> SKU-empresa -> familia/segmento -> baseline, dejando explícita la procedencia y menor confianza.

### 10.3 Features

Lags y rolling features solo con datos disponibles al instante de corte: demanda rezagada, medias/desviaciones móviles, día/semana/mes, festivos, promociones/precio cuando existan, stockout, lead time observado, recepciones pendientes, órdenes abiertas y calendario de producción.

Evitar data leakage. Separar ventas observadas de demanda no satisfecha. No entrenar con información posterior al timestamp de predicción.

### 10.4 Horizonte configurable

Configuración por tenant/empresa/familia/producto/almacén:
- horizontes en días o semanas;
- frecuencia de buckets;
- fecha de inicio y corte;
- nivel de servicio;
- política de stock de seguridad;
- frecuencia de recalcular pronóstico.

Persistir configuración efectiva y su versión junto a cada corrida. Limitar rangos máximos para controlar costo computacional.

### 10.5 Evaluación y operación

Backtesting con ventanas temporales rolling-origin. Métricas: MAE, RMSE, WAPE, MASE y sesgo; no usar MAPE como métrica primaria con ceros. Evaluar por horizonte, SKU/familia, almacén y nivel agregado. Comparar siempre contra baseline.

Modelo se promociona solo si supera criterios mínimos de calidad y no degrada segmentos críticos. Registrar artefacto/version, features, parámetros, dataset snapshot, métricas, período de entrenamiento y aprobador. MLflow es opcional tras validar la necesidad; en MVP se puede iniciar con registro versionado en DB y artefactos protegidos en almacenamiento configurado.

Monitorear data drift, error real vs pronóstico, sesgo, cobertura, fallos y antigüedad del modelo. Si un modelo falla o queda obsoleto, mantener último modelo aprobado o fallback; nunca publicar predicción sin indicar su estado.

## 11. Motor de stock proyectado y recomendaciones

El motor de stock es determinista y consume pronósticos aprobados.

Para cada período:
`stock_proyectado = stock_inicial + recepciones_confirmadas + entradas_produccion - demanda_pronosticada - otros_compromisos`.

Reservas y pedidos deben representarse una sola vez según la definición de stock físico, disponible y proyectado. Mantener separado:
- stock físico;
- stock reservado;
- stock disponible;
- recepciones esperadas;
- producción prevista;
- demanda real comprometida;
- demanda pronosticada.

Punto de reorden y stock de seguridad consideran distribución de demanda y lead time. Usar cuantiles/escenarios empíricos si la demanda no es normal o es intermitente; no aplicar una fórmula normal universal.

Recomendaciones incluyen: tipo, producto, almacén, cantidad sugerida, fecha requerida, horizonte, pronóstico fuente, riesgo, incertidumbre, restricciones (MOQ, múltiplos, capacidad, presupuesto), explicación y expiración.

Estados de recomendación: `BORRADOR, PENDIENTE_APROBACION, APROBADA, RECHAZADA, EXPIRADA, CONVERTIDA, CANCELADA`. Aprobar recalcula disponibilidad y restricciones. Convertir a compra/orden crea documento mediante servicio existente y guarda referencia. Idempotencia evita doble conversión.

## 12. Modelo de datos ML

Prefijo sugerido `ml_`:
- `ml_configuracion`: horizonte, granularidad, nivel de servicio y políticas.
- `ml_ingesta_estado`: watermark por tenant/fuente.
- `ml_dataset_snapshot`: fuente, rango, checksum y versión pipeline.
- `ml_feature_snapshot`: versión/fecha de features o referencia a dataset.
- `ml_modelo` y `ml_modelo_version`: catálogo y versiones.
- `ml_entrenamiento`: job, dataset, parámetros y estado.
- `ml_evaluacion`: métricas por horizonte/segmento.
- `ml_pronostico`: tenant lógico, empresa, producto, almacén, fecha corte, fecha objetivo, horizonte, punto, cuantiles, modelo y versión.
- `ml_stock_proyectado`: componentes del cálculo y saldo por período.
- `ml_alerta_stock`: riesgo, severidad y ventana.
- `ml_recomendacion` y `ml_recomendacion_linea`: propuesta y líneas.
- `ml_feedback`: predicción vs resultado real.
- `ml_job`: trabajos persistentes y reintentos.

Todas las tablas residen en la DB tenant para aislamiento. Usar índices compuestos por empresa/producto/almacén/fecha y restricciones únicas de corrida/objetivo para idempotencia. Guardar valores monetarios y cantidades como NUMERIC. No almacenar secretos ni credenciales tenant en snapshots.

## 13. API propuesta

### Producción: `/api/v1/produccion`
- `GET/POST /listas-materiales`
- `POST /listas-materiales/{id}/versiones`
- `GET/POST /rutas`
- `GET/POST /centros-trabajo`
- `GET/POST /ordenes`
- `POST /ordenes/{id}/planificar`
- `POST /ordenes/{id}/aprobar`
- `POST /ordenes/{id}/iniciar`
- `POST /ordenes/{id}/suspender`
- `POST /ordenes/{id}/consumos`
- `POST /ordenes/{id}/devoluciones`
- `POST /ordenes/{id}/resultados`
- `POST /ordenes/{id}/mermas`
- `POST /ordenes/{id}/finalizar`
- `POST /ordenes/{id}/cerrar`
- `GET /ordenes/{id}/costos`
- `POST /mrp/corridas`, `GET /mrp/corridas/{id}`

### Inteligencia: `/api/v1/inteligencia-stock`
- `GET/PUT /configuracion`
- `GET /pronosticos`, `GET /pronosticos/{producto_id}`
- `GET /stock-proyectado`
- `GET /alertas`
- `GET /recomendaciones`
- `POST /recomendaciones/{id}/aprobar`
- `POST /recomendaciones/{id}/rechazar`
- `POST /recomendaciones/{id}/convertir`
- `POST /entrenamientos` (job asíncrono autorizado)
- `GET /entrenamientos/{id}`
- `GET /modelos`, `GET /modelos/{id}/metricas`

Aplicar paginación, filtros, esquemas DTO, errores consistentes, permisos por acción, límites de horizonte y claves idempotentes en operaciones críticas.

## 14. Frontend

Seguir el patrón existente `frontend/src/container/`, API client y rutas lazy en `frontend/src/app/rutas/cargadores.ts`. No crear una segunda app ni importar páginas pesadas eager en App.

Secciones:
- Producción: dashboard, BOM, rutas, centros, planificación/MRP, órdenes, ejecución, consumos, lotes, costos y reportes.
- Inteligencia de stock: dashboard, demanda pronosticada, stock proyectado, alertas, recomendaciones, configuración y evaluación de modelos.

Mostrar intervalos de incertidumbre, fecha de última actualización, modelo/estado, explicación y fuente de datos. Diferenciar claramente dato real, estimación y recomendación. Aprobación/rechazo debe mostrar impacto, restricciones y usuario responsable.

## 15. Seguridad, auditoría y gobierno

- Reutilizar autenticación y autorización actual; registrar funcionalidades/permisos siguiendo catálogo existente.
- Verificar tenant y empresa en cada endpoint y job.
- Worker con mínimo privilegio y allowlist de bases tenant.
- No permitir acceso cruzado entre tenants.
- Auditoría de cambios de BOM, órdenes, aprobaciones, movimientos, costos y recomendaciones.
- El ML solo lee fuentes transaccionales y escribe sus tablas analíticas.
- Aprobación humana para toda conversión a compra/fabricación/movimiento.
- Recalcular al aprobar una recomendación para evitar ejecutar propuestas caducadas.
- Registrar quién aprobó, rechazó, modificó o convirtió una recomendación y por qué.

## 16. Observabilidad y resiliencia

Métricas técnicas:
- duración y tasa de error de jobs;
- lag de ingesta por fuente/tenant;
- tiempo de inferencia;
- última corrida exitosa;
- modelos obsoletos;
- porcentaje de productos cubiertos;
- fallos de integración y reintentos.

Métricas de negocio:
- WAPE/MAE/sesgo;
- roturas de stock;
- nivel de servicio;
- inventario excedente;
- compras urgentes;
- cumplimiento de producción;
- variación de costo.

Alertas de datos faltantes, modelo degradado y recomendación desactualizada. Retención configurable y exportación auditable.

## 17. Decisiones pendientes de auditoría (no inventar)

Antes de la primera migración productiva, confirmar en el código:
1. Servicio real de confirmar/anular movimientos y cálculo de `Saldo`.
2. Semántica de estados de compras/ventas y detalle de devoluciones.
3. Cómo se modelan almacenes, dependencias y empresas.
4. Catálogo/unidad de medida y conversiones.
5. Disponibilidad real de lotes, vencimientos y trazabilidad.
6. Servicio y reglas de autorización/funcionalidades.
7. Contabilidad: plan de cuentas, asientos y valoración de inventario.
8. Cómo se registran recepciones parciales y lead time real de proveedores.
9. Patrón de registro de routers y frontend containers.
10. Estrategia de migración para todas las bases tenant y el flujo de creación de nuevas bases.

No crear tablas ni migraciones hasta cerrar estas comprobaciones y verificar el mecanismo de replicación de esquema a nuevos tenants.

## 18. Criterios de aceptación arquitectónica

- Producción usa el catálogo y servicios existentes.
- Una orden puede seguirse desde BOM hasta consumo, lote terminado y costo.
- Ningún movimiento duplicado aunque se repita una petición.
- Ningún tenant puede consultar datos de otro.
- Las predicciones son reproducibles y trazables a dataset/modelo/version.
- Backtesting temporal compara contra baseline.
- Recomendaciones no cambian datos transaccionales sin aprobación.
- MRP descuenta compromisos y recepciones sin doble conteo.
- Worker puede reintentarse sin duplicar resultados.
- Migraciones funcionan en base existente y en tenant nuevo.
- Pruebas cubren concurrencia, reversos, aislamiento y fallos de integración.
