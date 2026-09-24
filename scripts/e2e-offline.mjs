/**
 * Офлайн: первый заход кеширует сайт целиком, затем без сети открываются главная,
 * урок (и проходится первый шаг), повторение, алфавит, прописи, переходы по меню.
 * Нужна production-сборка: npm run build && npm start (или живой Pages через BASE_URL).
 */
import { chromium } from "@playwright/test";

const BASE = (process.env.BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
const assert = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ok:", m);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  assert((await page.locator("nextjs-portal").count()) === 0, "индикатора Next dev на проде нет");
  // Ждём, пока service worker возьмёт страницу под контроль и скачает всё.
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 });
  const meta = await page.evaluate(async () => {
    const base = new URL(navigator.serviceWorker.controller.scriptURL).pathname.replace(/\/sw\.js$/, "");
    const m = await (await fetch(`${base}/offline.json`)).json();
    const cache = await caches.open(`miftah-${m.version}`);
    return { files: m.files, cached: (await cache.keys()).length };
  });
  assert(meta.cached === meta.files, `в кеше все файлы: ${meta.cached} из ${meta.files}`);

  await page.goto(`${BASE}/settings/`);
  await page.getByTestId("offline-status").filter({ hasText: "Доступно офлайн" }).waitFor();
  assert(true, "настройки: «Доступно офлайн»");
  await page.screenshot({ path: "screenshots/settings-offline-390.png", fullPage: true });

  await ctx.setOffline(true);
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert(true, "без сети открывается главная");
  await page.reload();
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert(true, "без сети работает перезагрузка");

  await page.goto(`${BASE}/learn/u1-l1/`);
  await page.locator("[data-step]").waitFor();
  const first = await page.locator("[data-step]").getAttribute("data-step");
  await page.getByRole("button", { name: /Дальше/ }).click();
  await page.waitForFunction((id) => document.querySelector("[data-step]")?.dataset.step !== id, first);
  assert(true, "без сети открывается урок и идёт дальше");

  for (const [path, text] of [["/review/", /Повторение|повторять нечего/], ["/alphabet/", /Алфавит/], ["/copybook/", /Прописи/], ["/course/", /Карта курса/]]) {
    await page.goto(`${BASE}${path}`);
    await page.getByRole("heading", { level: 1, name: text }).waitFor();
    assert(true, `без сети открывается ${path}`);
  }
  // Клиентский переход по меню (RSC-файлы тоже в кеше).
  await page.getByRole("link", { name: "Алфавит" }).last().click();
  await page.getByRole("heading", { level: 1, name: "Алфавит" }).waitFor();
  assert(true, "без сети работает переход по меню");

  // Тач-устройство: подсказок про клавиши нет.
  await page.goto(`${BASE}/learn/u1-l1/`);
  await page.locator("[data-step]").waitFor();
  const kbdVisible = await page.locator("kbd").evaluateAll((els) => els.some((e) => getComputedStyle(e).display !== "none"));
  const hintVisible = await page.getByText(/Клавиши 1–9/).isVisible().catch(() => false);
  assert(!kbdVisible && !hintVisible, "pointer: coarse — подсказки клавиш скрыты");
  console.log("\n✓ офлайн проверен");
} finally {
  await browser.close();
}
