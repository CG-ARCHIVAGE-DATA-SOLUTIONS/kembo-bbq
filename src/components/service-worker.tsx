"use client";

import { useEffect } from "react";

/** Enregistre le service worker : coquille de l'application mise en cache. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const enregistrer = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") enregistrer();
    else window.addEventListener("load", enregistrer, { once: true });
  }, []);
  return null;
}
