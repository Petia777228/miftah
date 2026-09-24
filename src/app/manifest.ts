import type { MetadataRoute } from "next";
import { BASE_PATH, brand } from "@/lib/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Мифтах: арабский с нуля",
    short_name: "Мифтах",
    description: "Классический арабский с нуля по порядку учебника Кузьмина. Работает офлайн.",
    lang: "ru",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: brand.paper,
    theme_color: brand.paper,
    icons: [
      { src: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE_PATH}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
