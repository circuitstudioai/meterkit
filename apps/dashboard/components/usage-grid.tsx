"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export function UsageGrid({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: ColDef[];
}) {
  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true }), []);
  if (rows.length === 0) {
    return <p className="py-8 text-center text-slate-500">No rows yet.</p>;
  }
  return (
    <div className="ag-theme-alpine" style={{ height: 480, width: "100%" }}>
      <AgGridReact rowData={rows} columnDefs={columns} defaultColDef={defaultColDef} pagination />
    </div>
  );
}
