"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export function UsageGrid({
  rows,
  columns,
  emptyMessage = "No records yet.",
}: {
  rows: Record<string, unknown>[];
  columns: ColDef[];
  emptyMessage?: string;
}) {
  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true, minWidth: 140 }),
    [],
  );
  if (rows.length === 0) {
    return <p className="meter-empty">{emptyMessage}</p>;
  }
  return (
    <div
      className="ag-theme-alpine"
      role="region"
      aria-label="Records table"
      style={{ height: 480, width: "100%", minWidth: 0 }}
    >
      <AgGridReact
        theme="legacy"
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        pagination
      />
    </div>
  );
}
