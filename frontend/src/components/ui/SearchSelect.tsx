import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Loader2, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { normalizarBusqueda } from "../../utils/busqueda";

export interface SearchSelectOption {
  value: number;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value?: number | null;
  onChange: (value: number) => void;
  /**
   * Informa del texto escrito en el buscador, para alimentar una carga
   * remota de opciones (p. ej. `buscarEmpleados` desde el padre). El
   * filtro local se aplica igual sobre `options`.
   */
  onSearch?: (term: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  /** Hay una carga de opciones en curso (p. ej. búsqueda remota). */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Selector con buscador integrado (combobox).
 * Abre un panel con campo de búsqueda que filtra por label/description;
 * soporta navegación con flechas, Enter para elegir y Escape para cerrar.
 * Con `onSearch` informa al padre del texto escrito (carga remota) y con
 * `loading` muestra el estado de esa carga mientras llega.
 */
export function SearchSelect({
  options,
  value = null,
  onChange,
  onSearch,
  placeholder = "Seleccionar…",
  emptyMessage = "Sin resultados",
  loading = false,
  disabled = false,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resaltado, setResaltado] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const porValor = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );
  const seleccionada = (value === null || value === undefined ? null : porValor.get(value)) ?? null;

  // Normalizar cada opción una vez por cambio de `options`, no en cada tecla.
  const indice = useMemo(
    () =>
      options.map((o) => ({
        opcion: o,
        texto: normalizarBusqueda(`${o.label} ${o.description ?? ""}`),
      })),
    [options],
  );

  const filtradas = useMemo(() => {
    const q = normalizarBusqueda(busqueda).trim();
    if (!q) return options;
    return indice
      .filter((entrada) => entrada.texto.includes(q))
      .map((entrada) => entrada.opcion);
  }, [indice, options, busqueda]);

  // Posicionar el panel bajo el control, sin salirse del viewport.
  // Se recalcula al redimensionar y cuando el teclado virtual cambia el
  // visualViewport (iOS/Android).
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vv = window.visualViewport;
      const viewportWidth = vv?.width ?? document.documentElement.clientWidth;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const margin = 8;
      const width = Math.min(Math.max(rect.width, 240), viewportWidth - margin * 2);
      const left = Math.max(
        margin,
        Math.min(rect.left, viewportWidth - width - margin),
      );
      const spaceBelow = viewportHeight + offsetTop - rect.bottom;
      const openUp = spaceBelow < 260 && rect.top - offsetTop > 260;

      setCoords({
        top: openUp ? rect.top - 8 : rect.bottom + 6,
        left,
        width,
      });
      // Marca de posición para transform del panel (hacia arriba o hacia abajo)
      panelRef.current?.setAttribute("data-open-up", openUp ? "true" : "false");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open]);

  // Cerrar al hacer clic fuera, con Escape o al hacer scroll de la página
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // El panel va en `position: fixed` con coordenadas del momento de abrir:
    // al moverse la página deja de apuntar al botón, así que se cierra.
    // (Captura: así se detecta el scroll de cualquier contenedor ancestro;
    // el scroll de la propia lista no cierra porque el panel lo contiene.)
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  // Al abrir: foco al buscador, reset de filtro y resaltado en la selección actual
  useEffect(() => {
    if (!open) return;
    setBusqueda("");
    const idx = filtradas.findIndex((o) => o.value === value);
    setResaltado(idx >= 0 ? idx : 0);
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mantener visible la opción resaltada
  useEffect(() => {
    panelRef.current
      ?.querySelector(`[data-idx="${resaltado}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [resaltado]);

  const elegir = (o: SearchSelectOption) => {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((r) => Math.min(r + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((r) => Math.max(r - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtradas[resaltado];
      if (o) elegir(o);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex flex-wrap items-center justify-between gap-3 gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
          "hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          open && "border-brand-500 ring-2 ring-brand-500"
        )}
      >
        <span className={cn("truncate", !seleccionada && "text-gray-400")}>
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-brand-600"
          )}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-[120] animate-scale-in origin-top"
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
              {/* Buscador */}
              <div className="relative p-2 border-b border-gray-100 bg-gray-50/70">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" style={{ left: "1.1rem" }} />
                <input
                  ref={searchRef}
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setResaltado(0);
                    onSearch?.(e.target.value);
                  }}
                  onKeyDown={onInputKey}
                  placeholder="Buscar…"
                  className="w-full pl-7 pr-8 py-1.5 border border-gray-200 rounded-md text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                {loading && (
                  <Loader2
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-brand-500 pointer-events-none"
                    aria-label="Buscando"
                  />
                )}
              </div>
              {/* Opciones */}
              <div className="max-h-56 overflow-y-auto">
                {loading && filtradas.length === 0 ? (
                  <p className="flex items-center justify-center gap-2 px-3 py-6 text-center text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando…
                  </p>
                ) : filtradas.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-gray-400">{emptyMessage}</p>
                ) : (
                  filtradas.map((o, idx) => {
                    const activa = o.value === value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        data-idx={idx}
                        disabled={o.disabled}
                        onMouseEnter={() => setResaltado(idx)}
                        onClick={() => elegir(o)}
                        className={cn(
                          "w-full text-left px-3 py-2 border-b border-gray-50 last:border-b-0 transition-colors",
                          idx === resaltado && "bg-brand-50",
                          activa && "bg-brand-100/70",
                          o.disabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 gap-2">
                          <span className={cn("text-sm truncate", activa ? "font-semibold text-brand-800" : "text-gray-800")}>
                            {o.label}
                          </span>
                          {activa && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                        </div>
                        {o.description && (
                          <span className="block text-xs text-gray-400 truncate">{o.description}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
