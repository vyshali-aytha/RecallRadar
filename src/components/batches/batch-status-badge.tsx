import { Badge } from "@/components/ui/primitives";

export function BatchStatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "sage" : status === "quarantined" ? "amber" : "neutral";
  return <Badge className="capitalize" tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
