-- ============================================================
-- Esquema de la base de datos (PostgreSQL)
-- Generado desde los modelos SQLModel del backend
-- Fecha: 2026-10-01 13:58:22
-- Uso: psql -d <base_de_datos> -f schema.sql
-- ============================================================

BEGIN;

CREATE TYPE estadoventa AS ENUM ('PENDIENTE', 'COMPLETADA', 'ANULADA');

CREATE TABLE moneda (
	id_moneda SERIAL NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	denominacion VARCHAR(100) NOT NULL, 
	simbolo VARCHAR(5) NOT NULL, 
	PRIMARY KEY (id_moneda), 
	UNIQUE (nombre), 
	UNIQUE (simbolo)
);

CREATE TABLE categorias (
	id_categoria SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_categoria), 
	UNIQUE (nombre)
);

CREATE TABLE tipo_movimiento (
	id_tipo_movimiento SERIAL NOT NULL, 
	tipo VARCHAR(20) NOT NULL, 
	factor INTEGER NOT NULL, 
	PRIMARY KEY (id_tipo_movimiento), 
	UNIQUE (tipo)
);

CREATE TABLE tipo_dependencia (
	id_tipo_dependencia SERIAL NOT NULL, 
	nombre VARCHAR(20) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_dependencia), 
	UNIQUE (nombre)
);

CREATE TABLE provincia (
	id_provincia SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id_provincia), 
	UNIQUE (nombre)
);

CREATE TABLE transaccion (
	id_transaccion SERIAL NOT NULL, 
	PRIMARY KEY (id_transaccion)
);

CREATE TABLE tipo_convenio (
	id_tipo_convenio SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_convenio)
);

CREATE TABLE tipo_cliente (
	id_tipo_cliente SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_cliente)
);

CREATE TABLE tipo_proveedor (
	id_tipo_proveedor SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_proveedor)
);

CREATE TABLE tipo_contrato (
	id_tipo_contrato SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_contrato), 
	UNIQUE (nombre)
);

CREATE TABLE estado_contrato (
	id_estado_contrato SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_estado_contrato), 
	UNIQUE (nombre)
);

CREATE TABLE tipo_entidad (
	id_tipo_entidad SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_tipo_entidad), 
	UNIQUE (nombre)
);

CREATE TABLE grupo (
	id_grupo SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_grupo), 
	UNIQUE (nombre)
);

CREATE TABLE funcionalidad (
	id_funcionalidad SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id_funcionalidad), 
	UNIQUE (nombre)
);

CREATE TABLE conexion_database (
	id_conexion SERIAL NOT NULL, 
	host VARCHAR(100) NOT NULL, 
	puerto INTEGER NOT NULL, 
	usuario VARCHAR(100), 
	contrasenia VARCHAR(255), 
	nombre_database VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id_conexion)
);

CREATE TABLE especialidades_artisticas (
	id_especialidad SERIAL NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	categoria VARCHAR(50), 
	activo BOOLEAN NOT NULL, 
	PRIMARY KEY (id_especialidad), 
	UNIQUE (nombre)
);

CREATE TABLE datos_generales_dependencia (
	id_datos_generales SERIAL NOT NULL, 
	direccion VARCHAR(255) NOT NULL, 
	telefono VARCHAR(20) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id_datos_generales)
);

CREATE TABLE ficha_tarifa (
	id_tarifa SERIAL NOT NULL, 
	categoria VARCHAR(150) NOT NULL, 
	tarifa_horaria NUMERIC(20, 6) NOT NULL, 
	PRIMARY KEY (id_tarifa)
);

CREATE INDEX idx_ficha_tarifa_categoria ON ficha_tarifa (categoria);

CREATE TABLE subcategorias (
	id_subcategoria SERIAL NOT NULL, 
	id_categoria INTEGER NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_subcategoria), 
	CONSTRAINT subcategorias_id_categoria_nombre_key UNIQUE (id_categoria, nombre), 
	FOREIGN KEY(id_categoria) REFERENCES categorias (id_categoria)
);

CREATE TABLE municipio (
	id_municipio SERIAL NOT NULL, 
	id_provincia INTEGER NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id_municipio), 
	CONSTRAINT municipio_id_provincia_nombre_key UNIQUE (id_provincia, nombre), 
	FOREIGN KEY(id_provincia) REFERENCES provincia (id_provincia)
);

CREATE TABLE grupo_funcionalidad (
	id_grupo INTEGER NOT NULL, 
	id_funcionalidad INTEGER NOT NULL, 
	PRIMARY KEY (id_grupo, id_funcionalidad), 
	FOREIGN KEY(id_grupo) REFERENCES grupo (id_grupo), 
	FOREIGN KEY(id_funcionalidad) REFERENCES funcionalidad (id_funcionalidad)
);

