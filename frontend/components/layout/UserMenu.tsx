"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { clearSession, type SessionUser } from "@/lib/session";

interface Props {
  user: SessionUser | null;
}

// UserMenu — botão da conta no header, com submenu: Dashboard, Perfil e Sair.
export default function UserMenu({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startLogout] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";
  const home = isAdmin ? "/admin" : "/cotacao";
  const roleLabel = isAdmin ? "Admin" : "Cotador";

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const logout = () => {
    setOpen(false);
    startLogout(async () => {
      try {
        await api.logout();
      } catch {
        /* limpa local mesmo se o servidor falhar */
      }
      clearSession();
      router.replace("/login");
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white/10"
      >
        {isAdmin ? <Settings size={14} /> : <UserIcon size={14} />}
        <span>{roleLabel}</span>
        <ChevronDown
          size={13}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="ut-fade-in absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-3.5 py-3">
            <div className="truncate text-[13px] font-bold text-gray-900">
              {user?.name || "—"}
            </div>
            <div className="truncate text-[12px] text-gray-500">
              {user?.email || ""}
            </div>
          </div>

          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => go(home)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-gray-700 hover:bg-gray-100"
            >
              <LayoutDashboard size={15} className="text-gray-400" />
              Dashboard
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => go("/perfil")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-gray-700 hover:bg-gray-100"
            >
              <UserIcon size={15} className="text-gray-400" />
              Perfil
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut size={15} />
              {pending ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
