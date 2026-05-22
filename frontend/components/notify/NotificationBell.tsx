"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
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
  cotacao_nova:       Clock,
  cotacao_respondida: CheckCircle2,
  cotacao_atualizada: RefreshCw,
  cotacao_recusada:   XCircle,
  // tipos legados
  cotacao_pendente:   Clock,
  cotacao_aprovada:   CheckCircle2,
  cotacao_reprovada:  XCircle,
};

/** Map notification type → UT token color */
const TYPE_COLOR: Record<string, string> = {
  cotacao_nova:       "var(--ut-pending-fg)",
  cotacao_respondida: "var(--ut-success-fg)",
  cotacao_atualizada: "var(--ut-info-fg)",
  cotacao_recusada:   "var(--ut-danger-fg)",
  cotacao_pendente:   "var(--ut-pending-fg)",
  cotacao_aprovada:   "var(--ut-success-fg)",
  cotacao_reprovada:  "var(--ut-danger-fg)",
};

// Tipos de notificação destinados ao admin — clicar leva ao /admin.
const ADMIN_TYPES = ["cotacao_nova", "cotacao_atualizada", "cotacao_pendente"];

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

  // Close on outside click
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
      router.push(ADMIN_TYPES.includes(n.type) ? "/admin" : "/cotacao");
    }
  };

  return (
    <div className="relative" ref={popRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--ut-radius-sm)",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: "var(--ut-n-400)",
          transition: "background var(--ut-dur-fast) var(--ut-ease), color var(--ut-dur-fast) var(--ut-ease)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ut-white)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ut-n-400)";
        }}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        title={connected ? "Notificações ao vivo" : "Reconectando..."}
      >
        <Bell size={16} />

        {/* Unread badge — yellow pill */}
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: "var(--ut-radius-pill)",
              background: "var(--ut-yellow)",
              color: "var(--ut-black)",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: "16px",
              textAlign: "center",
              padding: "0 3px",
              fontFamily: "var(--ut-font-sans)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}

        {/* Offline dot */}
        {!connected && (
          <span
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--ut-n-500)",
            }}
          />
        )}
      </button>

      {/* Dropdown popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            zIndex: 50,
            width: 340,
            background: "var(--ut-bg-elevated)",
            border: "1px solid var(--ut-border)",
            borderRadius: "var(--ut-radius-lg)",
            boxShadow: "var(--ut-shadow-md)",
            overflow: "hidden",
          }}
          className="ut-fade-in sm:w-96"
        >
          {/* Popover header */}
          <header
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--ut-border)" }}
          >
            <div>
              <div
                style={{
                  fontSize: "var(--ut-fs-sm)",
                  fontWeight: 700,
                  color: "var(--ut-fg)",
                }}
              >
                Notificações
              </div>
              <div style={{ fontSize: "var(--ut-fs-eyebrow)", color: "var(--ut-fg-faint)", marginTop: 2 }}>
                {connected ? "tempo real ativo" : "reconectando..."}
              </div>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 8px",
                  borderRadius: "var(--ut-radius-sm)",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontSize: "var(--ut-fs-xs)",
                  fontWeight: 600,
                  color: "var(--ut-fg-muted)",
                  fontFamily: "var(--ut-font-sans)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "var(--ut-n-50)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                }
              >
                <CheckCheck size={13} />
                Marcar todas
              </button>
            )}
          </header>

          {/* Permission banners */}
          {permission === "default" && isIos() && !isStandalone() && (
            <div
              className="flex items-start gap-2 px-4 py-2.5"
              style={{
                borderBottom: "1px solid var(--ut-border)",
                background: "var(--ut-pending-bg)",
                fontSize: "var(--ut-fs-xs)",
                color: "var(--ut-pending-fg)",
              }}
            >
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
              className="flex w-full items-start gap-2 px-4 py-2.5 text-left"
              style={{
                borderBottom: "1px solid var(--ut-border)",
                background: "var(--ut-info-bg)",
                fontSize: "var(--ut-fs-xs)",
                color: "var(--ut-info-fg)",
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--ut-font-sans)",
              }}
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
              className="flex w-full items-start gap-2 px-4 py-2.5 text-left"
              style={{
                borderBottom: "1px solid var(--ut-border)",
                background: "var(--ut-info-bg)",
                fontSize: "var(--ut-fs-xs)",
                color: "var(--ut-info-fg)",
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--ut-font-sans)",
              }}
            >
              <Bell size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>Ativar notificações</strong> para ser avisado mesmo
                com o app em segundo plano.
              </span>
            </button>
          )}
          {permission === "denied" && (
            <div
              className="flex items-start gap-2 px-4 py-2.5"
              style={{
                borderBottom: "1px solid var(--ut-border)",
                background: "var(--ut-n-50)",
                fontSize: "var(--ut-fs-xs)",
                color: "var(--ut-fg-muted)",
              }}
            >
              <BellOff size={13} className="mt-0.5 shrink-0" />
              <span>
                Notificações do navegador bloqueadas. Reabilite nas
                configurações do site.
              </span>
            </div>
          )}

          {/* Notification list */}
          <ul style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {items.length === 0 ? (
              <li
                className="px-4 py-10 text-center"
                style={{ fontSize: "var(--ut-fs-sm)", color: "var(--ut-fg-faint)" }}
              >
                Nenhuma notificação.
              </li>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const iconColor = TYPE_COLOR[n.type] || "var(--ut-fg-muted)";
                return (
                  <li
                    key={n.id}
                    style={{
                      borderBottom: "1px solid var(--ut-border)",
                      background: n.read_at ? "var(--ut-bg-elevated)" : "var(--ut-yellow-soft)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left"
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "var(--ut-font-sans)",
                        width: "100%",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = "var(--ut-n-50)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                      }
                    >
                      <div style={{ marginTop: 2, color: iconColor, flexShrink: 0 }}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            style={{
                              fontSize: "var(--ut-fs-sm)",
                              fontWeight: n.read_at ? 500 : 700,
                              color: "var(--ut-fg)",
                            }}
                          >
                            {n.title}
                          </div>
                          <div
                            style={{
                              flexShrink: 0,
                              fontSize: "var(--ut-fs-eyebrow)",
                              color: "var(--ut-fg-faint)",
                            }}
                          >
                            {fmtRel(n.created_at)}
                          </div>
                        </div>
                        {n.message && (
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: "var(--ut-fs-xs)",
                              color: "var(--ut-fg-muted)",
                            }}
                          >
                            {n.message}
                          </div>
                        )}
                      </div>
                      {!n.read_at && (
                        <div
                          style={{
                            marginTop: 6,
                            width: 7,
                            height: 7,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: "var(--ut-yellow-deep)",
                          }}
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