CREATE TABLE servicios (
	id_servicio SERIAL NOT NULL, 
	codigo_servicio VARCHAR(50), 
	concepto VARCHAR, 
	unidad_medida VARCHAR(20), 
	precio NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	observaciones VARCHAR, 
	PRIMARY KEY (id_servicio), 
	UNIQUE (codigo_servicio), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE productos (
	id_producto SERIAL NOT NULL, 
	codigo VARCHAR(50), 
	id_subcategoria INTEGER NOT NULL, 
	nombre VARCHAR(150) NOT NULL, 
	descripcion VARCHAR, 
	moneda_compra INTEGER NOT NULL, 
	precio_compra NUMERIC NOT NULL, 
	moneda_venta INTEGER NOT NULL, 
	precio_venta NUMERIC NOT NULL, 
	precio_minimo NUMERIC NOT NULL, 
	PRIMARY KEY (id_producto), 
	UNIQUE (codigo), 
	FOREIGN KEY(id_subcategoria) REFERENCES subcategorias (id_subcategoria), 
	FOREIGN KEY(moneda_compra) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(moneda_venta) REFERENCES moneda (id_moneda)
);

CREATE INDEX idx_productos_subcategoria ON productos (id_subcategoria);

CREATE INDEX idx_productos_codigo ON productos (codigo);

CREATE TABLE clientes (
	id_cliente SERIAL NOT NULL, 
	nombre VARCHAR(200) NOT NULL, 
	tipo_persona VARCHAR(20), 
	nit VARCHAR(20) NOT NULL, 
	telefono VARCHAR(20), 
	email VARCHAR(100), 
	fax VARCHAR(20), 
	web VARCHAR(100), 
	id_provincia INTEGER, 
	id_municipio INTEGER, 
	codigo VARCHAR(50) NOT NULL, 
	codigo_postal VARCHAR(10), 
	direccion VARCHAR, 
	tipo_relacion VARCHAR(20) NOT NULL, 
	estado VARCHAR(20) NOT NULL, 
	fecha_registro DATE NOT NULL, 
	PRIMARY KEY (id_cliente), 
	UNIQUE (nit), 
	FOREIGN KEY(id_provincia) REFERENCES provincia (id_provincia), 
	FOREIGN KEY(id_municipio) REFERENCES municipio (id_municipio), 
	UNIQUE (codigo)
);

CREATE INDEX idx_clientes_nit ON clientes (nit);

CREATE INDEX idx_convenio_cliente ON clientes (id_cliente);

CREATE INDEX idx_clientes_codigo ON clientes (codigo);

CREATE TABLE dependencia (
	id_dependencia SERIAL NOT NULL, 
	id_tipo_dependencia INTEGER NOT NULL, 
	codigo_padre INTEGER, 
	nombre VARCHAR(100) NOT NULL, 
	denominacion VARCHAR(3) NOT NULL, 
	nit VARCHAR(20), 
	reeup VARCHAR(15), 
	direccion VARCHAR(255) NOT NULL, 
	telefono VARCHAR(20) NOT NULL, 
	email VARCHAR(100), 
	web VARCHAR(100), 
	base_datos VARCHAR(100), 
	host VARCHAR(100), 
	puerto INTEGER, 
	id_provincia INTEGER, 
	id_municipio INTEGER, 
	descripcion VARCHAR, 
	PRIMARY KEY (id_dependencia), 
	FOREIGN KEY(id_tipo_dependencia) REFERENCES tipo_dependencia (id_tipo_dependencia), 
	FOREIGN KEY(codigo_padre) REFERENCES dependencia (id_dependencia), 
	UNIQUE (nit), 
	FOREIGN KEY(id_provincia) REFERENCES provincia (id_provincia), 
	FOREIGN KEY(id_municipio) REFERENCES municipio (id_municipio)
);

CREATE INDEX idx_dependencia_padre ON dependencia (codigo_padre);

CREATE INDEX idx_dependencia_tipo ON dependencia (id_tipo_dependencia);

CREATE TABLE clientes_persona_natural (
	id_cliente INTEGER NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	primer_apellido VARCHAR(50) NOT NULL, 
	segundo_apellido VARCHAR(50), 
	carnet_identidad VARCHAR(11) NOT NULL, 
	codigo_expediente VARCHAR(50), 
	numero_registro VARCHAR(50), 
	catalogo VARCHAR(100), 
	es_trabajador BOOLEAN NOT NULL, 
	ocupacion VARCHAR(100), 
	centro_trabajo VARCHAR(200), 
	correo_trabajo VARCHAR(100), 
	direccion_trabajo VARCHAR, 
	telefono_trabajo VARCHAR(20), 
	en_baja BOOLEAN NOT NULL, 
	fecha_baja DATE, 
	vigencia DATE, 
	PRIMARY KEY (id_cliente), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	UNIQUE (carnet_identidad)
);

CREATE TABLE clientes_persona_juridica (
	id_cliente INTEGER NOT NULL, 
	codigo_reup VARCHAR(50) NOT NULL, 
	id_tipo_entidad INTEGER, 
	PRIMARY KEY (id_cliente), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	UNIQUE (codigo_reup), 
	FOREIGN KEY(id_tipo_entidad) REFERENCES tipo_entidad (id_tipo_entidad)
);

CREATE TABLE cliente_tcp (
	id_cliente INTEGER NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	primer_apellido VARCHAR(50) NOT NULL, 
	segundo_apellido VARCHAR(50), 
	direccion VARCHAR, 
	numero_registro_proyecto VARCHAR(50), 
	fecha_aprobacion DATE, 
	PRIMARY KEY (id_cliente), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente)
);

CREATE TABLE ventas (
	id_venta SERIAL NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	total NUMERIC NOT NULL, 
	estado estadoventa NOT NULL, 
	observacion VARCHAR, 
	fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_venta), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente) ON DELETE CASCADE
);

