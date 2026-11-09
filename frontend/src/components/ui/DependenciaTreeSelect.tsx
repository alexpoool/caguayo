import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import type { Dependencia } from "../../types/dependencia";
import {
  collectIds,
  construirBosque,
  type TreeNode,
} from "./dependenciaArbol";

interface DependenciaTreeSelectProps {
  dependencias: Dependencia[];
  value: string;
  onChange: (value: string) => void;
  /** Si se pasa y existe en la lista, el árbol se enraíza en esa dependencia. */
  rootId?: number;
  placeholder?: string;
  disabled?: boolean;
}

/** Construye el bosque a partir de `codigo_padre`. Los padres ausentes crean raíces. */
export const DependenciaTreeSelect: React.FC<DependenciaTreeSelectProps> = ({
  dependencias,
  value,
  onChange,
  rootId,
  placeholder = "Seleccionar dependencia",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const bosque = useMemo(() => construirBosque(dependencias), [dependencias]);

  const roots = useMemo(() => {
    if (rootId == null) return bosque.roots;
    const encontrado = bosque.byId.get(rootId);
    return encontrado ? [encontrado] : bosque.roots;
  }, [bosque, rootId]);

  const selected = useMemo(() => {
    if (!value) return null;
    return bosque.byId.get(Number(value))?.dep ?? null;
  }, [bosque, value]);

  // Al abrir por primera vez, despliega toda la familia del nodo enraízado.
  useEffect(() => {
    if (open && expanded.size === 0) {
      setExpanded(new Set(collectIds(roots)));
    }
  }, [open, expanded.size, roots]);

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      const id = node.dep.id_dependencia;
      const hasChildren = node.children.length > 0;
      const isOpen = expanded.has(id);
      const isSelected = String(id) === value;
      return (
        <div key={id}>
          <div
            className="flex items-center gap-1 pr-3"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <button
              type="button"
              onClick={() => hasChildren && toggle(id)}
              aria-label={isOpen ? `Contraer ${node.dep.nombre}` : `Expandir ${node.dep.nombre}`}
              className={`p-1 rounded shrink-0 transition-colors ${
                hasChildren ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100" : "text-transparent cursor-default"
              }`}
            >
              {hasChildren ? (
                isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { onChange(String(id)); setOpen(false); }}
              className={`flex-1 flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                isSelected
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-brand-600" : "text-gray-400"}`} />
              <span className="truncate">{node.dep.nombre}</span>
              {isSelected && <span className="ml-auto text-xs text-brand-500">seleccionada</span>}
            </button>
          </div>
          {hasChildren && isOpen && renderNodes(node.children, depth + 1)}
        </div>
      );
    });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-left flex flex-wrap items-center justify-between gap-3 gap-2 focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-50"
      >
        <span className={`flex items-center gap-2 truncate ${selected ? "text-gray-900" : "text-gray-400"}`}>
          <Building2 className="w-4 h-4 shrink-0 text-gray-400" />
          <span className="truncate">{selected ? selected.nombre : placeholder}</span>
        </span>
        <ChevronRight
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {roots.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Sin dependencias disponibles</p>
          ) : (
            renderNodes(roots, 0)
          )}
        </div>
      )}
    </div>
  );
};

export default DependenciaTreeSelect;
