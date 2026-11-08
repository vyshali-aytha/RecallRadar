import type { IconName } from "@/components/ui/icon";

export type NavigationItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Suppliers", href: "/suppliers", icon: "truck" },
  { label: "Products", href: "/products", icon: "box" },
  { label: "Components", href: "/components", icon: "layers" },
  { label: "Batches", href: "/batches", icon: "package" },
  { label: "Inventory", href: "/inventory", icon: "warehouse" },
  { label: "Distributors", href: "/distributors", icon: "users" },
  { label: "Recalls", href: "/recalls", icon: "shield" },
  { label: "Recall Impact", href: "/recall-impact", icon: "chart" },
];
