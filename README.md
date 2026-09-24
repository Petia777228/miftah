# Мифтах (مفتاح) — классический арабский с нуля, с русского

`npm install && npm run dev` → http://localhost:3000 (контент из `content/*.yaml` собирается и проверяется автоматически).
`npm run build && npm start` → статика `out/` с service worker на http://localhost:4000. `npm run content` — только проверка контента, `npm run images` — иконки и og.png.
Проверки (Playwright, нужен запущенный сайт, `BASE_URL=...`): `npm run e2e` (golden path), `node scripts/e2e-course.mjs` (весь курс + настройки), `scripts/e2e-print.mjs` (PDF A4), `scripts/e2e-offline.mjs` (офлайн, нужна сборка).
Прогресс в браузере (IndexedDB), сервера нет. Деплой: push в `main` → GitHub Actions → https://petia777228.github.io/miftah/
