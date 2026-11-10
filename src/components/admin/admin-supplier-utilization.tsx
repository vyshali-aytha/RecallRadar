"use client";

import { useEffect, useState } from "react";

import { Button, Card, Select } from "@/components/ui/primitives";
import { getAllSuppliers } from "@/lib/member-a-actions";
import type { SupplierRecord } from "@/lib/member-a-types";

type SupplierDetails = SupplierRecord;

type UtilizationRow = {
  component_id: number;
  component_name: string;
  component_category: string | null;
  component_batch_id: number | null;
  component_batch_number: string | null;
  component_batch_manufacture_date: string | null;
  component_batch_expiry_date: string | null;
  component_batch_status: string | null;
  quantity_used: string | number | null;
  product_batch_id: number | null;
  product_batch_number: string | null;
  production_date: string | null;
  product_id: number | null;
  product_name: string | null;
  product_sku: string | null;
};

type Report = {
  supplier: SupplierDetails;
  utilization: UtilizationRow[];
};

type ErrorResponse = { error?: string };

function display(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function readError(status: number, body: ErrorResponse): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "Only Admin users can run this report.";
  return body.error || "The supplier utilization report could not be generated.";
}

export function AdminSupplierUtilization() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierError, setSupplierError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let active = true;
    void getAllSuppliers()
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setSupplierError(result.error);
          return;
        }
        setSuppliers(result.data);
      })
      .catch(() => {
        if (active) setSupplierError("Supplier choices could not be loaded.");
      })
      .finally(() => {
        if (active) setLoadingSuppliers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function generateReport() {
    if (!supplierId || generating) return;

    setGenerating(true);
    setReport(null);
    setReportError("");
    try {
      const response = await fetch(
        `/api/admin/reports/supplier-utilization?supplierId=${encodeURIComponent(supplierId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );
      const body = await response.json().catch(() => null) as
        | (Report & { success?: boolean; error?: string })
        | null;

      if (!response.ok || !body?.success || !body.supplier || !Array.isArray(body.utilization)) {
        setReportError(readError(response.status, body ?? {}));
        return;
      }

      setReport({ supplier: body.supplier, utilization: body.utilization });
    } catch {
      setReportError("The supplier utilization report could not be generated.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#74807b]">Stored procedure report</p>
        <h2 className="rr-heading mt-1 text-xl font-bold text-[#1d2926]">Supplier Batch Utilization</h2>
        <p className="mt-1 text-sm leading-6 text-[#74807b]">
          Trace recorded component batches into the product batches that consumed them.
        </p>
      </div>

      <Card className="space-y-4 border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block space-y-2 text-xs font-semibold text-[#46534e]">
            Supplier
            <Select
              disabled={loadingSuppliers || suppliers.length === 0}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setReport(null);
                setReportError("");
              }}
              value={supplierId}
            >
              <option value="">
                {loadingSuppliers ? "Loading suppliers…" : suppliers.length ? "Select a supplier" : "No suppliers available"}
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.supplier_id} value={supplier.supplier_id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </label>
          <Button disabled={!supplierId || generating || loadingSuppliers} onClick={() => void generateReport()}>
            {generating ? "Generating…" : "Generate Report"}
          </Button>
        </div>

        {supplierError && <p className="text-xs text-[#a64232]" role="alert">{supplierError}</p>}
        {!loadingSuppliers && !supplierError && suppliers.length === 0 && (
          <p className="text-xs text-[#74807b]" role="status">No supplier records are available.</p>
        )}
        {reportError && <p className="rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-4 py-3 text-xs text-[#a64232]" role="alert">{reportError}</p>}
      </Card>

      {report && (
        <div className="space-y-4">
          <Card className="border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[#1d2926]">Supplier information</h3>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div><dt className="font-semibold text-[#74807b]">Name</dt><dd className="mt-1 text-[#1d2926]">{report.supplier.name}</dd></div>
              <div><dt className="font-semibold text-[#74807b]">Supplier ID</dt><dd className="mt-1 text-[#1d2926]">{report.supplier.supplier_id}</dd></div>
              <div><dt className="font-semibold text-[#74807b]">Email</dt><dd className="mt-1 text-[#1d2926]">{display(report.supplier.contact_email)}</dd></div>
              <div><dt className="font-semibold text-[#74807b]">Phone</dt><dd className="mt-1 text-[#1d2926]">{display(report.supplier.phone)}</dd></div>
              <div className="sm:col-span-2"><dt className="font-semibold text-[#74807b]">Address</dt><dd className="mt-1 text-[#1d2926]">{display(report.supplier.address)}</dd></div>
            </dl>
          </Card>

          <Card className="border-[#e6e7e1] bg-[#fbfbf8] p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[#1d2926]">Components, batches, and recorded production usage</h3>
            {report.utilization.length === 0 ? (
              <p className="mt-4 text-xs text-[#74807b]">This supplier has no components recorded.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e4e6df] text-[10px] uppercase tracking-[0.08em] text-[#74807b]">
                      <th className="px-3 py-3 font-bold">Component</th>
                      <th className="px-3 py-3 font-bold">Category</th>
                      <th className="px-3 py-3 font-bold">Component batch</th>
                      <th className="px-3 py-3 font-bold">Batch dates</th>
                      <th className="px-3 py-3 font-bold">Product batch</th>
                      <th className="px-3 py-3 font-bold">Product</th>
                      <th className="px-3 py-3 text-right font-bold">Quantity used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.utilization.map((row) => (
                      <tr
                        className="border-b border-[#e4e6df]/70 last:border-0"
                        key={`${row.component_id}:${row.component_batch_id ?? "none"}:${row.product_batch_id ?? "none"}`}
                      >
                        <td className="px-3 py-3 font-semibold text-[#1d2926]">{row.component_name}</td>
                        <td className="px-3 py-3 text-[#58645f]">{display(row.component_category)}</td>
                        <td className="px-3 py-3 text-[#58645f]">
                          {row.component_batch_id === null ? "No component batches" : `${row.component_batch_number} (#${row.component_batch_id})`}
                          {row.component_batch_status && <span className="mt-1 block text-[10px] text-[#74807b]">{row.component_batch_status}</span>}
                        </td>
                        <td className="px-3 py-3 text-[#58645f]">
                          {row.component_batch_id === null ? "—" : `${display(row.component_batch_manufacture_date)} – ${display(row.component_batch_expiry_date)}`}
                        </td>
                        <td className="px-3 py-3 text-[#58645f]">
                          {row.product_batch_id === null ? "No production usage" : `${row.product_batch_number} (#${row.product_batch_id})`}
                        </td>
                        <td className="px-3 py-3 text-[#58645f]">
                          {row.product_id === null ? "—" : <>{row.product_name}<span className="mt-1 block text-[10px] text-[#74807b]">{row.product_sku}</span></>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-[#1d2926]">{display(row.quantity_used)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}
