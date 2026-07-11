import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit Check — Fleek sourcing",
  description:
    "B2B resale sourcing on a three-tier trait standard: source, search, sell, and trait-bid against live supplier lots.",
};

export const viewport: Viewport = {
  themeColor: "#ffdb5b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
