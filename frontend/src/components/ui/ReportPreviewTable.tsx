import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./index";

interface Column {
  key: string;
  label: string;
  className?: string;
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

interface ReportPreviewTableProps {
  columns: Column[];
  data: Record<string, any>[];
  totalItems?: number;
  totals?: Record<string, { label: string; value: number }>;
}

export const ReportPreviewTable: React.FC<ReportPreviewTableProps> = ({
  columns,
  data,
  totalItems,
  totals,
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{totalItems ?? data.length}</span> registros encontrados
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {totals && (
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          {Object.entries(totals).map(([key, { label, value }]) => (
            <div key={key} className="text-sm">
              <span className="text-gray-500">{label}: </span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
