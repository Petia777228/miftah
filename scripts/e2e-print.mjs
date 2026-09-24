/**
 * Печать прописей: PDF A4 через page.pdf, число страниц = числу листов,
 * ни одна строка не выходит за лист, образец справа (письмо справа налево).
 * PDF-примеры: screenshots/copybook-*.pdf
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
mkdirSync("screenshots", { recursive: true });
const assert = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ok:", m);
};

const CASES = [
  { name: "forms", query: "letters=ب,ت,ث&type=forms" },
  { name: "words", query: "letters=ج,ح,خ,ع&type=words" },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const c of CASES) {
    console.log(`\n== ${c.name}`);
    await page.goto(`${BASE}/copybook/?${c.query}`);
    await page.getByTestId("sheets").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(300);

    const geo = await page.evaluate(() => {
      const mm = 96 / 25.4;
      return [...document.querySelectorAll("article.sheet")].map((sheet) => {
        const s = sheet.getBoundingClientRect();
        const rows = [...sheet.querySelectorAll(".cb-row")].map((r) => r.getBoundingClientRect());
        const samples = [...sheet.querySelectorAll(".cb-row [lang=ar]")].map((el) => {
          const spans = [...el.children].map((x) => x.getBoundingClientRect());
          return { dir: getComputedStyle(el).direction, firstRight: spans[0]?.right, maxRight: Math.max(...spans.map((x) => x.right)), minLeft: Math.min(...spans.map((x) => x.left)) };
        });
        return {
          wMm: s.width / mm,
          hMm: s.height / mm,
          overflow: rows.some((r) => r.bottom > s.bottom - 12 * mm + 1 || r.top < s.top),
          sampleOut: samples.some((x) => x.minLeft < s.left + 12 * mm - 1 || x.maxRight > s.right - 12 * mm + 1),
          rtl: samples.every((x) => x.dir === "rtl" && Math.abs(x.firstRight - x.maxRight) < 1),
          rows: rows.length,
        };
      });
    });
    assert(geo.length > 0, `листов на экране печати: ${geo.length}`);
    assert(geo.every((g) => Math.abs(g.wMm - 210) < 0.5 && Math.abs(g.hMm - 297) < 0.5), "каждый лист 210×297 мм");
    assert(geo.every((g) => !g.overflow), "строки не выходят за поля листа");
    assert(geo.every((g) => !g.sampleOut), "образцы не выходят за поля по ширине");
    assert(geo.every((g) => g.rtl), "письмо справа налево: чёрный образец у правого края");

    const file = `screenshots/copybook-${c.name}.pdf`;
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    writeFileSync(file, pdf);
    const text = readFileSync(file, "latin1");
    const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert(pages === geo.length, `страниц в PDF ${pages} = листов ${geo.length}`);
    assert(boxes.length > 0 && boxes.every(([w, h]) => Math.abs(w - 595.3) < 2 && Math.abs(h - 841.9) < 2), `формат A4 (${boxes[0]?.map((x) => Math.round(x)).join("×")} pt)`);
    console.log("  PDF:", file);
    await page.emulateMedia({ media: "screen" });
  }
  console.log("\n✓ печать прописей проверена");
} finally {
  await browser.close();
}
