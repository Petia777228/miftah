"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/offline";

/** Регистрирует service worker: после первого захода весь сайт работает без сети. */
export function ServiceWorker() {
  useEffect(registerServiceWorker, []);
  return null;
}
