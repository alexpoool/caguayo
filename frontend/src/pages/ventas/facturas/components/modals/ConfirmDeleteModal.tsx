import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { Button } from "../../../../../components/ui";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: "danger" | "warning" | "info" | "success";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  type = "danger",
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    danger: {
      Icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    warning: {
      Icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-100",
    },
    info: {
      Icon: Info,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    success: {
      Icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
  };

  const { Icon, color, bg, border } = iconMap[type];

  const buttonConfigs = {
    danger: { text: "Eliminar", className: "bg-red-600 hover:bg-red-700" },
    warning: {
      text: "Confirmar",
      className: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: { text: "Aceptar", className: "bg-blue-600 hover:bg-blue-700" },
    success: {
      text: "Confirmar",
      className: "bg-green-600 hover:bg-green-700",
    },
  };

  const { text: buttonText, className: buttonClass } = buttonConfigs[type];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full ${bg} border ${border} animate-scale-in`}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-gray-600 text-sm mt-2">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 text-white ${buttonClass}`}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
