export function generarCodigoMovimiento(
  anio: number,
  idConvenio: number,
  idAnexo: number,
  idProducto: number
): string {
  return `${anio}.${idConvenio}.${idAnexo}.${idProducto}`;
}
