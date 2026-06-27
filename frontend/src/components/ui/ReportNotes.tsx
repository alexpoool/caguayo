import React from "react";
import { FileText } from "lucide-react";
import { cn } from "../../lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportNotesProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReportNotes: React.FC<ReportNotesProps> = ({
  value,
  onChange,
  maxLength = 500,
  placeholder = "Agregue notas u observaciones para el reporte...",
}) => {
  const charCount = value.length;
  const isOverLimit = maxLength > 0 && charCount > maxLength;

  return (
    <div className="space-y-2">
      {/* ── Label ── */}
      <label
        htmlFor="report-notes"
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
        Notas / Observaciones
      </label>

      {/* ── Textarea ── */}
      <textarea
        id="report-notes"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          if (maxLength > 0 && newValue.length > maxLength) return;
          onChange(newValue);
        }}
        placeholder={placeholder}
        rows={3}
        aria-describedby="report-notes-counter"
        className={cn(
          "w-full px-3 py-2 border rounded-lg text-sm resize-y min-h-[72px] transition-colors",
          "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent",
          isOverLimit
            ? "border-red-400 focus:ring-red-500"
            : "border-gray-300 focus:ring-blue-500"
        )}
      />

      {/* ── Character counter ── */}
      <div
        id="report-notes-counter"
        className={cn(
          "flex justify-end text-xs transition-colors",
          isOverLimit
            ? "text-red-500 font-medium"
            : charCount > 0
            ? "text-gray-500"
            : "text-gray-400"
        )}
        aria-live="polite"
      >
        {charCount}/{maxLength}
      </div>
    </div>
  );
};

export default ReportNotes;
