"use client";

import { useEffect, useState } from "react";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const CACHE_PREFIX = "miftah-";

export type OfflineMeta = { version: string; files: number; bytes: number };
export type OfflineStatus =
  | { state: "checking" }
  | { state: "dev" }
  | { state: "unsupported" }
  | { state: "installing"; meta: OfflineMeta; cached: number }
  | { state: "ready"; meta: OfflineMeta };

/** Скачан ли весь сайт в кеш service worker (список файлов пишет scripts/build-sw.mjs в offline.json). */
export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>({ state: "checking" });
  useEffect(() => {
    let stop = false;
    let meta: OfflineMeta | null = null;
    const check = async () => {
      if (process.env.NODE_ENV !== "production") return setStatus({ state: "dev" });
      if (!("serviceWorker" in navigator) || !("caches" in window)) return setStatus({ state: "unsupported" });
      try {
        meta ??= (await (await fetch(`${BASE_PATH}/offline.json`, { cache: "no-store" })).json()) as OfflineMeta;
      } catch {
        // Нет сети и нет кеша файла — значит, офлайн-копии ещё нет.
      }
      if (!meta) return;
      const name = CACHE_PREFIX + meta.version;
      const cached = (await caches.has(name)) ? (await (await caches.open(name)).keys()).length : 0;
      if (stop) return;
      if (cached >= meta.files) setStatus({ state: "ready", meta });
      else {
        setStatus({ state: "installing", meta, cached });
        setTimeout(check, 1000);
      }
    };
    void Promise.resolve().then(check);
    return () => {
      stop = true;
    };
  }, []);
  return status;
}

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
}
