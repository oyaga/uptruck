"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const ctrl = new AbortController();
    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((err) => console.warn("[sw] registro falhou:", err));
      },
      { signal: ctrl.signal },
    );
    return () => ctrl.abort();
  }, []);
  return null;
}
