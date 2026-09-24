/**
 * Golden path: главная → карта курса → юнит 1, урок 1 → все упражнения → урок засчитан →
 * стрик 1 → карточки в повторении → перезагрузка, прогресс на месте.
 * Запуск: BASE_URL=http://localhost:3000 node scripts/e2e-golden.mjs  (нужен запущенный dev или serve)
 * Скриншоты: screenshots/<экран>-<ширина>.png
 */
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = (process.env.WIDTHS ?? "1280,768,360").split(",").map(Number);
const LESSON = process.env.LESSON ?? "u1-l1";
const content = JSON.parse(readFileSync("src/generated/content.json", "utf8"));
mkdirSync("screenshots", { recursive: true });

const log = (...a) => console.log(...a);
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  log("  ok:", msg);
}

async function solveLesson(page, lessonId, width) {
  const steps = Object.fromEntries(content.lessons[lessonId].steps.map((s) => [s.id, s]));
  const shotTypes = new Set();
  for (let guard = 0; guard < 80; guard++) {
    if (await page.getByTestId("lesson-done").isVisible().catch(() => false)) return;
    const el = page.locator("[data-step]");
    await el.waitFor({ timeout: 5000 });
    const stepId = await el.getAttribute("data-step");
    const step = steps[stepId];
    // Следующий экран: другой шаг (или тот же шаг снова, если урок его вернул) либо экран итога.
    const moved = () =>
      page.waitForFunction(
        (id) => document.querySelector('[data-testid="lesson-done"]') || document.querySelector("[data-step]")?.dataset.step !== id || document.querySelector("footer")?.textContent?.includes("Проверить"),
        stepId,
      );
    const shot = async (suffix = "") => {
      const key = step.type + suffix;
      if (shotTypes.has(key)) return;
      shotTypes.add(key);
      await page.waitForTimeout(350); // дать отыграть появлению (220 мс)
      await page.screenshot({ path: `screenshots/lesson-${key}-${width}.png`, fullPage: true });
    };
    if (step.type === "theory") {
      await shot();
      await page.keyboard.press("Enter");
      await moved();
      continue;
    }
    if (step.type === "input") {
      await page.locator("input").fill(step.answer);
    } else if (step.type === "build" || step.type === "tiles") {
      for (const token of step.answer) {
        await page.locator(`button[data-tile="${token}"]:not([disabled])`).first().click();
      }
    } else {
      // Выбор варианта клавишей: находим номер верного варианта на экране.
      const opts = await page.locator("[data-option]").evaluateAll((els) => els.map((e) => e.dataset.option));
      // Узкий экран: тап мышью; широкий: цифрой. В обоих случаях проверка клавишей Enter.
      if (width < 500) await page.locator("[data-option]").nth(opts.indexOf(step.answer)).click();
      else await page.keyboard.press(String(opts.indexOf(step.answer) + 1));
    }
    await shot();
    await page.keyboard.press("Enter");
    await page.locator("footer").getByText(/Верно|Точно|Так и есть|Правильно/).waitFor({ timeout: 3000 });
    await shot("-checked");
    await page.keyboard.press("Enter");
    await moved();
  }
  throw new Error("урок не закончился за 80 шагов");
}

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    log(`\n== ширина ${width}`);
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto(`${BASE}/`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: `screenshots/today-empty-${width}.png`, fullPage: true });

    await page.goto(`${BASE}/course/`);
    await page.screenshot({ path: `screenshots/course-${width}.png`, fullPage: true });
    const lessonTitle = content.lessons[LESSON].title;
    await page.getByRole("link", { name: new RegExp(lessonTitle) }).click();
    await page.waitForURL(`**/learn/${LESSON}/`);

    await solveLesson(page, LESSON, width);
    assert(await page.getByTestId("lesson-done").isVisible(), "урок засчитан");
    await page.screenshot({ path: `screenshots/lesson-finish-${width}.png`, fullPage: true });

    await page.goto(`${BASE}/`);
    await page.getByTestId("streak").filter({ hasText: "1" }).waitFor();
    assert((await page.getByTestId("streak").textContent()).trim() === "1", "стрик 1");
    await page.screenshot({ path: `screenshots/today-${width}.png`, fullPage: true });

    await page.goto(`${BASE}/course/`);
    await page.screenshot({ path: `screenshots/course-progress-${width}.png`, fullPage: true });

    const expected = content.lessons[LESSON].letters.length + content.lessons[LESSON].words.length;
    await page.goto(`${BASE}/review/`);
    await page.getByText(/Осталось \d+/).waitFor();
    const left = Number((await page.getByText(/Осталось \d+/).textContent()).match(/\d+/)[0]);
    assert(left === expected, `в повторении ${left} карточек (ожидалось ${expected})`);
    await page.screenshot({ path: `screenshots/review-${width}.png`, fullPage: true });
    await page.keyboard.press(" ");
    await page.screenshot({ path: `screenshots/review-revealed-${width}.png`, fullPage: true });
    await page.keyboard.press("3");
    await page.getByText(/1 из \d+/).waitFor();
    assert(true, "оценка карточки «хорошо» принята");

    await page.reload();
    await page.getByText(/Осталось \d+/).waitFor();
    const afterReload = Number((await page.getByText(/Осталось \d+/).textContent()).match(/\d+/)[0]);
    assert(afterReload === expected - 1, `после перезагрузки в очереди ${afterReload} (оценённая ушла в расписание)`);
    await page.goto(`${BASE}/`);
    await page.getByTestId("streak").filter({ hasText: "1" }).waitFor();
    assert(true, "после перезагрузки стрик и прогресс на месте");

    const real = errors.filter((e) => !/favicon/.test(e));
    assert(real.length === 0, `нет ошибок в консоли${real.length ? ": " + real.join(" | ") : ""}`);
    await ctx.close();
  }
  log("\n✓ golden path пройден");
} finally {
  await browser.close();
}
