/**
 * Descarga un blob y libera la URL temporal después de que el navegador la use.
 */
export function descargarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Abre un blob en una pestaña nueva y libera la URL temporal cuando ya no
 * hace falta. El visor del navegador necesita la URL viva unos segundos.
 */
export function abrirBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
