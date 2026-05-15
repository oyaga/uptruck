import type { MetadataRoute } from "next";

// Necessário para `output: 'export'` — gera /manifest.webmanifest estático.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "UpperTruck — Aprovação de Fretes",
    short_name: "UpperTruck",
    description:
      "Plataforma UpperTruck para cotação e aprovação de fretes rodoviários (piso ANTT 2025).",
    lang: "pt-BR",
    start_url: "/cotacao",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f6",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity", "utilities"],
  };
}