CREATE INDEX idx_ventas_estado ON ventas (estado);

CREATE INDEX idx_ventas_fecha ON ventas (fecha);

CREATE INDEX idx_ventas_cliente ON ventas (id_cliente);

CREATE TABLE compras (
	id_compra SERIAL NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	total NUMERIC NOT NULL, 
	estado VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL, 
	observacion VARCHAR, 
	fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_compra), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente) ON DELETE CASCADE
);

CREATE INDEX idx_compras_fecha ON compras (fecha);

CREATE INDEX idx_compras_estado ON compras (estado);

CREATE INDEX idx_compras_cliente ON compras (id_cliente);

CREATE TABLE saldos (
	id_saldo SERIAL NOT NULL, 
	id_producto INTEGER NOT NULL, 
	id_dependencia INTEGER NOT NULL, 
	fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	saldo NUMERIC(15, 4) NOT NULL, 
	PRIMARY KEY (id_saldo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia)
);

CREATE INDEX idx_saldos_producto_dependencia_fecha ON saldos (id_producto, id_dependencia, fecha);

CREATE TABLE convenio (
	id_convenio SERIAL NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	nombre_convenio VARCHAR(200) NOT NULL, 
	fecha DATE NOT NULL, 
	vigencia DATE NOT NULL, 
	id_tipo_convenio INTEGER NOT NULL, 
	codigo VARCHAR(50), 
	PRIMARY KEY (id_convenio), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente) ON DELETE CASCADE, 
	FOREIGN KEY(id_tipo_convenio) REFERENCES tipo_convenio (id_tipo_convenio)
);

CREATE TABLE contrato (
	id_contrato SERIAL NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	nombre VARCHAR(200) NOT NULL, 
	proforma VARCHAR(100), 
	id_estado INTEGER NOT NULL, 
	fecha DATE NOT NULL, 
	vigencia DATE NOT NULL, 
	id_tipo_contrato INTEGER NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	monto NUMERIC NOT NULL, 
	documento_final VARCHAR(255), 
	codigo VARCHAR(50), 
	PRIMARY KEY (id_contrato), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente) ON DELETE CASCADE, 
	FOREIGN KEY(id_estado) REFERENCES estado_contrato (id_estado_contrato), 
	FOREIGN KEY(id_tipo_contrato) REFERENCES tipo_contrato (id_tipo_contrato), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE INDEX idx_contrato_tipo ON contrato (id_tipo_contrato);

CREATE INDEX idx_contrato_cliente ON contrato (id_cliente);

CREATE INDEX idx_contrato_estado ON contrato (id_estado);

CREATE INDEX idx_contrato_moneda ON contrato (id_moneda);

CREATE TABLE venta_efectivo (
	id_venta_efectivo SERIAL NOT NULL, 
	slip VARCHAR(100) NOT NULL, 
	fecha DATE NOT NULL, 
	id_dependencia INTEGER NOT NULL, 
	cajero VARCHAR(100) NOT NULL, 
	monto NUMERIC NOT NULL, 
	codigo VARCHAR(100), 
	PRIMARY KEY (id_venta_efectivo), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia)
);

CREATE INDEX idx_venta_efectivo_dependencia ON venta_efectivo (id_dependencia);

CREATE INDEX idx_venta_efectivo_fecha ON venta_efectivo (fecha);

CREATE TABLE cuenta (
	id_cuenta SERIAL NOT NULL, 
	id_cliente INTEGER, 
	id_dependencia INTEGER, 
	id_moneda INTEGER, 
	titular VARCHAR(150) NOT NULL, 
	banco VARCHAR(100) NOT NULL, 
	sucursal INTEGER, 
	numero_cuenta VARCHAR(50) NOT NULL, 
	direccion VARCHAR(255) NOT NULL, 
	PRIMARY KEY (id_cuenta), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE INDEX idx_cuenta_cliente ON cuenta (id_cliente);

CREATE INDEX idx_cuenta_dependencia ON cuenta (id_dependencia);

CREATE TABLE usuarios (
	id_usuario SERIAL NOT NULL, 
	ci VARCHAR(20) NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	primer_apellido VARCHAR(100) NOT NULL, 
	segundo_apellido VARCHAR(100), 
	cargo VARCHAR(200) NOT NULL, 
	alias VARCHAR(50) NOT NULL, 
	contrasenia VARCHAR(255) NOT NULL, 
	contrasenia_plana VARCHAR(255), 
	id_grupo INTEGER NOT NULL, 
	id_dependencia INTEGER, 
	PRIMARY KEY (id_usuario), 
	UNIQUE (ci), 
	UNIQUE (alias), 
	FOREIGN KEY(id_grupo) REFERENCES grupo (id_grupo), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia)
);

CREATE INDEX idx_usuarios_dependencia ON usuarios (id_dependencia);

CREATE INDEX idx_usuarios_grupo ON usuarios (id_grupo);

