import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/db";

type SupplierRow = RowDataPacket & {
  supplier_id: number;
  name: string;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
};

type UtilizationRow = RowDataPacket & {
  component_id: number;
  component_name: string;
  component_category: string | null;
  component_batch_id: number | null;
  component_batch_number: string | null;
  component_batch_manufacture_date: Date | string | null;
  component_batch_expiry_date: Date | string | null;
  component_batch_status: string | null;
  quantity_used: string | number | null;
  product_batch_id: number | null;
  product_batch_number: string | null;
  production_date: Date | string | null;
  product_id: number | null;
  product_name: string | null;
  product_sku: string | null;
};

function response(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function isMysqlSignalError(
  error: unknown,
): error is Error & { code?: string; sqlState?: string; sqlMessage?: string } {
  return error instanceof Error && "sqlState" in error;
}

export async function GET(request: Request) {
  try {
    await requireRole("Admin");

    const rawSupplierId = new URL(request.url).searchParams.get("supplierId");
    if (!rawSupplierId || !/^[1-9]\d*$/.test(rawSupplierId)) {
      return response({ success: false, error: "A positive supplier ID is required." }, 400);
    }

    const supplierId = Number(rawSupplierId);
    if (!Number.isSafeInteger(supplierId) || supplierId > 2_147_483_647) {
      return response({ success: false, error: "A positive supplier ID is required." }, 400);
    }

    const [procedureResult] = await pool.query<RowDataPacket[][]>(
      "CALL sp_get_supplier_batch_utilization(?)",
      [supplierId],
    );
    const resultSets = procedureResult.filter((resultSet) => Array.isArray(resultSet));

    if (resultSets.length !== 2 || resultSets[0].length !== 1) {
      return response({ success: false, error: "Supplier utilization report returned an unexpected result." }, 500);
    }

    return response({
      success: true,
      supplier: { ...resultSets[0][0] } as SupplierRow,
      utilization: resultSets[1].map((row) => ({ ...row } as UtilizationRow)),
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Authentication required.") {
      return response({ success: false, error: "Authentication required." }, 401);
    }
    if (message === "Insufficient role permissions.") {
      return response({ success: false, error: "Admin permission required." }, 403);
    }

    if (
      isMysqlSignalError(error) &&
      error.code === "ER_SIGNAL_EXCEPTION" &&
      error.sqlState === "45000" &&
      error.sqlMessage?.includes("Supplier ID does not exist.")
    ) {
      return response({ success: false, error: "Supplier not found." }, 404);
    }

    return response({ success: false, error: "Supplier utilization report is unavailable." }, 500);
  }
}
