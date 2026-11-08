
import { NextResponse } from "next/server";
import driver from "@/lib/neo4j";

export async function GET() {
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
  } catch (error) {
    console.error("Neo4j connection failed:", error);

    return NextResponse.json(
      { success: false, message: "Neo4j connection failed" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
