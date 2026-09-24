/**
 * После next build: кладёт в out/ service worker со списком ВСЕХ файлов сайта
 * и offline.json (версия, число файлов, размер) для экрана настроек.
 * Сайт маленький, поэтому при первом заходе кешируется целиком.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = "out";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SKIP = new Set(["sw.js", "offline.json", ".nojekyll"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUT).filter((f) => !SKIP.has(path.basename(f)) || path.dirname(f) !== OUT);
const hash = createHash("sha256");
let bytes = 0;
const urls = files
  .sort()
  .map((f) => {
    const buf = readFileSync(f);
    hash.update(f).update(buf);
    bytes += buf.length;
    const rel = "/" + path.relative(OUT, f).split(path.sep).join("/");
    // Страницы отдаются по адресу папки: /course/index.html → /course/
    return BASE + rel.replace(/(^|\/)index\.html$/, "$1");
  });
const version = hash.digest("hex").slice(0, 12);
// offline.json тоже в кеше: экран настроек читает его и без сети.
urls.push(BASE + "/offline.json");

const sw = `// Сгенерировано scripts/build-sw.mjs. Версия меняется при любом изменении сайта.
const BASE = ${JSON.stringify(BASE)};
const CACHE = "miftah-${version}";
const FILES = ${JSON.stringify(urls)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("miftah-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // ignoreSearch: RSC-запросы Next идут с ?_rsc=..., файл один и тот же.
      let hit = await cache.match(req, { ignoreSearch: true });
      if (!hit && req.mode === "navigate" && !url.pathname.endsWith("/")) hit = await cache.match(url.pathname + "/");
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (e) {
        if (req.mode === "navigate") return (await cache.match(BASE + "/404.html")) || Response.error();
        throw e;
      }
    })(),
  );
});
`;

writeFileSync(path.join(OUT, "sw.js"), sw);
writeFileSync(path.join(OUT, "offline.json"), JSON.stringify({ version, files: urls.length, bytes }));
console.log(`✓ service worker: ${urls.length} файлов, ${(bytes / 1024 / 1024).toFixed(1)} МБ, версия ${version}`);