CREATE TABLE cuenta_dependencias (
	id_cuenta SERIAL NOT NULL, 
	id_dependencia INTEGER NOT NULL, 
	id_moneda INTEGER, 
	titular VARCHAR(150) NOT NULL, 
	banco VARCHAR(100) NOT NULL, 
	sucursal INTEGER, 
	numero_cuenta VARCHAR(50) NOT NULL, 
	direccion VARCHAR(255) NOT NULL, 
	PRIMARY KEY (id_cuenta), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE ficha_costo (
	id_ficha SERIAL NOT NULL, 
	id_producto INTEGER NOT NULL, 
	numero_ficha VARCHAR(50) NOT NULL, 
	nivel_produccion NUMERIC(20, 6) NOT NULL, 
	pct_energia NUMERIC(22, 16) NOT NULL, 
	pct_agua NUMERIC(22, 16) NOT NULL, 
	pct_otros_gastos_directos NUMERIC(22, 16) NOT NULL, 
	pct_vacaciones NUMERIC(22, 16) NOT NULL, 
	coef_gastos_asociados NUMERIC(22, 16) NOT NULL, 
	coef_gastos_generales NUMERIC(22, 16) NOT NULL, 
	coef_gastos_distribucion NUMERIC(22, 16) NOT NULL, 
	coef_gastos_financieros NUMERIC(22, 16) NOT NULL, 
	pct_seguridad_social NUMERIC(22, 16) NOT NULL, 
	pct_fuerza_trabajo NUMERIC(22, 16) NOT NULL, 
	pct_utilidad NUMERIC(22, 16) NOT NULL, 
	pct_impuesto_ventas NUMERIC(22, 16) NOT NULL, 
	gasto_combustible NUMERIC(20, 6) NOT NULL, 
	gasto_osde NUMERIC(20, 6) NOT NULL, 
	total_insumos NUMERIC(20, 6) NOT NULL, 
	gasto_energia NUMERIC(20, 6) NOT NULL, 
	gasto_agua NUMERIC(20, 6) NOT NULL, 
	gasto_material NUMERIC(20, 6) NOT NULL, 
	salario_directo NUMERIC(20, 6) NOT NULL, 
	vacaciones NUMERIC(20, 6) NOT NULL, 
	salario_total NUMERIC(20, 6) NOT NULL, 
	otros_gastos_directos NUMERIC(20, 6) NOT NULL, 
	gastos_asociados NUMERIC(20, 6) NOT NULL, 
	costo_total NUMERIC(20, 6) NOT NULL, 
	gastos_generales NUMERIC(20, 6) NOT NULL, 
	gastos_distribucion NUMERIC(20, 6) NOT NULL, 
	gastos_financieros NUMERIC(20, 6) NOT NULL, 
	gastos_tributarios NUMERIC(20, 6) NOT NULL, 
	impuesto_ventas NUMERIC(20, 6) NOT NULL, 
	total_gastos NUMERIC(20, 6) NOT NULL, 
	total_costos_gastos NUMERIC(20, 6) NOT NULL, 
	utilidad NUMERIC(20, 6) NOT NULL, 
	precio_tarifa NUMERIC(20, 6) NOT NULL, 
	precio_unitario_ajustado NUMERIC(20, 6) NOT NULL, 
	elaborado_por VARCHAR(200), 
	aprobado_por VARCHAR(200), 
	fecha_elaboracion DATE NOT NULL, 
	fecha_aprobacion DATE, 
	PRIMARY KEY (id_ficha), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto)
);

CREATE INDEX idx_ficha_costo_producto ON ficha_costo (id_producto);

CREATE TABLE detalle_ventas (
	id_detalle SERIAL NOT NULL, 
	id_venta INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio_unitario NUMERIC NOT NULL, 
	subtotal NUMERIC NOT NULL, 
	PRIMARY KEY (id_detalle), 
	FOREIGN KEY(id_venta) REFERENCES ventas (id_venta), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto)
);

CREATE INDEX idx_detalle_venta_producto ON detalle_ventas (id_producto);

CREATE INDEX idx_detalle_venta_venta ON detalle_ventas (id_venta);

CREATE TABLE detalle_compras (
	id_detalle SERIAL NOT NULL, 
	id_compra INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio_unitario NUMERIC NOT NULL, 
	subtotal NUMERIC NOT NULL, 
	PRIMARY KEY (id_detalle), 
	FOREIGN KEY(id_compra) REFERENCES compras (id_compra), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto)
);

CREATE INDEX idx_detalle_compras_compra ON detalle_compras (id_compra);

CREATE INDEX idx_detalle_compras_producto ON detalle_compras (id_producto);

CREATE TABLE anexo (
	id_anexo SERIAL NOT NULL, 
	id_convenio INTEGER NOT NULL, 
	nombre_anexo VARCHAR(200) NOT NULL, 
	fecha DATE NOT NULL, 
	codigo_anexo VARCHAR(50), 
	id_dependencia INTEGER, 
	comision NUMERIC(10, 2), 
	PRIMARY KEY (id_anexo), 
	FOREIGN KEY(id_convenio) REFERENCES convenio (id_convenio), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia)
);

CREATE INDEX idx_anexo_codigo ON anexo (codigo_anexo);

CREATE INDEX idx_anexo_convenio ON anexo (id_convenio);

CREATE INDEX idx_anexo_dependencia ON anexo (id_dependencia);

