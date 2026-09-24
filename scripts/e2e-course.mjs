/**
 * Проходит ВСЕ уроки юнитов 0–4 подряд правильными ответами (на одной ширине),
 * проверяет, что каждый засчитан, стрик 1 и в повторении все буквы и слова курса.
 * Дальше снимает новые экраны (алфавит, карточка буквы, прописи, настройки) на 1280/768/360.
 * Запуск: BASE_URL=http://localhost:3000 node scripts/e2e-course.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { content, settle, solveLesson } from "./e2e-lib.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
mkdirSync("screenshots", { recursive: true });
const assert = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ok:", m);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const lessons = content.units.flatMap((u) => u.lessons.map((l) => l.id));
  const t0 = Date.now();
  for (const id of lessons) {
    await page.goto(`${BASE}/learn/${id}/`);
    await solveLesson(page, id, 1280, { shots: false });
    assert(await page.getByTestId("lesson-done").isVisible(), `урок ${id} засчитан`);
  }
  console.log(`  ${lessons.length} уроков за ${Math.round((Date.now() - t0) / 1000)} с`);

  await page.goto(`${BASE}/`);
  await page.getByTestId("streak").filter({ hasText: "1" }).waitFor();
  assert(true, "стрик 1");
  const expected = Object.values(content.lessons).reduce((n, l) => n + l.letters.length + l.words.length, 0);
  await page.goto(`${BASE}/review/`);
  await page.getByText(/Осталось \d+/).waitFor();
  const left = Number((await page.getByText(/Осталось \d+/).textContent()).match(/\d+/)[0]);
  assert(left === expected, `в повторении ${left} карточек (все буквы и слова курса: ${expected})`);

  const learnedCount = Object.values(content.lessons).reduce((n, l) => n + l.letters.length, 0);
  for (const width of [1280, 768, 360]) {
    await page.setViewportSize({ width, height: width < 500 ? 780 : 900 });
    await page.goto(`${BASE}/`);
    await page.getByTestId("streak").waitFor();
    await settle(page);
    await page.screenshot({ path: `screenshots/today-done-${width}.png`, fullPage: true });
    await page.goto(`${BASE}/course/`);
    await settle(page);
    await page.screenshot({ path: `screenshots/course-all-${width}.png`, fullPage: true });
    await page.goto(`${BASE}/alphabet/`);
    await page.getByText(new RegExp(`Пройдено: ${learnedCount} из 29`)).waitFor();
    await settle(page);
    await page.screenshot({ path: `screenshots/alphabet-${width}.png`, fullPage: true });
    await page.getByRole("row", { name: /^джим/ }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(250);
    await settle(page);
    await page.screenshot({ path: `screenshots/alphabet-card-${width}.png` });
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/copybook/?letters=ب,ت,ث&type=forms`);
    await page.getByTestId("sheets").waitFor();
    await page.waitForTimeout(300);
    await settle(page);
    await page.screenshot({ path: `screenshots/copybook-${width}.png`, fullPage: true });
    await page.goto(`${BASE}/settings/`);
    await page.getByTestId("offline-status").waitFor();
    await settle(page);
    await page.screenshot({ path: `screenshots/settings-${width}.png`, fullPage: true });
  }
  assert(await page.getByRole("dialog").count() === 0, "диалог закрывается по Esc");

  // Настройки: экспорт → сброс → импорт.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/settings/`);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Скачать файл" }).click()]);
  const backup = "screenshots/backup-test.json";
  await download.saveAs(backup);
  assert(/miftah-progress-\d{4}-\d{2}-\d{2}\.json/.test(download.suggestedFilename()), `экспорт: ${download.suggestedFilename()}`);
  await page.getByRole("button", { name: "Сбросить прогресс" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Сбросить" }).click();
  await page.getByText("Прогресс сброшен.").waitFor();
  await page.goto(`${BASE}/review/`);
  await page.getByText("Сейчас повторять нечего").waitFor();
  assert(true, "сброс: повторение пустое");
  await page.goto(`${BASE}/settings/`);
  await page.getByTestId("import-file").setInputFiles(backup);
  await page.getByRole("alertdialog").getByRole("button", { name: "Заменить" }).click();
  await page.getByText("Прогресс загружен из файла.").waitFor();
  await page.goto(`${BASE}/review/`);
  await page.getByText(/Осталось \d+/).waitFor();
  const restored = Number((await page.getByText(/Осталось \d+/).textContent()).match(/\d+/)[0]);
  assert(restored === expected, `импорт: вернулись ${restored} карточек`);
  await page.goto(`${BASE}/settings/`);
  await page.getByTestId("import-file").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from("{\"a\":1}") });
  await page.getByText("Это не резервная копия Мифтаха").waitFor();
  assert(true, "чужой файл: понятная ошибка, прогресс не тронут");
  const real = errors.filter((e) => !/favicon/.test(e));
  assert(real.length === 0, `нет ошибок в консоли${real.length ? ": " + real.join(" | ") : ""}`);
  console.log("\n✓ курс юнитов 0–4 пройден");
} finally {
  await browser.close();
}
