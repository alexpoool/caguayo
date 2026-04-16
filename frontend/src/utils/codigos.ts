type TipoCodigo = 'REC' | 'MER' | 'DON' | 'DEV' | 'AJU';

export function generarCodigoMovimiento(
  tipo: TipoCodigo,
  anio: number,
  idConvenio: number,
  idAnexo: number,
  idProducto: number
): string {
  const yearSuffix = anio - 2000;
  return `${tipo}-${yearSuffix}-CV${idConvenio.toString().padStart(2, '0')}-A${idAnexo.toString().padStart(2, '0')}-P${idProducto.toString().padStart(3, '0')}`;
}
