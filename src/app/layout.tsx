import type { Metadata } from "next";
import { amiri, golos, literata, naskh } from "./fonts";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Мифтах: арабский с нуля", template: "%s · Мифтах" },
  description:
    "Классический арабский (фусха) с русского по последовательности учебника Кузьмина: буквы, огласовки, чтение, интервальное повторение. Работает в браузере, без регистрации.",
  applicationName: "Мифтах",
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
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
