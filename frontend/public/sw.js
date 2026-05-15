// UpperTruck — service worker
// Estratégia:
//  • Estáticos do Next.js (/_next/static/*) → cache-first (são imutáveis e
//    versionados pelo nome do chunk).
//  • Demais GETs same-origin → network-first com fallback ao cache (offline
//    funciona para páginas já visitadas).
//  • POST/PATCH e qualquer chamada /api/* → sempre rede, nunca cache.
//  • Click em notificação foca/abre a aba do app.
//
// IMPORTANTE: bumpe CACHE quando precisar invalidar caches antigos no PWA já
// instalado dos usuários (o handler de activate apaga caches com nome diferente).

const CACHE = "uppertruck-v3";

self.addEventListener("install", () => {
  // Pula a fila — assume controle ao recarregar
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Só cacheia respostas que façam sentido pra navegação posterior
function isCacheable(req, res) {
  if (!res || !res.ok || res.status !== 200) return false;
  if (res.type !== "basic" && res.type !== "default") return false;
  const ct = (res.headers.get("Content-Type") || "").toLowerCase();
  // HTML, JS, CSS, JSON, imagens, fontes — tudo bem
  // Evita cachear "text/html; charset=utf-8" se for directory listing (sem doctype)
  if (ct.startsWith("text/html")) {
    // não temos como saber sem ler o body; confiamos no servidor estar correto
    return req.mode === "navigate";
  }
  return true;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nunca cachear API
  if (url.pathname === "/sw.js") return;        // o próprio SW

  // Estáticos do Next: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (isCacheable(req, res)) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Demais: network-first, fallback cache
  e.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (isCacheable(req, res)) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const shell = await cache.match("/index.html");
        if (shell) return shell;
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});

// Web Push — recebe payload do servidor mesmo com PWA fechado.
// Payload (JSON): { title, message, url, tag, icon }
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: "UpperTruck", message: e.data ? e.data.text() : "" };
  }

  const title = data.title || "UpperTruck";
  const body = data.message || "";
  const url = data.url || "/cotacao";
  const tag = data.tag || undefined;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: data.icon || "/icon.svg",
      badge: "/icon.svg",
      data: { url },
      requireInteraction: false,
    }),
  );
});

// Click em notificação push/local → foca a aba ou abre uma nova
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});

// Permite forçar ativação imediata via mensagem (útil pra atualização)
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
