"use client";

export type RecallImpactAnalysis = {
  recallId: number;
  recall: Record<string, unknown> | null;
  recalledComponent: Record<string, unknown> | null;
  recalledComponentBatch: Record<string, unknown> | null;
  affectedProducts: Record<string, unknown>[];
  affectedProductBatches: Record<string, unknown>[];
  distributors: Record<string, unknown>[];
  shipments: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  inventoryLocations: Record<string, unknown>[];
};

type ErrorPayload = { error?: unknown };

export async function fetchRecallImpactAnalysis(recallId: number): Promise<RecallImpactAnalysis> {
  const response = await fetch(`/api/recall-impact/${recallId}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) throw new Error("Sign in to view recall impact analysis.");
    if (response.status === 403) throw new Error("Your account cannot access recall impact analysis.");
    if (response.status === 404) throw new Error("The selected recall was not found.");
    if (response.status === 400) throw new Error("The selected recall ID is invalid.");
    throw new Error("Recall impact analysis is unavailable. Check the database and graph service, then retry.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("The server returned an invalid recall impact response.");
  }

  const result = payload as RecallImpactAnalysis & ErrorPayload;
  if (
    !Number.isInteger(result.recallId) ||
    !Array.isArray(result.affectedProducts) ||
    !Array.isArray(result.affectedProductBatches) ||
    !Array.isArray(result.distributors) ||
    !Array.isArray(result.shipments) ||
    !Array.isArray(result.inventory) ||
    !Array.isArray(result.inventoryLocations)
  ) {
    throw new Error("The server returned an invalid recall impact response.");
  }

  return result;
}

export function recordText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function recordNumber(record: Record<string, unknown>, key: string): number | null {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : null;
}
