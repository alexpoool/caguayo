/**
 * Normaliza un valor para compararlo en búsquedas locales.
 * Solo convierte a texto y minúsculas; no altera acentos para no cambiar
 * los resultados que ya ve el usuario.
 */
export function normalizarBusqueda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).toLowerCase();
}

/** Comprueba si un valor contiene el término ya normalizado. */
export function coincideBusqueda(
  valor: unknown,
  terminoNormalizado: string,
): boolean {
  if (!terminoNormalizado) return true;
  return normalizarBusqueda(valor).includes(terminoNormalizado);
}
