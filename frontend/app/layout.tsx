import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/pwa/RegisterSW";
import InstallPWA from "@/components/pwa/InstallPWA";

const SITE_URL = "http://rastreio.uppertruck.com";
const SITE_TITLE = "Aprovação de Fretes — UpperTruck";
const SITE_DESCRIPTION =
  "Plataforma UpperTruck para cotação e aprovação de fretes rodoviários com cálculo do piso mínimo ANTT 2025 (Portaria SEAE 71/2022). Cotadores enviam, administradores aprovam.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · UpperTruck",
  },
  description: SITE_DESCRIPTION,
  applicationName: "UpperTruck — Aprovação de Fretes",
  keywords: [
    "UpperTruck",
    "aprovação de fretes",
    "cotação de frete",
    "piso mínimo ANTT",
    "ANTT 2025",
    "Portaria SEAE 71/2022",
    "frete rodoviário",
    "logística",
    "transporte de cargas",
  ],
  authors: [{ name: "UpperTruck" }],
  creator: "UpperTruck",
  publisher: "UpperTruck",
  category: "logistics",
  robots: {
    // Painel interno — bloqueia indexação por padrão
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "UpperTruck",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UpperTruck",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
        <RegisterSW />
        <InstallPWA />
      </body>
    </html>
  );
}
