/**
 * Генерирует иконки PWA, favicon и картинку Open Graph из токенов и шрифтов проекта.
 * Запуск: npm run images (результат коммитится, в сборке не участвует).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KeyRound } from "lucide-react";
import { chromium } from "@playwright/test";

const css = readFileSync("src/styles/tokens.css", "utf8");
const light = css.slice(css.indexOf(":root"), css.indexOf('[data-theme="dark"]'));
const tok = (n) => light.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{3,8})`))[1];
const C = { paper: tok("paper"), sheet: tok("sheet"), ink: tok("ink"), soft: tok("ink-soft"), rubric: tok("rubric"), rule: tok("rule") };

const font = (file) => `data:font/woff2;base64,${readFileSync(`src/app/fonts/${file}`).toString("base64")}`;
const fonts = `
@font-face { font-family: Amiri; src: url(${font("Amiri-Regular.woff2")}); }
@font-face { font-family: Literata; src: url(${font("Literata-Variable.woff2")}); font-weight: 400 700; }
@font-face { font-family: Golos; src: url(${font("GolosText-Variable.woff2")}); font-weight: 400 900; }
* { margin: 0; box-sizing: border-box; }`;

const key = (size, stroke = 1.6) =>
  renderToStaticMarkup(createElement(KeyRound, { size, color: C.rubric, strokeWidth: stroke }));

const iconHtml = (px, keyShare) => `<html><head><style>${fonts}
body { width:${px}px; height:${px}px; background:${C.paper}; display:grid; place-items:center; }
</style></head><body>${key(Math.round(px * keyShare), 1.75)}</body></html>`;

const ogHtml = `<html><head><style>${fonts}
body { width:1200px; height:630px; background:${C.paper}; color:${C.ink}; font-family:Golos; position:relative; overflow:hidden; }
.frame { position:absolute; inset:36px; border:2px solid ${C.rule}; border-radius:28px; background:${C.sheet}; }
.ar { position:absolute; right:96px; top:78px; font-family:Amiri; font-size:210px; line-height:1.6; color:${C.rubric}; direction:rtl; }
.name { position:absolute; left:96px; top:112px; display:flex; align-items:center; gap:22px; font-family:Literata; font-weight:600; font-size:64px; }
.lead { position:absolute; left:96px; bottom:128px; width:760px; font-size:34px; line-height:1.35; color:${C.ink}; }
.meta { position:absolute; left:96px; bottom:80px; font-size:24px; color:${C.soft}; }
</style></head><body><div class="frame"></div>
<div class="name">${key(64, 2)}Мифтах</div>
<div class="ar">مِفْتَاح</div>
<p class="lead">Классический арабский с нуля, по порядку учебника Кузьмина</p>
<p class="meta">Бесплатно · работает офлайн · прописи для печати</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log("✓", out);
}
await shot(iconHtml(512, 0.6), 512, 512, "public/icon-512.png");
await shot(iconHtml(192, 0.6), 192, 192, "public/icon-192.png");
await shot(iconHtml(512, 0.44), 512, 512, "public/icon-maskable-512.png");
await shot(iconHtml(180, 0.6), 180, 180, "src/app/apple-icon.png");
await shot(ogHtml, 1200, 630, "public/og.png");
await browser.close();

// Favicon: векторный ключ на бумаге, цвета из токенов.
const svgKey = renderToStaticMarkup(createElement(KeyRound, { size: 40, x: 12, y: 12, color: C.rubric, strokeWidth: 2.2 }));
writeFileSync(
  "src/app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${C.paper}"/>${svgKey}</svg>\n`,
);
console.log("✓ src/app/icon.svg");
