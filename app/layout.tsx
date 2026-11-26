import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans-app", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MoneyManagement",
  description: "Private, offline-first personal money tracker",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Money", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b1537",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
