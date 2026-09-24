import type { Metadata } from "next";
import { amiri, golos, literata, naskh } from "./fonts";
import { ServiceWorker } from "@/components/service-worker";
import { BASE_PATH, SITE_URL } from "@/lib/brand";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

const DESCRIPTION =
  "Классический арабский (фусха) с нуля, по порядку учебника С. А. Кузьмина: буквы, огласовки, чтение, первые фразы. Бесплатно, без регистрации, работает офлайн, прописи для печати.";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}${BASE_PATH}/`),
  title: { default: "Мифтах: арабский с нуля", template: "%s · Мифтах" },
  description: DESCRIPTION,
  applicationName: "Мифтах",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Мифтах",
    title: "Мифтах: арабский с нуля",
    description: DESCRIPTION,
    url: "./",
    images: [{ url: "og.png", width: 1200, height: 630, alt: "Мифтах, مِفْتَاح: классический арабский с нуля" }],
  },
  twitter: { card: "summary_large_image", images: ["og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${amiri.variable} ${naskh.variable} ${literata.variable} ${golos.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
