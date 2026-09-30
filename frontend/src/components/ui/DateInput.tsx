import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "../../lib/utils";

export interface DateInputProps {
  /** Fecha en ISO `yyyy-mm-dd`. Es el mismo formato que produce un `<input type="date">`. */
  value?: string;
  onChange: (iso: string) => void;
  /** Fecha minima en ISO. Impide elegir fechas anteriores. */
  min?: string;
  /** Fecha maxima en ISO. */
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  id?: string;
  onBlur?: () => void;
}

const PLACEHOLDER = "dd/mm/aaaa";

/** `2024-05-15` -> `15/05/2024`. Devuelve "" si no hay fecha. */
const isoATexto = (iso?: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
};

/**
 * `15/05/2024` -> `2024-05-15`. Devuelve null si el texto no es una fecha
 * completa y real (rechaza 31/02 y anos fuera de rango).
 */
const textoAIso = (texto: string): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (mes < 1 || mes > 12 || anio < 1000 || anio > 9999) return null;
  if (dia < 1 || dia > 31) return null;
  // Comprueba que la fecha exista de verdad (31/02, 30/04, etc).
  const check = new Date(anio, mes - 1, dia);
  if (
    check.getFullYear() !== anio ||
    check.getMonth() !== mes - 1 ||
    check.getDate() !== dia
  ) {
    return null;
  }
  return `${anio}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

/** ISO a numero de dias, para comparar contra min/max sin desfases de zona horaria. */
const aDias = (iso?: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
};

const fueraDeRango = (iso: string, min?: string, max?: string): boolean => {
  const dias = aDias(iso);
  if (dias === null) return false;
  const minimo = aDias(min);
  const maximo = aDias(max);
  if (minimo !== null && dias < minimo) return true;
  if (maximo !== null && dias > maximo) return true;
  return false;
};

/**
 * Campo de fecha que muestra siempre `dd/mm/aaaa`.
 *
 * El control nativo `<input type="date">` decide el orden de los segmentos segun
 * el locale del navegador, no segun el `lang` del documento: en un navegador en
 * ingles se ve `mm/dd/yyyy` aunque la pagina sea `lang="es"`. Este componente
 * muestra un input de texto con el formato fijo y superpone un
 * `<input type="date">` transparente que solo aporta el calendario y el
 * `min`/`max` nativos (no intercepta clics: el texto se escribe igual).
 *
 * El valor sigue siendo ISO, asi que no cambia nada en submits ni validaciones.
 */
export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  error,
  className,
  placeholder = PLACEHOLDER,
  id,
  onBlur,
}) => {
  const [texto, setTexto] = useState(() => isoATexto(value));
  const [tocado, setTocado] = useState(false);
  const nativoRef = useRef<HTMLInputElement>(null);

  // Sincroniza cuando el valor cambia desde fuera (editar un registro, datos del
  // servidor). No pisa lo que el usuario esta escribiendo, porque el efecto solo
  // corre cuando cambia la prop `value`.
  useEffect(() => {
    setTexto(isoATexto(value));
  }, [value]);

  const cambiarTexto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevo = e.target.value;
    setTexto(nuevo);
    const iso = textoAIso(nuevo);
    // Solo se propaga cuando la fecha esta completa y es real.
    if (iso && !fueraDeRango(iso, min, max)) onChange(iso);
  };

  const salir = () => {
    setTocado(true);
    const iso = textoAIso(texto);
    // Texto incompleto, fecha invalida o fuera del rango: se descarta.
    if (!iso || fueraDeRango(iso, min, max)) setTexto(isoATexto(value));
    onBlur?.();
  };

  const abrirCalendario = () => {
    const nativo = nativoRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!nativo) return;
    try {
      nativo.showPicker?.();
    } catch {
      // Si el navegador no soporta showPicker, el campo sigue siendo usable
      // escribiendo a mano, que es el comportamiento principal del componente.
    }
  };

  const desdeCalendario = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    setTexto(isoATexto(iso));
    setTocado(false);
    if (iso && !fueraDeRango(iso, min, max)) onChange(iso);
  };

  const invalido = tocado && texto.trim() !== "" && textoAIso(texto) === null;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={texto}
          placeholder={placeholder}
          onChange={cambiarTexto}
          onBlur={salir}
          aria-invalid={invalido || undefined}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            error || invalido
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300",
            className,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={abrirCalendario}
          aria-label="Abrir calendario"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
        >
          <Calendar className="h-4 w-4" />
        </button>
        {/* Calendario nativo transparente: solo aporta el popup y min/max.
            `pointer-events-none` para no bloquear la escritura en el campo visible. */}
        <input
          ref={nativoRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          value={value || ""}
          min={min}
          max={max}
          onChange={desdeCalendario}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>
      {(error || invalido) && (
        <p className="mt-1 text-xs text-red-500">
          {error || "Fecha invalida. Use el formato dd/mm/aaaa"}
        </p>
      )}
    </div>
  );
};
