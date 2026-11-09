import React, { useEffect, useMemo, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./index";
import { Button } from "./Button";

const PAGE_SIZE = 100;

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
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const visibleRows = useMemo(
    () => data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [data, page],
  );

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{totalItems ?? data.length}</span> registros encontrados
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-500">
            Página {page + 1} de {totalPages}
          </p>
        )}
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
              {visibleRows.map((row, idx) => (
                <TableRow key={page * PAGE_SIZE + idx} className="hover:bg-gray-50">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
          >
            Siguiente
          </Button>
        </div>
      )}

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
