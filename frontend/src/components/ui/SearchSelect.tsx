import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "../../lib/utils";

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
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Selector con buscador integrado (combobox).
 * Abre un panel con campo de búsqueda que filtra por label/description;
 * soporta navegación con flechas, Enter para elegir y Escape para cerrar.
 */
export function SearchSelect({
  options,
  value = null,
  onChange,
  placeholder = "Seleccionar…",
  emptyMessage = "Sin resultados",
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

  const seleccionada = options.find((o) => o.value === value) ?? null;

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
    );
  }, [options, busqueda]);

  // Posicionar el panel bajo el control
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 260 && rect.top > 260;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
    // Marca de posición para transform del panel (hacia arriba o hacia abajo)
    panelRef.current?.setAttribute("data-open-up", openUp ? "true" : "false");
  }, [open]);

  // Cerrar al hacer clic fuera o con Escape
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
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
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
          "w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500",
          "hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
          open && "border-teal-500 ring-2 ring-teal-500"
        )}
      >
        <span className={cn("truncate", !seleccionada && "text-gray-400")}>
          {seleccionada ? seleccionada.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-teal-600"
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
                  }}
                  onKeyDown={onInputKey}
                  placeholder="Buscar…"
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              {/* Opciones */}
              <div className="max-h-56 overflow-y-auto">
                {filtradas.length === 0 ? (
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
                          idx === resaltado && "bg-teal-50",
                          activa && "bg-teal-100/70",
                          o.disabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm truncate", activa ? "font-semibold text-teal-800" : "text-gray-800")}>
                            {o.label}
                          </span>
                          {activa && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                        </div>
                        {o.description && (
                          <span className="block text-[11px] text-gray-400 truncate">{o.description}</span>
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
