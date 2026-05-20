"use client";

import Link from "next/link";
import { Building2, Settings, Truck, User } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import NotificationBell from "@/components/notify/NotificationBell";
import { useSession } from "@/lib/session";

interface Props {
  pendingCount?: number;
}

export default function Topbar({ pendingCount = 0 }: Props) {
  const { user } = useSession();
  const role = user?.role || "cotador";

  return (
    <header
      style={{
        height: 52,
        background: "var(--ut-black)",
        borderBottom: "2px solid var(--ut-yellow)",
      }}
    >
      <div
        className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-6"
      >
        {/* Brand */}
        <Link href={role === "admin" ? "/admin" : "/cotacao"} className="flex items-center gap-2.5">
          <div
            className="ut-logo-plaque"
            style={{ width: 36, height: 36 }}
          >
            <Truck size={18} color="var(--ut-black)" strokeWidth={2.5} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--ut-font-sans)",
                fontSize: 15,
                fontWeight: 900,
                color: "var(--ut-white)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
              }}
            >
              UpperTruck
            </div>
            <div
              style={{
                fontFamily: "var(--ut-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--ut-yellow)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                lineHeight: 1,
                marginTop: 3,
              }}
            >
              Aprovação de Fretes
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {/* Cotador links — hidden for admin */}
          {role !== "admin" && (
            <>
              <Link
                href="/cotacao"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: "var(--ut-radius-sm)",
                  fontSize: "var(--ut-fs-sm)",
                  fontWeight: 600,
                  color: "var(--ut-white)",
                  textDecoration: "none",
                  transition: "background var(--ut-dur-fast) var(--ut-ease)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <User size={13} />
                Cotador
              </Link>
              <Link
                href="/empresas"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: "var(--ut-radius-sm)",
                  fontSize: "var(--ut-fs-sm)",
                  fontWeight: 600,
                  color: "var(--ut-white)",
                  textDecoration: "none",
                  transition: "background var(--ut-dur-fast) var(--ut-ease)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Building2 size={13} />
                Empresas
              </Link>
            </>
          )}

          {role === "admin" && (
            <Link
              href="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: "var(--ut-radius-sm)",
                fontSize: "var(--ut-fs-sm)",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background var(--ut-dur-fast) var(--ut-ease)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {/* Pending badge */}
              {pendingCount > 0 ? (
                <span
                  className="ut-badge pending"
                  style={{ fontSize: 11, color: "var(--ut-pending-fg)" }}
                >
                  {pendingCount}
                </span>
              ) : (
                <Settings size={13} style={{ color: "var(--ut-n-400)" }} />
              )}
              <span style={{ color: "var(--ut-white)" }}>
                Admin{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </span>
            </Link>
          )}

          {/* Notification bell */}
          <NotificationBell />

          {/* Logout */}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
