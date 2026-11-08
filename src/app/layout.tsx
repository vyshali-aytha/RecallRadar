import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MockDataProvider } from "@/lib/mock-data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RecallRadar | Supply-chain intelligence",
    template: "%s | RecallRadar",
  },
  description:
    "Trace components, product batches, and recall exposure across your supply chain.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <MockDataProvider>
          <AppShell>{children}</AppShell>
        </MockDataProvider>
      </body>
    </html>
  );
}
