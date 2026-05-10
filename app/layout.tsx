import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const SITE_ORIGIN = "https://adhit-r.github.io";
const SITE_URL = `${SITE_ORIGIN}/holocron`;
const TITLE = "Holocron — A 3D Star Wars universe explorer, in your browser";
const DESCRIPTION =
  "Galaxy, timeline, Force-lineage, datapad — pick anything, see it everywhere. 25,000 years of canon + Legends, fully 3D, no backend.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Holocron",
  authors: [{ name: "Adhithya Rajasekaran", url: "https://github.com/adhit-r" }],
  keywords: [
    "Star Wars",
    "galaxy map",
    "knowledge base",
    "lineage",
    "timeline",
    "Three.js",
    "React Three Fiber",
    "Next.js",
    "WebGL",
    "semantic search",
    "Wookieepedia"
  ],
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Holocron",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: "Holocron — A 3D Star Wars universe explorer"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@adhit_r",
    images: [`${SITE_URL}/og.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" }
  }
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
