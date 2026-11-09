import type {
  ActividadEconomica,
  DJ08Input,
  Tributo,
} from "../../../types/dj08";

/** Escala progresiva (Sección G, filas 45-54), espejo del backend. */
export const ESCALA_DJ08: { desde: number; hasta: number | null; pct: number }[] =
  [
    { desde: 0, hasta: 25000, pct: 5 },
    { desde: 25000, hasta: 50000, pct: 10 },
    { desde: 50000, hasta: 100000, pct: 15 },
    { desde: 100000, hasta: 200000, pct: 20 },
    { desde: 200000, hasta: 350000, pct: 25 },
    { desde: 350000, hasta: 500000, pct: 30 },
    { desde: 500000, hasta: 650000, pct: 35 },
    { desde: 650000, hasta: 800000, pct: 40 },
    { desde: 800000, hasta: 1000000, pct: 45 },
    { desde: 1000000, hasta: null, pct: 50 },
  ];

export interface EscalaCalculada {
  fila: number;
  desde: number;
  hasta: number | null;
  base_tramo: number;
  pct: number;
  importe: number;
}

export interface ResultadoDj08Local {
  total_ingresos: number;
  total_gastos: number;
  total_tributos: number;
  base_imponible: number;
  escala: EscalaCalculada[];
  escala_total_base: number;
  impuesto_escala: number;
  impuesto_pagar: number;
  total_devolver: number;
  diferencia_pagar: number;
  diferencia_devolver: number;
  total_pagar: number;
}

/**
 * Cálculo en vivo del cliente. Mantiene el mismo orden de operaciones que
 * `backend/src/services/dj08_service.construir_datos`.
 */
export function calcularDj08Local(
  entrada: DJ08Input,
  actividades: ActividadEconomica[],
  tributos: Tributo[],
): ResultadoDj08Local {
  const total_ingresos = actividades.reduce(
    (a, x) => a + Number(x.ingresos || 0),
    0,
  );
  const total_gastos = actividades.reduce(
    (a, x) => a + Number(x.gastos || 0),
    0,
  );
  const total_tributos = tributos.reduce(
    (a, x) => a + Number(x.importe || 0),
    0,
  );

  const base_imponible = Math.max(
    0,
    total_ingresos -
      Number(entrada.minimo_exento || 0) -
      total_gastos -
      total_tributos -
      Number(entrada.contribucion_restauracion || 0) -
      Number(entrada.pagos_arrendamiento || 0) -
      Number(entrada.importe_exonerado_reparaciones || 0) -
      Number(entrada.otros_descuentos || 0) -
      Number(entrada.bonificacion_mfp || 0),
  );

  const bi = Math.max(0, base_imponible);
  const escala = ESCALA_DJ08.map((t, i) => {
    const base_tramo =
      bi > t.desde
        ? (t.hasta === null ? bi - t.desde : Math.min(bi, t.hasta) - t.desde)
        : 0;
    return {
      fila: 45 + i,
      desde: t.desde,
      hasta: t.hasta,
      base_tramo,
      pct: t.pct,
      importe: (base_tramo * t.pct) / 100,
    };
  });
  const escala_total_base = escala.reduce((a, f) => a + f.base_tramo, 0);
  const impuesto_escala = escala.reduce((a, f) => a + f.importe, 0);

  const bruto =
    impuesto_escala -
    Number(entrada.cuotas_mensuales || 0) -
    Number(entrada.otros_pagos_anticipados || 0) -
    Number(entrada.total_retenciones || 0) -
    Number(entrada.bonificaciones_autorizadas || 0);
  const impuesto_pagar = Math.max(0, bruto);
  const total_devolver = Math.max(0, -bruto);

  const dif =
    Number(entrada.impuesto_declaracion_rectificada || 0) -
    Number(entrada.pago_declaracion_anterior || 0);
  const diferencia_pagar = dif > 0 ? dif : 0;
  const diferencia_devolver = dif < 0 ? -dif : 0;

  const base_e =
    Number(entrada.impuesto_declaracion_rectificada || 0) === 0
      ? impuesto_pagar
      : diferencia_pagar;
  const total_pagar = Math.max(
    0,
    base_e -
      Number(entrada.bonificacion_pronto_pago || 0) -
      Number(entrada.impuesto_pagado_dj_ano || 0) +
      Number(entrada.recargo_mora || 0),
  );

  return {
    total_ingresos,
    total_gastos,
    total_tributos,
    base_imponible,
    escala,
    escala_total_base,
    impuesto_escala,
    impuesto_pagar,
    total_devolver,
    diferencia_pagar,
    diferencia_devolver,
    total_pagar,
  };
}