CREATE TABLE suplemento (
	id_suplemento SERIAL NOT NULL, 
	id_contrato INTEGER NOT NULL, 
	nombre VARCHAR(200) NOT NULL, 
	id_estado INTEGER NOT NULL, 
	fecha DATE NOT NULL, 
	fecha_vigencia DATE NOT NULL, 
	monto NUMERIC NOT NULL, 
	documento VARCHAR(255), 
	codigo VARCHAR(100), 
	PRIMARY KEY (id_suplemento), 
	FOREIGN KEY(id_contrato) REFERENCES contrato (id_contrato), 
	FOREIGN KEY(id_estado) REFERENCES estado_contrato (id_estado_contrato)
);

CREATE INDEX idx_suplemento_contrato ON suplemento (id_contrato);

CREATE INDEX idx_suplemento_estado ON suplemento (id_estado);

CREATE TABLE factura (
	id_factura SERIAL NOT NULL, 
	id_contrato INTEGER NOT NULL, 
	codigo_factura VARCHAR(50) NOT NULL, 
	descripcion VARCHAR, 
	observaciones VARCHAR, 
	fecha DATE NOT NULL, 
	monto NUMERIC NOT NULL, 
	pago_actual NUMERIC NOT NULL, 
	PRIMARY KEY (id_factura), 
	FOREIGN KEY(id_contrato) REFERENCES contrato (id_contrato), 
	UNIQUE (codigo_factura)
);

CREATE INDEX idx_factura_codigo ON factura (codigo_factura);

CREATE INDEX idx_factura_contrato ON factura (id_contrato);

CREATE TABLE sesion (
	id_sesion SERIAL NOT NULL, 
	id_usuario INTEGER NOT NULL, 
	token VARCHAR(500) NOT NULL, 
	base_datos VARCHAR(100) NOT NULL, 
	fecha_login TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	fecha_expiracion TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id_sesion), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario), 
	UNIQUE (token)
);

CREATE TABLE log (
	id SERIAL NOT NULL, 
	timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	nivel VARCHAR(20) NOT NULL, 
	tipo VARCHAR(20) NOT NULL, 
	mensaje VARCHAR(500) NOT NULL, 
	detalle VARCHAR(2000), 
	ip VARCHAR(50), 
	usuario_id INTEGER, 
	endpoint VARCHAR(200), 
	method VARCHAR(10), 
	status_code INTEGER, 
	usuario_nombre VARCHAR(100), 
	navegador VARCHAR(100), 
	PRIMARY KEY (id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id_usuario)
);

CREATE TABLE ficha_insumo (
	id_ficha_insumo SERIAL NOT NULL, 
	id_ficha INTEGER NOT NULL, 
	id_producto INTEGER, 
	codigo VARCHAR(50) NOT NULL, 
	nombre VARCHAR(150) NOT NULL, 
	um VARCHAR(20), 
	norma_consumo NUMERIC(20, 6) NOT NULL, 
	precio_unitario NUMERIC(20, 6) NOT NULL, 
	costo NUMERIC(20, 6) NOT NULL, 
	PRIMARY KEY (id_ficha_insumo), 
	FOREIGN KEY(id_ficha) REFERENCES ficha_costo (id_ficha), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto)
);

CREATE INDEX idx_ficha_insumo_ficha ON ficha_insumo (id_ficha);

CREATE TABLE ficha_mano_obra (
	id_ficha_mano_obra SERIAL NOT NULL, 
	id_ficha INTEGER NOT NULL, 
	id_tarifa INTEGER, 
	categoria VARCHAR(150) NOT NULL, 
	tarifa_horaria NUMERIC(20, 6) NOT NULL, 
	norma_tiempo NUMERIC(20, 6) NOT NULL, 
	gasto_salario NUMERIC(20, 6) NOT NULL, 
	PRIMARY KEY (id_ficha_mano_obra), 
	FOREIGN KEY(id_ficha) REFERENCES ficha_costo (id_ficha), 
	FOREIGN KEY(id_tarifa) REFERENCES ficha_tarifa (id_tarifa)
);

CREATE INDEX idx_ficha_mano_obra_ficha ON ficha_mano_obra (id_ficha);

CREATE TABLE liquidacion (
	id_liquidacion SERIAL NOT NULL, 
	codigo VARCHAR(50) NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	id_convenio INTEGER, 
	id_anexo INTEGER, 
	id_moneda INTEGER NOT NULL, 
	liquidada BOOLEAN NOT NULL, 
	fecha_emision DATE NOT NULL, 
	fecha_liquidacion DATE, 
	observaciones VARCHAR, 
	devengado NUMERIC(15, 2) NOT NULL, 
	tributario NUMERIC(15, 2) NOT NULL, 
	comision_bancaria NUMERIC(15, 2) NOT NULL, 
	gasto_empresa NUMERIC(15, 2) NOT NULL, 
	importe NUMERIC(15, 2) NOT NULL, 
	neto_pagar NUMERIC(15, 2) NOT NULL, 
	porcentaje_caguayo NUMERIC(5, 2) NOT NULL, 
	importe_caguayo NUMERIC(15, 2) NOT NULL, 
	tributario_monto NUMERIC(15, 2) NOT NULL, 
	tipo_pago VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id_liquidacion), 
	UNIQUE (codigo), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_convenio) REFERENCES convenio (id_convenio), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE item_anexo (
	id_item_anexo SERIAL NOT NULL, 
	id_anexo INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	entrada INTEGER NOT NULL, 
	vendido INTEGER DEFAULT '0' NOT NULL, 
	precio_compra NUMERIC(15, 4) NOT NULL, 
	precio_venta NUMERIC(15, 4) NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	codigo VARCHAR(50), 
	a_vender BOOLEAN NOT NULL, 
	PRIMARY KEY (id_item_anexo), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE INDEX idx_item_anexo_anexo ON item_anexo (id_anexo);

CREATE INDEX idx_item_anexo_producto ON item_anexo (id_producto);

CREATE TABLE item_factura (
	id_item_factura SERIAL NOT NULL, 
	id_factura INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio_compra NUMERIC(15, 4) NOT NULL, 
	precio_venta NUMERIC(15, 4) NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	codigo VARCHAR(100), 
	id_anexo INTEGER, 
	PRIMARY KEY (id_item_factura), 
	FOREIGN KEY(id_factura) REFERENCES factura (id_factura), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo)
);

