
import driver from "./neo4j";

export async function testNeo4jConnection() {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });

  try {
    const result = await session.run(
      "RETURN 'RecallRadar Neo4j Connected!' AS message"
    );

    return result.records[0].get("message");
  } finally {
    await session.close();
  }
}
