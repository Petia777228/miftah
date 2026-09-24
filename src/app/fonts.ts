import localFont from "next/font/local";

/** Все шрифты самохостинговые, лицензия OFL: см. ./fonts/OFL.txt. */

export const amiri = localFont({
  src: "./fonts/Amiri-Regular.woff2",
  variable: "--font-amiri",
  weight: "400",
  display: "swap",
  preload: true,
});

export const naskh = localFont({
  src: "./fonts/NotoNaskhArabic-Variable.woff2",
  variable: "--font-naskh",
  weight: "400 700",
  display: "swap",
  preload: false,
});

export const literata = localFont({
  src: "./fonts/Literata-Variable.woff2",
  variable: "--font-literata",
  weight: "400 700",
  display: "swap",
});

export const golos = localFont({
  src: "./fonts/GolosText-Variable.woff2",
  variable: "--font-golos",
  weight: "400 900",
  display: "swap",
});
