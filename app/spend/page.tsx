"use client";

import { useEffect, useState, useRef } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function SpendPage() {
  const [rowData, setRowData] = useState<any[]>([]);
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    loadSpendData();
  }, []);

  const loadSpendData = async () => {
    const res = await fetch("/api/requests");
    const data = await res.json();
    const completed = (data.requests || []).filter(
      (r: any) => r.status === "completed" || r.status === "approved"
    );
    setRowData(completed);
  };

  const columnDefs: ColDef[] = [
    {
      field: "toolName",
      headerName: "Tool",
      filter: true,
      sortable: true,
      flex: 1,
    },
    {
      field: "toolCategory",
      headerName: "Category",
      filter: true,
      sortable: true,
      flex: 1,
    },
    {
      field: "department",
      headerName: "Department",
      filter: true,
      sortable: true,
      flex: 1,
    },
    {
      field: "amount",
      headerName: "Amount",
      filter: "agNumberColumnFilter",
      sortable: true,
      valueFormatter: (params) => `$${params.value.toFixed(2)}`,
      aggFunc: "sum",
    },
    {
      field: "status",
      headerName: "Status",
      filter: true,
      sortable: true,
    },
    {
      field: "paypalPayoutId",
      headerName: "PayPal Payout ID",
      filter: true,
      sortable: true,
      flex: 1.5,
    },
    {
      field: "createdAt",
      headerName: "Date",
      filter: "agDateColumnFilter",
      sortable: true,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
      flex: 1,
    },
  ];

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  const exportToCsv = () => {
    gridRef.current?.api.exportDataAsCsv();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Spend Table</h1>
            <p className="text-gray-600 mt-1">
              View and analyze AI tool spending with AG Grid
            </p>
          </div>
          <Button onClick={exportToCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spending Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                enableRangeSelection={true}
                animateRows={true}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${rowData.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Tools Purchased
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(rowData.map((r) => r.toolName)).size}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rowData.length}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
