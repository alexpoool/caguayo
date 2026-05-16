import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  /** Text shown in the `<th>` cell. */
  header: string;
  /**
   * Either a key of T (whose value is rendered directly) or a function that
   * receives the row and returns a ReactNode for full custom rendering.
   */
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** Extra Tailwind classes applied to both `<th>` and `<td>` for this column. */
  className?: string;
  /** Horizontal alignment of the column content. Defaults to "left". */
  align?: "left" | "right" | "center";
}

export interface StatCard {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  /** Controls the accent colour of the left border and icon. Defaults to "blue". */
  color?: "blue" | "green" | "red" | "gray" | "amber";
}

export interface ReportPreviewPanelProps<T> {
  title: string;
  subtitle?: string;
  data: T[] | null;
  loading: boolean;
  error: string | null;
  columns: Column<T>[];
  stats?: StatCard[];
  emptyMessage?: string;
  exportColumns?: Column<T>[];
  exportFileName?: string;
}

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
  value?: keyof T;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const statColorClasses: Record<
  NonNullable<StatCard["color"]>,
  { border: string; icon: string; value: string }
> = {
  blue:  { border: "border-blue-500",  icon: "text-blue-500",  value: "text-blue-700"  },
  green: { border: "border-green-500", icon: "text-green-500", value: "text-green-700" },
  red:   { border: "border-red-500",   icon: "text-red-500",   value: "text-red-700"   },
  gray:  { border: "border-gray-400",  icon: "text-gray-500",  value: "text-gray-700"  },
  amber: { border: "border-amber-500", icon: "text-amber-500", value: "text-amber-700" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Shimmer placeholder shown while data is loading. */
function LoadingSkeleton({ columnCount }: { columnCount: number }) {
  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3"];

  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full text-sm">
        {/* Header skeleton */}
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {Array.from({ length: columnCount }).map((_, i) => (
              <th key={`sh-${i}`} className="px-4 py-2">
                <div className="bg-gray-200 rounded h-3 w-2/3" />
              </th>
            ))}
          </tr>
        </thead>

        {/* Row skeletons */}
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <tr
              key={`sr-${rowIdx}`}
              className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
            >
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <td key={`sc-${rowIdx}-${colIdx}`} className="px-4 py-2.5">
                  <div
                    className={`bg-gray-200 rounded h-3 ${
                      widths[(rowIdx + colIdx) % widths.length]
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Coloured stat summary card with a left-border accent. */
function StatCardItem({ stat }: { stat: StatCard }) {
  const color = stat.color ?? "blue";
  const colors = statColorClasses[color];

  return (
    <div
      className={`flex items-center gap-3 bg-white rounded-lg border border-gray-200 border-l-4 ${colors.border} px-4 py-3 shadow-sm`}
    >
      {stat.icon && (
        <span className={`flex-shrink-0 ${colors.icon}`}>{stat.icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{stat.label}</p>
        <p className={`text-base font-bold leading-tight ${colors.value}`}>
          {stat.value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function ReportPreviewPanel<T extends object>({
  title,
  subtitle,
  data,
  loading,
  error,
  columns,
  stats,
  emptyMessage = "No se encontraron registros",
}: ReportPreviewPanelProps<T>) {
  // ── Panel header ──────────────────────────────────────────────────────────
  const header = (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800 leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Live / stale indicator */}
      {data !== null && !loading && !error && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          Vista previa
        </span>
      )}
    </div>
  );

  // ── Configure-filters prompt (url was null → data is null and not loading) ─
  if (data === null && !loading && !error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {header}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {/* Decorative icon */}
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">
            Configure los filtros para ver una vista previa
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Los resultados aparecerán aquí antes de generar el reporte
          </p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {header}
        <LoadingSkeleton columnCount={columns.length} />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {header}
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mt-2">
          <svg
            className="flex-shrink-0 w-4 h-4 text-red-500 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-red-700 leading-snug">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty array ───────────────────────────────────────────────────────────
  if (data !== null && data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {header}
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // ── Data table ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {header}

      {/* Stats strip */}
      {stats && stats.length > 0 && (
        <div
          className={`grid gap-3 mb-5 ${
            stats.length === 1
              ? "grid-cols-1"
              : stats.length === 2
              ? "grid-cols-2"
              : stats.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {stats.map((stat, i) => (
            <StatCardItem key={i} stat={stat} />
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={[
                    "px-4 py-2 text-xs uppercase text-gray-500 font-semibold tracking-wide whitespace-nowrap",
                    alignClass[col.align ?? "left"],
                    col.className ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(data as T[]).map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={[
                  "border-b border-gray-100 last:border-0 transition-colors",
                  "hover:bg-blue-50/30",
                  rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {columns.map((col, colIdx) => {
                  const cellValue =
                    typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode);

                  return (
                    <td
                      key={colIdx}
                      className={[
                        "px-4 py-2.5 text-gray-700",
                        alignClass[col.align ?? "left"],
                        col.className ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row count footer */}
      <p className="text-xs text-gray-400 mt-2 text-right">
        {(data as T[]).length}{" "}
        {(data as T[]).length === 1 ? "registro" : "registros"}
      </p>
    </div>
  );
}

export default ReportPreviewPanel;
