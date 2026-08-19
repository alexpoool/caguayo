import type { FacturaServicio, ItemFacturaServicio, Etapa, SolicitudServicio, Certificacion } from '../../types/servicio';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import { authService } from '../../services/auth';
import { formatCifra } from '../../utils/decimal';

export type TipoDocumento = 'OFERTA' | 'PRE-FACTURA' | 'FACTURA';

export function getFacturaServicioDocument(
  factura: FacturaServicio,
  etapasData: Etapa[],
  itemsData: ItemFacturaServicio[],
  solicitudesData: SolicitudServicio[],
  autorizadoPor: string,
  revisadoPor: string,
  cuentaSeleccionada: any,
  clientesData: Cliente[] = [],
  cuentasClientesData: any[] = [],
  monedasData: Moneda[] = [],
  contratoNombre: string = '',
  certificacion?: Certificacion,
  tipoDocumento: TipoDocumento = 'FACTURA'
) {
  const etapa = etapasData.find(e => e.id_etapa === factura.id_etapa);
  const solicitud = solicitudesData.find(s => s.id_solicitud_servicio === etapa?.id_solicitud_servicio);
  const moneda = monedasData.find(m => m.id_moneda === factura.id_moneda);

  const user = authService.getUser();
  const elaboradoPor = user ? `${user.nombre || ''} ${user.primer_apellido || ''}`.trim() : '';
  const cargoUsuario = user?.cargo || '';

  const empresa = user?.dependencia;
  const empresaNombre = empresa?.nombre || 'CAGUAYO S.A.';
  const empresaDireccion = empresa?.direccion || '';
  const empresaTelefono = empresa?.telefono || '';
  const empresaWeb = empresa?.web || '';
  const empresaEmail = empresa?.email || '';
  const empresaNit = empresa?.nit || '';
  const empresaReeup = empresa?.reeup || '';

  const clienteId = solicitud?.id_cliente;
  const cliente = clientesData.find(c => Number(c.id_cliente) === Number(clienteId));
  const codigoProyecto = solicitud?.codigo_proyecto || 'N/A';
  const nombreCliente = cliente?.nombre || 'N/A';
  const provinciaCliente = cliente?.provincia?.nombre || 'N/A';
  const municipioCliente = cliente?.municipio?.nombre || 'N/A';
  const direccionCliente = cliente?.direccion || 'N/A';
  const codigoCliente = cliente?.id_cliente?.toString() || 'N/A';

  const cuentaCliente = cuentasClientesData && cuentasClientesData.length > 0 ? cuentasClientesData[0] : null;

  const nombreEtapa = etapa?.nombre_etapa || `Etapa #${etapa?.numero_etapa || 'N/A'}`;
  const codigoSolicitud = solicitud?.codigo_solicitud || 'N/A';
  const nombreMoneda = moneda?.nombre || '';
  const simboloMoneda = moneda?.simbolo || '';

  const tituloDocumento = tipoDocumento === 'OFERTA'
    ? 'Oferta'
    : tipoDocumento === 'PRE-FACTURA'
      ? 'Pre-factura'
      : 'Factura';

  const tareasRows = itemsData.map(item => {
    const importe = Number(item.cantidad || 0) * Number(item.precio || 0);
    return `
        <tr>
          <td>${item.concepto || item.codigo_extendido || 'N/A'}</td>
          <td>${item.unidad_medida || '-'}</td>
          <td class="cantidad">${item.cantidad || 0}</td>
          <td class="precio">${simboloMoneda} ${formatCifra(item.precio)}</td>
          <td class="importe">${simboloMoneda} ${formatCifra(importe)}</td>
        </tr>
      `;
  }).join('');
  const subtotal = itemsData.reduce((sum, item) => sum + (Number(item.cantidad || 0) * Number(item.precio || 0)), 0);
  const descuento = itemsData.reduce((sum, item) => {
    const base = Number(item.cantidad || 0) * Number(item.precio || 0);
    const ajustePorc = Number(item.ajuste_porciento || 0);
    const ajusteVal = Number(item.ajuste_valor || 0);
    const ajusteAmount = base * (ajustePorc / 100) + ajusteVal;
    return sum - ajusteAmount;
  }, 0);
  const totalFinal = subtotal - descuento;
  const aCobrar = certificacion ? Number(certificacion.a_cobrar || 0) : 0;
  const impuestoOnat = certificacion ? Number(certificacion.impuesto_venta_onat || 0) : 0;
  const subtotalCert = aCobrar - impuestoOnat;
  const descuentoCert = certificacion
    ? -(aCobrar * Number(certificacion.ajuste_porciento || 0) / 100 + Number(certificacion.ajuste_valor || 0))
    : 0;
  const totalCert = subtotalCert - descuentoCert;

  const fechaEmision = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : 'N/A';

  return `<!DOCTYPE html>
<html lang="es">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${tituloDocumento} | ${factura.codigo_factura || 'N/A'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #dbdbdb; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Courier New', 'Monaco', monospace; padding: 30px 20px; }
    .documento { max-width: 880px; width: 100%; background: white; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2); padding: 1rem 1.5rem 1.5rem 1.5rem; border-radius: 4px; }
    .texto { font-family: 'Courier New', 'Monaco', monospace; font-size: 13px; line-height: 1.2; color: #111; }
    .header-tcp { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0; gap: 15px; }
    .header-logo { display: flex; align-items: center; gap: 10px; min-width: 120px; }
    .header-logo img { width: 160px; height: 160px; object-fit: contain; }
    .header-center { text-align: center; flex: 1; }
    .tcp-title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: black; }
    .nombre-titular { font-size: 15px; font-weight: bold; margin-top: 6px; }
    .direccion-contacto { font-size: 11.5px; margin-top: 6px; line-height: 1.2; }
    .telefonos { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .reeup { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .web { font-size: 12px; font-weight: 500; margin-top: 4px; }
    .email { font-size: 12px; color: black; }
    .header-box { border: 2px solid black; background: white; padding: 10px 15px; min-width: 180px; border-radius: 4px; }
    .header-box-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: black; margin-bottom: 6px; border-bottom: 1px solid black; padding-bottom: 4px; }
    .header-box-row { font-size: 11px; margin-bottom: 3px; }
    .header-box-row strong { font-weight: 700; }

    .info-pago { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .pago-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .pago-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; }
    .info-cliente { background: white; padding: 8px; border: 1px solid black; margin-bottom: 8px; font-size: 11.5px; }
    .cliente-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; }
    .cliente-grid .full-row { grid-column: 1 / -1; }
    .cliente-cuenta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 8px; padding-top: 6px; }
    .cert-data { background: white; padding: 8px; border: 1px solid black; margin-bottom: 12px; font-size: 11.5px; }
    .cert-titulo { font-size: 13px; font-weight: 800; text-transform: uppercase; text-align: center; color: black; margin-bottom: 8px; }
    .cert-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
    .cert-row { display: flex; gap: 8px; }
    .cert-label { font-weight: 700; min-width: 140px; }
    .cert-value { flex: 1; }
    .tabla-tareas { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .tabla-tareas th, .tabla-tareas td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-tareas th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .tabla-tareas td:nth-child(1) { width: 50%; }
    .tabla-tareas td:nth-child(2) { width: 8%; text-align: center; }
    .tabla-tareas td:nth-child(3) { width: 10%; text-align: center; }
    .tabla-tareas td:nth-child(4) { width: 15%; text-align: right; }
    .tabla-tareas td:nth-child(5) { width: 17%; text-align: right; }
    .tabla-tareas .subtotal-row td,
    .tabla-tareas .descuento-row td,
    .tabla-tareas .total-row td { border: none; }
    .tabla-tareas .subtotal-row td:nth-child(1),
    .tabla-tareas .descuento-row td:nth-child(1),
    .tabla-tareas .total-row td:nth-child(1) { border-left: 1px solid #222; }
    .tabla-tareas .subtotal-row td:nth-child(3) { border-right: 1px solid #222; border-top: 1px solid #222; }
    .tabla-tareas .descuento-row td:nth-child(3) { border-right: 1px solid #222; }
    .tabla-tareas .total-row td:nth-child(3) { border-right: 1px solid #222; }
    .tabla-tareas .subtotal-row td:nth-child(4),
    .tabla-tareas .descuento-row td:nth-child(4),
    .tabla-tareas .total-row td:nth-child(4) { border-left: 1px solid #222; border-right: 1px solid #222; border-top: 1px solid #222; }
    .tabla-tareas .subtotal-row td:nth-child(5),
    .tabla-tareas .descuento-row td:nth-child(5) { border-left: 1px solid #222; border-right: 1px solid #222; border-top: 1px solid #222; }
    .tabla-tareas .total-row td:nth-child(1),
    .tabla-tareas .total-row td:nth-child(2) { border-bottom: 1px solid #222; }
    .tabla-tareas .total-row td:nth-child(3) { border-right: 1px solid #222; border-bottom: 1px solid #222; }
    .tabla-tareas .total-row td:nth-child(4) { border-left: 1px solid #222; border-right: 1px solid #222; border-top: 1px solid #222; border-bottom: 1px solid #222; }
    .tabla-tareas .total-row td:nth-child(5) { border-left: 1px solid #222; border-right: 1px solid #222; border-top: 1px solid #222; border-bottom: 1px solid #222; }
    .tabla-tareas .subtotal-row td { font-weight: 700; font-size: 13px; }
    .tabla-tareas .descuento-row td { font-size: 12px; }
    .tabla-tareas .total-row td { font-weight: 800; font-size: 14px; }
    .tabla-totales { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    .tabla-totales th, .tabla-totales td { border: 1px solid #222; padding: 6px 4px; vertical-align: top; }
    .tabla-totales th { background-color: #cccccc; font-weight: 700; text-align: center; }
    .tabla-totales td:nth-child(1) { width: 70%; }
    .tabla-totales td:nth-child(2) { width: 30%; text-align: right; }
    .tabla-totales .total-row td { font-weight: 800; font-size: 13px; }
    .tabla-totales .subtotal-row td { font-weight: 700; font-size: 13px; border-top: 2px solid #222; }
    .tabla-totales .descuento-row td { font-size: 12px; }
    .totales { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .cuadro-totales { width: 280px; border: 1px solid black; background: white; padding: 12px 15px; font-size: 13px; font-family: monospace; }
    .linea-total { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .total-final { font-weight: 800; font-size: 15px; border-top: 1px solid #000; margin-top: 8px; padding-top: 6px; }
    .firmas { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; margin-bottom: 12px; }
    .fila-firmas { display: flex; justify-content: space-between; gap: 20px; }
    .bloque-firma { flex: 1; border-top: none; padding-top: 8px; font-size: 11px; text-align: left; }
    .bloque-firma p { margin: 2px 0; }
    .cargo { font-size: 10px; color: black; }
    @media (max-width: 650px) { .documento { padding: 0.6rem; } .tabla-tareas th, .tabla-tareas td, .tabla-totales th, .tabla-totales td { padding: 3px 2px; font-size: 10px; } .firmas { flex-direction: column; gap: 6px; } .fila-firmas { flex-direction: column; gap: 10px; } .header-tcp { flex-direction: column; } .header-box { width: 100%; margin-top: 10px; } }
    @page { margin: 0; }
    @media print {
      body { background: white; display: block; padding: 0; min-height: auto; align-items: flex-start; }
      .documento { max-width: none; box-shadow: none; border-radius: 0; padding: 1cm; padding-top: 160px; padding-bottom: 105px; }
      .tabla-tareas th, .tabla-totales th { background-color: #cccccc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0 1cm 0 1cm; }
      .print-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: white; padding: 0 1cm 0.3cm 1cm; }
    }
  </style>
</head>
<body>
  <div class="documento texto">
    <div class="print-header">
      <div class="header-tcp">
        <div class="header-logo">
          <img src="/logo-black.png" alt="Logo CAGUAYO S.A." />
        </div>
        <div class="header-center">
          <div class="tcp-title">CAGUAYO S.A.</div>
          <div class="nombre-titular">${empresaNombre}</div>
          <div class="direccion-contacto">${empresaDireccion}</div>
          <div class="telefonos">Tel: ${empresaTelefono}</div>
          ${empresaWeb ? `<div class="web">Web: ${empresaWeb}</div>` : ''}
          ${empresaEmail ? `<div class="email">${empresaEmail}</div>` : ''}
          ${empresaReeup ? `<div class="reeup">Código: ${empresaReeup}</div>` : ''}
        </div>
        <div class="header-box">
          <div class="header-box-title">${tituloDocumento}</div>
          <div class="header-box-row"><strong>No.:</strong> ${factura.codigo_factura || 'N/A'}</div>
          <div class="header-box-row"><strong>Fecha:</strong> ${fechaEmision}</div>
          <div class="header-box-row"><strong>Moneda:</strong> ${nombreMoneda || 'N/A'}</div>
        </div>
      </div>
    </div>

    ${cuentaSeleccionada ? `
    <div class="info-pago">
      <div class="pago-titulo">PAGUESE A: CAGUAYO S.A.</div>
      <div class="pago-grid">
        <div><strong>Cuenta:</strong> ${cuentaSeleccionada.numero_cuenta || 'N/A'}</div>
        <div><strong>Moneda:</strong> ${monedasData.find(m => m.id_moneda === cuentaSeleccionada.id_moneda)?.simbolo || 'N/A'}</div>
        <div><strong>Titular:</strong> ${cuentaSeleccionada.titular || 'N/A'}</div>
        <div><strong>Banco:</strong> ${cuentaSeleccionada.banco || 'N/A'}</div>
        <div><strong>Sucursal:</strong> ${cuentaSeleccionada.sucursal || 'N/A'}</div>
        <div><strong>Dirección:</strong> ${cuentaSeleccionada.direccion || 'N/A'}</div>
      </div>
    </div>
    ` : ''}

    <div class="info-cliente">
      <div class="cliente-grid">
        <div><strong>Cliente:</strong> ${nombreCliente}</div>
        <div><strong>NIT:</strong> ${cliente?.nit || ''}</div>
        <div><strong>Código:</strong> ${codigoCliente}</div>
        <div class="full-row"><strong>Dirección:</strong> ${direccionCliente}, ${municipioCliente}, ${provinciaCliente}</div>
      </div>
      ${cuentaCliente ? `
      <div class="cliente-cuenta-grid">
        <div><strong>Cuenta:</strong> ${cuentaCliente.numero_cuenta || 'N/A'}</div>
        <div><strong>Moneda:</strong> ${monedasData.find(m => m.id_moneda === cuentaCliente.id_moneda)?.simbolo || 'N/A'}</div>
        <div><strong>Titular:</strong> ${cuentaCliente.titular || 'N/A'}</div>
        <div><strong>Banco:</strong> ${cuentaCliente.banco || 'N/A'}</div>
        <div><strong>Sucursal:</strong> ${cuentaCliente.sucursal || 'N/A'}</div>
        <div><strong>Dirección:</strong> ${cuentaCliente.direccion || 'N/A'}</div>
      </div>
      ` : ''}
    </div>

    <div style="margin: 8px 0 6px 0; font-weight: bold; font-size: 14px;">${contratoNombre || nombreEtapa}</div>
    ${factura.descripcion ? `<div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Descripción:</strong> ${factura.descripcion}</div>` : ''}

    ${certificacion ? `
    <table class="tabla-totales">
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Actividad</td>
          <td>${simboloMoneda} ${formatCifra(aCobrar)}</td>
        </tr>
         <tr>
          <td>Impuesto Venta ONAT</td>
          <td>${simboloMoneda} ${formatCifra(impuestoOnat)}</td>
        </tr>
        <tr class="subtotal-row">
          <td><strong>Subtotal</strong></td>
          <td>${simboloMoneda} ${formatCifra(subtotalCert)}</td>
        </tr>
        ${descuentoCert !== 0 ? `
        <tr class="descuento-row">
          <td><strong>Descuento</strong></td>
          <td>${simboloMoneda} ${formatCifra(descuentoCert)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td>${simboloMoneda} ${formatCifra(totalCert)}</td>
        </tr>
      </tbody>
    </table>
    ` : `
    <table class="tabla-tareas">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Und</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        ${tareasRows || '<tr><td colspan="5" style="text-align:center;">Sin servicios registrados</td></tr>'}
        <tr class="subtotal-row">
          <td></td>
          <td></td>
          <td></td>
          <td><strong>Subtotal</strong></td>
          <td style="text-align: right;">${simboloMoneda} ${formatCifra(subtotal)}</td>
        </tr>
        ${descuento !== 0 ? `
        <tr class="descuento-row">
          <td></td>
          <td></td>
          <td></td>
          <td><strong>Descuento</strong></td>
          <td style="text-align: right;">${simboloMoneda} ${formatCifra(descuento)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td></td>
          <td></td>
          <td></td>
          <td><strong>Total</strong></td>
          <td style="text-align: right;">${simboloMoneda} ${formatCifra(totalFinal)}</td>
        </tr>
      </tbody>
    </table>
    `}
    ${factura.observaciones?.trim() ? `<br><div style="margin: 8px 0 6px 0; font-size: 13px;"><strong>Observaciones:</strong> ${factura.observaciones}</div>` : ''}

    <div class="print-footer">
      <div class="firmas">
        <div class="fila-firmas">
          <div class="bloque-firma">
            <p><strong>Confeccionado por:</strong></p>
            <p>${elaboradoPor}</p>
            <p class="cargo">${cargoUsuario}</p>
            <br><br>
            <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
            <p style="margin-top: 8px;">Firma</p>
          </div>
          <div class="bloque-firma">
            <p><strong>Recibido por:</strong></p>
            <p><strong>Nombre:</strong> </p>
            <p><strong>Cargo:</strong> </p>
            <p><strong>Fecha:</strong> </p>
            <br>
            <div style="border-bottom: 1px solid #222; margin-top: 35px;"></div>
            <p style="margin-top: 8px;">Firma</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function getCertificacionFacturaDocument(
  factura: FacturaServicio,
  etapasData: Etapa[],
  solicitudesData: SolicitudServicio[],
  certificacion: Certificacion,
  autorizadoPor: string,
  revisadoPor: string,
  cuentaSeleccionada: any,
  clientesData: Cliente[] = [],
  cuentasClientesData: any[] = [],
  monedasData: Moneda[] = [],
  contratoNombre: string = '',
  tipoDocumento: TipoDocumento = 'FACTURA'
) {
  return getFacturaServicioDocument(
    factura, etapasData, [], solicitudesData,
    autorizadoPor, revisadoPor, cuentaSeleccionada,
    clientesData, cuentasClientesData, monedasData,
    contratoNombre, certificacion, tipoDocumento
  );
}
