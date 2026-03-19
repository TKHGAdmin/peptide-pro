import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Content Calendar - AI-Powered Content Strategy",
  description:
    "Scrape, analyze, and plan your Instagram content with AI-powered insights, competitor analysis, and brand-aligned suggestions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
