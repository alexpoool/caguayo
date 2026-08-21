import { ReactNode } from "react";
import { Modal } from "../../components/ui/Modal";
import { ArrowLeft } from "lucide-react";

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  title: string;
  children: ReactNode;
}

export function ReportFormModal({
  isOpen,
  onClose,
  onBack,
  title,
  children,
}: ReportFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          title="Volver a la lista"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </Modal>
  );
}
