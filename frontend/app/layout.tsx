import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const title = "SalesCore | Sales & CRM Platform";
const description = "Business Sales & Customer Relationship Management Platform - CRM, YBS and BI in one system.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "SalesCore",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title,
    description,
    siteName: "SalesCore",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-surface text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
