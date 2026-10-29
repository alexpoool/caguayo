import { FileText, Receipt } from "lucide-react";
import { ModalOverlay } from "../../../../../components/ui";
import { formatCifra } from "../../../../../utils/decimal";
import type { OfertaTiendaWithDetails } from "../../../../../types/contrato";

export type TipoConversion = "FACTURA" | "PREFACTURA";

interface ConvertirOfertaModalProps {
  isOpen: boolean;
  oferta: OfertaTiendaWithDetails | null;
  isConverting?: boolean;
  onConfirm: (tipo: TipoConversion) => void;
  onClose: () => void;
}

/**
 * Confirmación de la oferta de tienda: igual que en proyecto, se elige
 * directamente si se genera una factura o una pre-factura.
 */
export function ConvertirOfertaModal({
  isOpen,
  oferta,
  isConverting = false,
  onConfirm,
  onClose,
}: ConvertirOfertaModalProps) {
  if (!isOpen || !oferta) return null;

  const codigo = oferta.codigo_oferta || `#${oferta.id_oferta_tienda}`;

  return (
    <ModalOverlay isOpen={true} onClose={onClose} ariaLabel="Confirmar oferta">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <h3 className="text-xl font-bold text-gray-900">Confirmar oferta</h3>
          <p className="text-sm text-gray-500 mt-1">
            Oferta <span className="font-mono">{codigo}</span> ·{" "}
            {formatCifra(Number(oferta.monto || 0))}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Se generará automáticamente una Pre-factura o Factura. Elija una.
          </p>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onConfirm("FACTURA")}
            disabled={isConverting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            <Receipt className="h-5 w-5" />
            Factura
          </button>
          <button
            type="button"
            onClick={() => onConfirm("PREFACTURA")}
            disabled={isConverting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold hover:from-blue-600 hover:to-cyan-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            <FileText className="h-5 w-5" />
            Pre-factura
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isConverting}
            className="w-full py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
