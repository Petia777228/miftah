/** Раздаёт out/ как GitHub Pages: с подпапкой NEXT_PUBLIC_BASE_PATH, /dir/ → dir/index.html. npm start */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("out");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PORT = Number(process.env.PORT ?? 4000);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (BASE && !p.startsWith(BASE)) return res.writeHead(404).end();
  p = p.slice(BASE.length) || "/";
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(path.join(ROOT, "404.html")).catch(() => "404"));
  }
}).listen(PORT, () => console.log(`out/ → http://localhost:${PORT}${BASE}/`));
