"use client";

import Link from "next/link";
import { Building2, Truck } from "lucide-react";
import NotificationBell from "@/components/notify/NotificationBell";
import UserMenu from "./UserMenu";
import { useSession } from "@/lib/session";

export default function Topbar() {
  const { user } = useSession();
  const role = user?.role || "cotador";
  const home = role === "admin" ? "/admin" : "/cotacao";

  return (
    <header
      style={{
        height: 52,
        background: "var(--ut-black)",
        borderBottom: "2px solid var(--ut-yellow)",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between gap-2 px-3 sm:px-6">
        {/* Brand → Dashboard */}
        <Link href={home} className="flex min-w-0 shrink items-center gap-2.5">
          <div className="ut-logo-plaque" style={{ width: 36, height: 36 }}>
            <Truck size={18} color="var(--ut-black)" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div
              className="truncate"
              style={{
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
              className="hidden truncate sm:block"
              style={{
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
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/empresas"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white/10"
          >
            <Building2 size={14} />
            <span className="hidden sm:inline">Empresas</span>
          </Link>

          <NotificationBell />

          <UserMenu user={user} />
        </nav>
      </div>
    </header>
  );
}
