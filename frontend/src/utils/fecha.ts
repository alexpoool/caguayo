const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Extrae [año, mes, día] de un valor de fecha sin aplicar desplazamiento por
 * zona horaria.
 *
 * El backend serializa las fechas como ISO (`2024-05-15` para campos `date`,
 * `2024-05-15T14:30:00` para campos `datetime`). Pasar esa cadena a
 * `new Date()` la interpreta como medianoche UTC, por lo que en zonas behind
 * UTC (Cuba, Venezuela: UTC-4) la fecha se muestra un dia antes. Por eso se
 * extrae la parte `YYYY-MM-DD` como texto y solo se usa `Date` para obtener
 * nombres de dia/mes, construido a partir de las partes ya extraidas.
 */
const partes = (valor: string | Date | null | undefined): [number, number, number] | null => {
  if (valor === null || valor === undefined || valor === '') return null;

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return [valor.getFullYear(), valor.getMonth() + 1, valor.getDate()];
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor).trim());
  if (iso) return [Number(iso[1]), Number(iso[2]), Number(iso[3])];

  const parsed = new Date(valor);
  if (isNaN(parsed.getTime())) return null;
  return [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()];
};

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatea una fecha como `dd/mm/yyyy` (ej. `15/05/2024`).
 * Devuelve cadena vacia si el valor es null, undefined, vacio o no parseable,
 * para que el llamante conserve su propio placeholder (`|| 'N/A'`).
 */
export const formatFecha = (valor: string | Date | null | undefined): string => {
  const p = partes(valor);
  if (!p) return '';
  return `${dosDigitos(p[2])}/${dosDigitos(p[1])}/${p[0]}`;
};

/**
 * Formatea fecha y hora como `dd/mm/yyyy hh:mm` (ej. `15/05/2024 14:30`).
 * Con `conSegundos` devuelve `dd/mm/yyyy hh:mm:ss` (ej. `15/05/2024 14:30:45`).
 * La hora se toma del valor cuando viene en ISO; si solo hay fecha, devuelve
 * la fecha sin hora.
 */
export const formatFechaHora = (
  valor: string | Date | null | undefined,
  conSegundos = false,
): string => {
  const fecha = formatFecha(valor);
  if (!fecha) return '';
  if (valor instanceof Date) {
    const hhmm = `${dosDigitos(valor.getHours())}:${dosDigitos(valor.getMinutes())}`;
    return conSegundos
      ? `${fecha} ${hhmm}:${dosDigitos(valor.getSeconds())}`
      : `${fecha} ${hhmm}`;
  }
  const hora = /T(\d{2}):(\d{2})(:(\d{2}))?/.exec(String(valor).trim());
  if (!hora) return fecha;
  return conSegundos && hora[4]
    ? `${fecha} ${hora[1]}:${hora[2]}:${hora[4]}`
    : `${fecha} ${hora[1]}:${hora[2]}`;
};

/**
 * Formatea con el mes en texto: `15 de mayo de 2024`.
 */
export const formatFechaMesLargo = (valor: string | Date | null | undefined): string => {
  const p = partes(valor);
  if (!p) return '';
  return `${p[2]} de ${MESES[p[1] - 1]} de ${p[0]}`;
};

/**
 * Formatea con el dia de la semana abreviado, para ejes de graficos:
 * `lun 15/05`.
 */
export const formatFechaDiaSemana = (valor: string | Date | null | undefined): string => {
  const p = partes(valor);
  if (!p) return '';
  const dia = new Date(p[0], p[1] - 1, p[2]).getDay();
  return `${DIAS[dia]} ${dosDigitos(p[2])}/${dosDigitos(p[1])}`;
};
