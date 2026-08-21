import { Modal } from "../../components/ui/Modal";

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface ReportCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTitle: string;
  categoryIcon: React.ReactNode;
  reports: ReportItem[];
  onSelectReport: (reportId: string) => void;
}

export function ReportCategoryModal({
  isOpen,
  onClose,
  categoryTitle,
  categoryIcon,
  reports,
  onSelectReport,
}: ReportCategoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
            {categoryIcon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{categoryTitle}</h2>
            <p className="text-sm text-gray-500">{reports.length} reportes disponibles</p>
          </div>
        </div>

        <div className="space-y-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className={`w-full flex items-center gap-3 p-4 ${report.color} rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group text-left`}
            >
              <div className="p-2 rounded-lg bg-white/80 shadow-sm group-hover:scale-110 transition-transform">
                {report.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-800 group-hover:text-blue-700 transition-colors">
                  {report.title}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {report.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