CREATE INDEX idx_item_factura_factura ON item_factura (id_factura);

CREATE INDEX idx_item_factura_producto ON item_factura (id_producto);

CREATE TABLE item_venta_efectivo (
	id_item_venta_efectivo SERIAL NOT NULL, 
	id_venta_efectivo INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio_compra NUMERIC(15, 4) NOT NULL, 
	precio_venta NUMERIC(15, 4) NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	codigo VARCHAR(100), 
	id_anexo INTEGER, 
	PRIMARY KEY (id_item_venta_efectivo), 
	FOREIGN KEY(id_venta_efectivo) REFERENCES venta_efectivo (id_venta_efectivo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo)
);

CREATE INDEX idx_item_venta_efectivo_producto ON item_venta_efectivo (id_producto);

CREATE INDEX idx_item_venta_efectivo_venta ON item_venta_efectivo (id_venta_efectivo);

CREATE TABLE pago (
	id_pago SERIAL NOT NULL, 
	id_factura INTEGER NOT NULL, 
	fecha DATE NOT NULL, 
	monto NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	tipo_pago VARCHAR(50) NOT NULL, 
	referencia VARCHAR(100), 
	observaciones VARCHAR, 
	PRIMARY KEY (id_pago), 
	FOREIGN KEY(id_factura) REFERENCES factura (id_factura) ON DELETE CASCADE, 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE solicitud_servicio (
	id_solicitud_servicio SERIAL NOT NULL, 
	id_cliente INTEGER, 
	id_contrato INTEGER, 
	id_suplemento INTEGER, 
	codigo_solicitud VARCHAR(50), 
	nombres_rep VARCHAR(100), 
	apellido1_rep VARCHAR(100), 
	apellido2_rep VARCHAR(100), 
	ci_rep VARCHAR(20), 
	telefono_rep VARCHAR(20), 
	cargo VARCHAR(100), 
	descripcion VARCHAR, 
	fecha_solicitud DATE NOT NULL, 
	fecha_entrega DATE, 
	estado VARCHAR(50), 
	observaciones VARCHAR, 
	material_asumido_x BOOLEAN NOT NULL, 
	id_usuario INTEGER, 
	aprobado BOOLEAN NOT NULL, 
	codigo_proyecto VARCHAR(50), 
	PRIMARY KEY (id_solicitud_servicio), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_contrato) REFERENCES contrato (id_contrato), 
	FOREIGN KEY(id_suplemento) REFERENCES suplemento (id_suplemento), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario)
);

CREATE TABLE anexo_producto (
	id_anexo_producto SERIAL NOT NULL, 
	id_anexo INTEGER NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio_acordado NUMERIC(15, 4) NOT NULL, 
	PRIMARY KEY (id_anexo_producto), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto)
);

CREATE TABLE movimiento (
	id_movimiento SERIAL NOT NULL, 
	id_tipo_movimiento INTEGER NOT NULL, 
	id_dependencia INTEGER NOT NULL, 
	id_anexo INTEGER, 
	id_item_anexo INTEGER, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	observacion VARCHAR, 
	id_liquidacion INTEGER, 
	estado VARCHAR(20) NOT NULL, 
	codigo VARCHAR(100), 
	id_convenio INTEGER, 
	id_cliente INTEGER, 
	precio_compra NUMERIC(15, 4), 
	moneda_compra INTEGER, 
	precio_venta NUMERIC(15, 4), 
	moneda_venta INTEGER, 
	id_factura INTEGER, 
	id_venta_efectivo INTEGER, 
	id_contrato INTEGER, 
	PRIMARY KEY (id_movimiento), 
	FOREIGN KEY(id_tipo_movimiento) REFERENCES tipo_movimiento (id_tipo_movimiento), 
	FOREIGN KEY(id_dependencia) REFERENCES dependencia (id_dependencia), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_liquidacion) REFERENCES liquidacion (id_liquidacion), 
	FOREIGN KEY(id_convenio) REFERENCES convenio (id_convenio), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(moneda_compra) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(moneda_venta) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_factura) REFERENCES factura (id_factura), 
	FOREIGN KEY(id_venta_efectivo) REFERENCES venta_efectivo (id_venta_efectivo), 
	FOREIGN KEY(id_contrato) REFERENCES contrato (id_contrato)
);

