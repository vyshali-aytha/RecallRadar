import { Badge } from "@/components/ui/primitives";

export function ShipmentStatusBadge({ status }: { status: string }) {
  const tone = status === "delivered" ? "sage" : status === "pending" || status === "in_transit" ? "amber" : "neutral";
  return <Badge className="capitalize" tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
