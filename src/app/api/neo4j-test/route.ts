
import { NextResponse } from "next/server";
import driver from "@/lib/neo4j";
import { requireRole } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("Admin");
    const session = driver.session({
      database: process.env.NEO4J_DATABASE || "neo4j",
    });

    try {
      const result = await session.run(
        "RETURN 'RecallRadar Neo4j Connected!' AS message"
      );

      return NextResponse.json({
        success: true,
        message: result.records[0].get("message"),
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Authentication required."
      ? 401
      : message === "Insufficient role permissions."
        ? 403
        : 500;

    return NextResponse.json(
      { success: false, message: status === 401 ? "Authentication required." : status === 403 ? "Admin permission required." : "Neo4j connection failed." },
      { status }
    );
  }
}
