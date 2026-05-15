"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  Share2,
  XCircle,
} from "lucide-react";
import { useNotifications } from "@/lib/notify";
import type { NotificacaoApi } from "@/lib/api";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

const fmtRel = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

const ICONS: Record<string, typeof Clock> = {
  cotacao_pendente: Clock,
  cotacao_aprovada: CheckCircle2,
  cotacao_reprovada: XCircle,
};

const COLORS: Record<string, string> = {
  cotacao_pendente: "text-yellow-700",
  cotacao_aprovada: "text-emerald-700",
  cotacao_reprovada: "text-red-700",
};

export default function NotificationBell() {
  const {
    items,
    unread,
    connected,
    permission,
    requestPermission,
    markRead,
    markAllRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const popRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleClick = (n: NotificacaoApi) => {
    if (!n.read_at) markRead(n.id);
    setOpen(false);
    if (n.cotacao_id) {
      router.push(n.type === "cotacao_pendente" ? "/admin" : "/cotacao");
    }
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        title={connected ? "Notificações ao vivo" : "Reconectando..."}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {!connected && (
          <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-gray-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:w-96">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Notificações</div>
              <div className="text-[11px] text-gray-400">
                {connected ? "tempo real ativo" : "reconectando..."}
              </div>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <CheckCheck size={13} /> Marcar todas
              </button>
            )}
          </header>

          {permission === "default" && isIos() && !isStandalone() && (
            <div className="flex items-start gap-2 border-b border-gray-100 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-800">
              <Share2 size={13} className="mt-0.5 shrink-0" />
              <span>
                Para receber notificações no iPhone, instale o app:{" "}
                toque em <strong>Compartilhar</strong> no Safari →{" "}
                <strong>Adicionar à Tela de Início</strong>.
              </span>
            </div>
          )}
          {permission === "default" && !isIos() && (
            <button
              type="button"
              onClick={() => requestPermission()}
              className="flex w-full items-start gap-2 border-b border-gray-100 bg-blue-50 px-4 py-2.5 text-left text-[12px] text-blue-800 hover:bg-blue-100"
            >
              <Bell size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Ativar notificações</strong> do navegador para ser avisado
                mesmo com a aba em segundo plano.
              </span>
            </button>
          )}
          {permission === "default" && isIos() && isStandalone() && (
            <button
              type="button"
              onClick={() => requestPermission()}
              className="flex w-full items-start gap-2 border-b border-gray-100 bg-blue-50 px-4 py-2.5 text-left text-[12px] text-blue-800 hover:bg-blue-100"
            >
              <Bell size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Ativar notificações</strong> para ser avisado mesmo
                com o app em segundo plano.
              </span>
            </button>
          )}
          {permission === "denied" && (
            <div className="flex items-start gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[12px] text-gray-600">
              <BellOff size={13} className="mt-0.5 shrink-0" />
              <span>
                Notificações do navegador bloqueadas. Reabilite nas
                configurações do site.
              </span>
            </div>
          )}

          <ul className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-gray-400">
                Nenhuma notificação.
              </li>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const color = COLORS[n.type] || "text-gray-600";
                return (
                  <li
                    key={n.id}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      n.read_at ? "bg-white" : "bg-blue-50/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className={`mt-0.5 ${color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            className={`text-[13px] ${
                              n.read_at
                                ? "font-semibold text-gray-700"
                                : "font-bold text-gray-900"
                            }`}
                          >
                            {n.title}
                          </div>
                          <div className="shrink-0 text-[11px] text-gray-400">
                            {fmtRel(n.created_at)}
                          </div>
                        </div>
                        {n.message && (
                          <div className="mt-0.5 text-[12px] text-gray-500">
                            {n.message}
                          </div>
                        )}
                      </div>
                      {!n.read_at && (
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                          aria-label="Não lida"
                        />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