CREATE INDEX idx_movimiento_tipo ON movimiento (id_tipo_movimiento);

CREATE INDEX idx_movimiento_estado ON movimiento (estado);

CREATE INDEX idx_movimiento_codigo ON movimiento (codigo);

CREATE INDEX idx_movimiento_convenio ON movimiento (id_convenio);

CREATE INDEX idx_movimiento_fecha ON movimiento (fecha);

CREATE INDEX idx_movimiento_producto ON movimiento (id_producto);

CREATE INDEX idx_movimiento_cliente ON movimiento (id_cliente);

CREATE INDEX idx_movimiento_dependencia ON movimiento (id_dependencia);

CREATE TABLE productos_en_liquidacion (
	id_producto_en_liquidacion SERIAL NOT NULL, 
	codigo VARCHAR(50) NOT NULL, 
	id_producto INTEGER NOT NULL, 
	cantidad INTEGER NOT NULL, 
	precio NUMERIC(15, 4) NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	tipo_compra VARCHAR(20) NOT NULL, 
	id_factura INTEGER, 
	id_venta_efectivo INTEGER, 
	id_anexo INTEGER, 
	id_cliente INTEGER, 
	id_liquidacion INTEGER, 
	liquidada BOOLEAN NOT NULL, 
	fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	fecha_liquidacion TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_producto_en_liquidacion), 
	UNIQUE (codigo), 
	FOREIGN KEY(id_producto) REFERENCES productos (id_producto), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_factura) REFERENCES factura (id_factura), 
	FOREIGN KEY(id_venta_efectivo) REFERENCES venta_efectivo (id_venta_efectivo), 
	FOREIGN KEY(id_anexo) REFERENCES anexo (id_anexo), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_liquidacion) REFERENCES liquidacion (id_liquidacion)
);

CREATE TABLE precio_item_anexo (
	id_precio_item_anexo SERIAL NOT NULL, 
	id_item_anexo INTEGER NOT NULL, 
	id_moneda INTEGER NOT NULL, 
	precio_venta NUMERIC(15, 4) NOT NULL, 
	precio_compra NUMERIC(15, 4), 
	PRIMARY KEY (id_precio_item_anexo), 
	CONSTRAINT uq_item_anexo_moneda UNIQUE (id_item_anexo, id_moneda), 
	FOREIGN KEY(id_item_anexo) REFERENCES item_anexo (id_item_anexo), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE INDEX ix_precio_item_anexo_id_item_anexo ON precio_item_anexo (id_item_anexo);

CREATE TABLE etapas (
	id_etapa SERIAL NOT NULL, 
	id_solicitud_servicio INTEGER NOT NULL, 
	numero_etapa INTEGER, 
	nombre_etapa VARCHAR(150), 
	fecha_entrega DATE, 
	fecha_pago DATE, 
	descripcion VARCHAR, 
	valor NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	pagada BOOLEAN NOT NULL, 
	tipo_etapa VARCHAR(20), 
	PRIMARY KEY (id_etapa), 
	FOREIGN KEY(id_solicitud_servicio) REFERENCES solicitud_servicio (id_solicitud_servicio) ON DELETE CASCADE, 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE tareas_etapa (
	id_tarea_etapa SERIAL NOT NULL, 
	id_etapa INTEGER NOT NULL, 
	id_servicio INTEGER, 
	codigo_extendido VARCHAR(100), 
	concepto_modificado VARCHAR, 
	unidad_medida VARCHAR(20), 
	cantidad NUMERIC NOT NULL, 
	precio_ajustado NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	observaciones_ajustadas VARCHAR, 
	facturada BOOLEAN NOT NULL, 
	PRIMARY KEY (id_tarea_etapa), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa) ON DELETE CASCADE, 
	FOREIGN KEY(id_servicio) REFERENCES servicios (id_servicio), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE persona_etapa (
	id_etapa INTEGER NOT NULL, 
	id_persona INTEGER NOT NULL, 
	cobro NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	liquidada BOOLEAN NOT NULL, 
	por_cobrar NUMERIC NOT NULL, 
	PRIMARY KEY (id_etapa, id_persona), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa) ON DELETE CASCADE, 
	FOREIGN KEY(id_persona) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE certificacion (
	id_certificacion SERIAL NOT NULL, 
	nombre VARCHAR(255) NOT NULL, 
	id_etapa INTEGER NOT NULL, 
	constructor VARCHAR, 
	inversionista VARCHAR, 
	obra VARCHAR, 
	objeto_obra VARCHAR, 
	actividad VARCHAR, 
	descripcion VARCHAR, 
	observaciones VARCHAR, 
	fecha DATE, 
	a_cobrar NUMERIC NOT NULL, 
	impuesto_venta_onat NUMERIC NOT NULL, 
	ajuste_porciento NUMERIC NOT NULL, 
	ajuste_valor NUMERIC NOT NULL, 
	facturado BOOLEAN NOT NULL, 
	PRIMARY KEY (id_certificacion), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa) ON DELETE CASCADE
);

CREATE INDEX idx_certificacion_etapa ON certificacion (id_etapa);

CREATE TABLE factura_servicio (
	id_factura_servicio SERIAL NOT NULL, 
	id_etapa INTEGER, 
	id_certificacion INTEGER, 
	alcance VARCHAR(20), 
	codigo_factura VARCHAR(50), 
	id_moneda INTEGER, 
	fecha DATE, 
	descripcion VARCHAR, 
	importe NUMERIC NOT NULL, 
	pagado NUMERIC NOT NULL, 
	observaciones VARCHAR, 
	cuenta_factura VARCHAR(50), 
	id_usuario INTEGER, 
	estado VARCHAR(20) NOT NULL, 
	tipo VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id_factura_servicio), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa), 
	FOREIGN KEY(id_certificacion) REFERENCES certificacion (id_certificacion), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario)
);

