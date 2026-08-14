import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/branding/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Agency Dashboard`,
    short_name: BRAND_NAME,
    description: "Internal workflow dashboard for the team",
    start_url: "/today",
    display: "standalone",
    background_color: "#0a0b10",
    theme_color: "#0a0b10",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
