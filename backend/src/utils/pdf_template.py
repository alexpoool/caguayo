from jinja2 import Template

# Plantilla XML/HTML proporcionada por el usuario
PDF_TEMPLATE = """
<doc>
  <body>
    <style>
      body {
        font-family: Helvetica;
        font-size: 10pt;
        margin: 2cm;
      }
      .empresa {
        text-align: center;
        margin-bottom: 20px;
      }
      .factura-titulo {
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
      }
      .datos-factura {
        margin-bottom: 15px;
      }
      .paguese {
        background-color: #f0f0f0;
        padding: 5px;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid black;
        padding: 6px;
        text-align: left;
      }
      th {
        background-color: #ddd;
      }
      .total {
        text-align: right;
        font-weight: bold;
      }
      .firmas {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
      }
    </style>

    <!-- Encabezado empresa -->
    <div class="empresa">
      <b>{{ empresa_raiz }}</b><br/>
      {{ dependencia_factura }}<br/>
      {{ direccion }}<br/>
      {{ municipio }}, {{ provincia }}<br/>
      Teléfono: {{ telefono }}<br/>
      Correo: {{ email }}
    </div>

    <!-- Título Factura -->
    <div class="factura-titulo">FACTURA</div>

    <!-- Datos de la factura -->
    <div class="datos-factura">
      Código: <b>{{ codigo_factura }}</b><br/>
      Fecha: {{ fecha }}<br/>
      Moneda: <b>{{ moneda }}</b>
    </div>

    <!-- A quién pagar -->
    <div class="paguese">
      Paguese a: {{ nombre_empresa_pago }}<br/>
      Código: {{ codigo_empresa_pago }}<br/>
      <b>CUENTA CUP</b><br/>
      Cuenta: {{ cuenta_cup }}<br/>
      NIT: {{ nit_empresa }}<br/>
      <b>BANCO:</b> {{ banco }}<br/>
      Titular: {{ titular_cuenta }}<br/>
      Sucursal: {{ sucursal }}<br/>
      Dirección: {{ direccion_sucursal }}
    </div>

    <!-- Contrato y Cliente -->
    <div>
      Contrato N° {{ numero_contrato }} con el Cliente<br/>
      Nombre: {{ nombre_cliente }}<br/>
      Código: {{ codigo_cliente }} &nbsp;&nbsp; NIT: {{ nit_cliente }}<br/>
      Provincia: {{ provincia_cliente }} &nbsp;&nbsp; Municipio: {{ municipio_cliente }}<br/>
      Dirección: {{ direccion_cliente }}<br/>
      <b>BANCO:</b> {{ banco_cliente }}<br/>
      Titular: {{ titular_cliente }}<br/>
      Sucursal: {{ sucursal_cliente }}<br/>
      Dirección: {{ direccion_sucursal_cliente }}
    </div>

    <!-- Descripción general -->
    <div>
      <b>Descripción:</b> {{ descripcion_general }}
    </div>

    <!-- Tabla de items -->
    <table>
      <tr>
        <th>Código</th>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio</th>
        <th>Importe</th>
      </tr>
      {% for item in items %}
      <tr>
        <td>{{ item.codigo_item }}</td>
        <td>{{ item.descripcion_item }}</td>
        <td>{{ item.cantidad_item }}</td>
        <td>{{ item.precio_item }}</td>
        <td>{{ item.importe_item }}</td>
      </tr>
      {% endfor %}
    </table>

    <!-- Total -->
    <div class="total">
      TOTAL: {{ total_factura }}
    </div>

    <!-- Firmas -->
    <div class="firmas">
      <div>
        Confeccionado por:<br/>
        {{ nombre_confecciona }}<br/>
        Cargo: {{ cargo_confecciona }}<br/>
        Fecha Emisión: {{ fecha_emision }}
      </div>
      <div>
        Recibido por:<br/>
        Nombre: ____________<br/>
        Cargo: ____________<br/>
        Fecha: ____________<br/>
        Firma: ____________
      </div>
    </div>

    <div style="text-align: center; margin-top: 40px;">
      Página 1 de 1
    </div>
  </body>
</doc>
"""

def render_invoice_template(data: dict) -> str:
    """
    Render the invoice template with the provided data
    
    Args:
        data: Dictionary containing all the template variables
        
    Returns:
        Rendered HTML string
    """
    template = Template(PDF_TEMPLATE)
    return template.render(**data)