CREATE TABLE oferta (
	id_oferta SERIAL NOT NULL, 
	id_etapa INTEGER, 
	id_certificacion INTEGER, 
	alcance VARCHAR(20), 
	codigo_oferta VARCHAR(50), 
	id_moneda INTEGER, 
	fecha DATE, 
	descripcion VARCHAR, 
	importe NUMERIC NOT NULL, 
	observaciones VARCHAR, 
	cuenta_factura VARCHAR(50), 
	id_usuario INTEGER, 
	estado VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id_oferta), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa), 
	FOREIGN KEY(id_certificacion) REFERENCES certificacion (id_certificacion), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario)
);

CREATE TABLE pago_factura_servicio (
	id_pago_factura_servicio SERIAL NOT NULL, 
	id_factura_servicio INTEGER, 
	monto NUMERIC NOT NULL, 
	monto_disponible NUMERIC NOT NULL, 
	id_moneda INTEGER, 
	fecha DATE, 
	doc_traza VARCHAR(100), 
	PRIMARY KEY (id_pago_factura_servicio), 
	FOREIGN KEY(id_factura_servicio) REFERENCES factura_servicio (id_factura_servicio), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda)
);

CREATE TABLE items_factura_servicio (
	id_item_factura_servicio SERIAL NOT NULL, 
	id_factura_servicio INTEGER NOT NULL, 
	id_tarea_etapa INTEGER NOT NULL, 
	codigo_extendido VARCHAR(100), 
	concepto VARCHAR, 
	unidad_medida VARCHAR(20), 
	cantidad NUMERIC NOT NULL, 
	precio NUMERIC NOT NULL, 
	ajuste_porciento NUMERIC NOT NULL, 
	ajuste_valor NUMERIC NOT NULL, 
	PRIMARY KEY (id_item_factura_servicio), 
	FOREIGN KEY(id_factura_servicio) REFERENCES factura_servicio (id_factura_servicio) ON DELETE CASCADE, 
	FOREIGN KEY(id_tarea_etapa) REFERENCES tareas_etapa (id_tarea_etapa) ON DELETE CASCADE
);

CREATE TABLE items_oferta (
	id_item_oferta SERIAL NOT NULL, 
	id_oferta INTEGER NOT NULL, 
	id_tarea_etapa INTEGER NOT NULL, 
	codigo_extendido VARCHAR(100), 
	concepto VARCHAR, 
	unidad_medida VARCHAR(20), 
	cantidad NUMERIC NOT NULL, 
	precio NUMERIC NOT NULL, 
	ajuste_porciento NUMERIC NOT NULL, 
	ajuste_valor NUMERIC NOT NULL, 
	PRIMARY KEY (id_item_oferta), 
	FOREIGN KEY(id_oferta) REFERENCES oferta (id_oferta) ON DELETE CASCADE, 
	FOREIGN KEY(id_tarea_etapa) REFERENCES tareas_etapa (id_tarea_etapa) ON DELETE CASCADE
);

CREATE TABLE persona_liquidacion (
	id_liquidacion SERIAL NOT NULL, 
	numero VARCHAR(50), 
	id_etapa INTEGER, 
	id_persona INTEGER, 
	fecha_emision DATE NOT NULL, 
	fecha_liquidacion DATE, 
	descripcion VARCHAR, 
	id_moneda INTEGER, 
	tipo_pago VARCHAR(50) NOT NULL, 
	importe NUMERIC NOT NULL, 
	porcentaje_caguayo NUMERIC NOT NULL, 
	importe_caguayo NUMERIC NOT NULL, 
	porciento_gestion NUMERIC NOT NULL, 
	porciento_empresa NUMERIC NOT NULL, 
	devengado NUMERIC NOT NULL, 
	tributario NUMERIC NOT NULL, 
	tributario_monto NUMERIC NOT NULL, 
	comision_bancaria NUMERIC NOT NULL, 
	comision_admin_obra NUMERIC NOT NULL, 
	neto_pagar NUMERIC NOT NULL, 
	id_tipo_concepto INTEGER, 
	doc_pago_liquidacion VARCHAR(100), 
	gasto_empresa NUMERIC NOT NULL, 
	observacion VARCHAR, 
	confirmado BOOLEAN NOT NULL, 
	id_pago INTEGER, 
	PRIMARY KEY (id_liquidacion), 
	FOREIGN KEY(id_etapa) REFERENCES etapas (id_etapa), 
	FOREIGN KEY(id_persona) REFERENCES clientes (id_cliente), 
	FOREIGN KEY(id_moneda) REFERENCES moneda (id_moneda), 
	FOREIGN KEY(id_pago) REFERENCES pago_factura_servicio (id_pago_factura_servicio)
);

COMMIT;
