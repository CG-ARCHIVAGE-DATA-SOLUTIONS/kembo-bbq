import type { Metadata, Viewport } from "next";
import { Anton, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { Annonces } from "@/components/ui/annonces";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const plexMono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Kembo BBQ — Gestion",
  description: "Caisse, stock et rentabilité de l'activité de grillades Kembo BBQ.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Kembo BBQ" },
  icons: {
    icon: [
      { url: "/icones/kembo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icones/kembo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icones/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${anton.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">
        <Annonces>{children}</Annonces>
        <ServiceWorker />
      </body>
    </html>
  );
}
