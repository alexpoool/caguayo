const numberFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Devuelve un `Intl.NumberFormat` reutilizable. Crear uno por celda es caro
 * en tablas grandes; la clave incluye locale y opciones.
 */
export function getNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = numberFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, options);
  numberFormatters.set(key, formatter);
  return formatter;
}

/** Alias para reemplazar `new Intl.NumberFormat` sin cambiar la llamada. */
export const getCachedNumberFormat = getNumberFormatter;

/** Formatea un número con locale `es-CU` y opciones opcionales. */
export function formatNumero(
  value: number | string,
  options: Intl.NumberFormatOptions = {},
): string {
  return getNumberFormatter('es-CU', options).format(Number(value));
}
