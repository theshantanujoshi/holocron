import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holocron — Archive of the galaxy",
  description:
    "A unified explorer for the Star Wars universe. Galaxy, timeline, lineage, and datapad — one selection state, four coupled views. Canon and Legends.",
  applicationName: "Holocron",
  authors: [{ name: "Adhithya Rajasekaran" }],
  keywords: ["Star Wars", "galaxy map", "knowledge base", "lineage", "timeline"],
  formatDetection: { telephone: false, email: false, address: false }
};

export const viewport: Viewport = {
  themeColor: "#08090d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[9999] focus:rounded-md focus:border focus:border-accent focus:bg-bg-overlay focus:px-4 focus:py-2 focus:text-sm focus:text-fg-strong focus:outline-none"
        >
          Skip to content
        </a>
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
