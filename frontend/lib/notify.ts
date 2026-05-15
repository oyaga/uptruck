// Hook que mantém a lista de notificações em tempo real via SSE.
// Estratégia:
//  • mount → busca lista inicial via REST
//  • abre EventSource em /api/notificacoes/stream (cookie auth same-origin)
//  • novo evento → prepend na lista + dispara Web Notification (se permitido)
//  • EventSource já reconecta sozinho; quando reconecta, recarrega a lista
//    para fechar lacunas que o stream possa ter perdido.
//
// Quando o usuário concede permissão, registra também uma Web Push
// subscription (VAPID) — assim notificações chegam mesmo com app fechado.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type NotificacaoApi } from "@/lib/api";

const ICON = "/icon.svg";

export interface UseNotificationsResult {
  items: NotificacaoApi[];
  unread: number;
  loading: boolean;
  connected: boolean;
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<NotificationPermission>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

type Listener = (n: NotificacaoApi) => void;
const listeners = new Set<Listener>();

/** Permite outros componentes reagirem a novos eventos (ex: refetch lista de cotações). */
export function onNewNotification(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Web Push ───────────────────────────────────────────────────────────────

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function ensurePushSubscription(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { public_key } = await api.vapidPublicKey();
    if (!public_key) return;
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(public_key),
      });
    } catch (err) {
      console.warn("[push] subscribe falhou:", err);
      return;
    }
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  try {
    await api.subscribePush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      user_agent: navigator.userAgent,
    });
  } catch (err) {
    console.warn("[push] registro no backend falhou:", err);
  }
}

export function useNotifications(): UseNotificationsResult {
  const [items, setItems] = useState<NotificacaoApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission,
  );
  const esRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.listNotifications();
      setItems(list);
    } catch {
      // silencia — provavelmente offline; SSE/retry vai recuperar
    } finally {
      setLoading(false);
    }
  }, []);

  const showDesktop = useCallback(
    (n: NotificacaoApi) => {
      if (permission !== "granted") return;
      const opts: NotificationOptions = {
        body: n.message || "",
        icon: ICON,
        badge: ICON,
        tag: `uppertruck-${n.id}`,
        data: { url: n.cotacao_id ? "/cotacao" : "/" },
      };
      const isIosStandalone =
        /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
        ((navigator as { standalone?: boolean }).standalone === true ||
          window.matchMedia("(display-mode: standalone)").matches);

      if (isIosStandalone) {
        // iOS só aceita notificações via service worker
        navigator.serviceWorker.ready
          .then((reg) => reg.showNotification(n.title, opts))
          .catch(() => {});
      } else {
        // Desktop e Android — new Notification() funciona mesmo com app em foco
        try {
          const note = new Notification(n.title, opts);
          note.onclick = () => { window.focus(); note.close(); };
        } catch {
          /* ignora */
        }
      }
    },
    [permission],
  );

  // boot
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reaplica/renova a subscription de push sempre que houver permissão
  // (cobre o caso do PWA fresco depois de logar e o caso de re-login).
  useEffect(() => {
    if (permission === "granted") {
      ensurePushSubscription().catch(() => {});
    }
  }, [permission]);

  // SSE
  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/notificacoes/stream", { withCredentials: true });
    esRef.current = es;

    es.addEventListener("hello", () => setConnected(true));

    es.addEventListener("notificacao", (ev) => {
      try {
        const n = JSON.parse((ev as MessageEvent).data) as NotificacaoApi;
        setItems((prev) => {
          if (prev.some((x) => x.id === n.id)) return prev;
          return [n, ...prev].slice(0, 100);
        });
        showDesktop(n);
        listeners.forEach((fn) => fn(n));
      } catch {
        /* ignora payload malformado */
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource tenta reconectar automaticamente. Quando voltar,
      // refazemos a lista pra fechar buracos.
      window.setTimeout(() => {
        if (es.readyState === EventSource.OPEN) {
          refresh();
        }
      }, 1000);
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [refresh, showDesktop]);

  const markRead = useCallback(async (id: number) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      /* segue mesmo se falhar — próximo refresh corrige */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      /* idem */
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "denied" as NotificationPermission;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      // dispara em paralelo — UI não espera
      ensurePushSubscription().catch(() => {});
    }
    return p;
  }, []);

  const unread = items.filter((n) => !n.read_at).length;
  return {
    items,
    unread,
    loading,
    connected,
    permission,
    requestPermission,
    markRead,
    markAllRead,
    refresh,
  };
}
