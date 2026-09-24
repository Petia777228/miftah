# Мифтах (مفتاح) — классический арабский с нуля, с русского

`npm install && npm run dev` → http://localhost:3000 (контент из `content/*.yaml` собирается и проверяется автоматически).
`npm run build` → статика в `out/`; `npm run content` — только проверка контента; `npm run e2e` — golden path в Playwright (нужен запущенный dev).
Прогресс хранится в браузере (IndexedDB), сервер и база не нужны. Деплой: push в `main` → GitHub Actions → https://petia777228.github.io/miftah/
