import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import type { ReactNode } from "react";
import { AppSessionProvider } from "@/components/session-provider";
import { SiteHeader } from "@/components/site-header";
import { getAuthSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trek Weather Planner",
  description: "Upload a GPX route, estimate ETAs, and visualize weather risk along your trek.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getAuthSession();

  return (
    <html lang="en">
      <body className="bg-topo font-[family:var(--font-sans)] text-storm-900 antialiased">
        <AppSessionProvider session={session}>
          <SiteHeader />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
