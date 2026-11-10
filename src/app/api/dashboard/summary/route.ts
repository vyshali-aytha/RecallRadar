import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { requireMemberBReadAccess } from "@/lib/auth";
import { pool } from "@/lib/db";

type SummaryRow = RowDataPacket & {
  totalProducts: number;
  totalSuppliers: number;
  totalComponents: number;
  totalComponentBatches: number;
  totalProductBatches: number;
  totalDistributors: number;
  totalShipments: number;
  totalInventoryQuantity: number;
  totalRecalls: number;
  activeRecalls: number;
  totalUsers: number;
  adminUsers: number;
  staffUsers: number;
};

export async function GET() {
  try {
    await requireMemberBReadAccess();
    const [rows] = await pool.query<SummaryRow[]>(`
      SELECT
        (SELECT COUNT(*) FROM product) AS totalProducts,
        (SELECT COUNT(*) FROM supplier) AS totalSuppliers,
        (SELECT COUNT(*) FROM component) AS totalComponents,
        (SELECT COUNT(*) FROM component_batch) AS totalComponentBatches,
        (SELECT COUNT(*) FROM product_batch) AS totalProductBatches,
        (SELECT COUNT(*) FROM distributor) AS totalDistributors,
        (SELECT COUNT(*) FROM shipment) AS totalShipments,
        (SELECT COALESCE(SUM(quantity_on_hand), 0) FROM inventory) AS totalInventoryQuantity,
        (SELECT COUNT(*) FROM recall) AS totalRecalls,
        (SELECT COUNT(*) FROM recall WHERE LOWER(status) IN ('open', 'in_progress')) AS activeRecalls,
        (SELECT COUNT(*) FROM app_user) AS totalUsers,
        (SELECT COUNT(*) FROM app_user WHERE role = 'Admin') AS adminUsers,
        (SELECT COUNT(*) FROM app_user WHERE role = 'Staff') AS staffUsers
    `);

    return NextResponse.json({ success: true, summary: rows[0] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Authentication required."
      ? 401
      : message === "Insufficient role permissions."
        ? 403
        : 500;
    return NextResponse.json(
      { success: false, error: status === 401 ? "Authentication required." : status === 403 ? "Insufficient permissions." : "Dashboard summary is unavailable." },
      { status },
    );
  }
}
