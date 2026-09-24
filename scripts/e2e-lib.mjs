/** Общие шаги e2e: решение урока по контенту (правильными ответами). */
import { readFileSync } from "node:fs";

/** Дать отыграть появлению экрана (220 мс), чтобы скриншоты не ловили полупрозрачный кадр. */
export const settle = (page) => page.waitForTimeout(350);

export const content = JSON.parse(readFileSync("src/generated/content.json", "utf8"));

export async function solveLesson(page, lessonId, width, { shots = true } = {}) {
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
      if (!shots || shotTypes.has(key)) return;
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

