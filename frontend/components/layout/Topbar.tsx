"use client";

import Link from "next/link";
import { Settings, Truck, User } from "lucide-react";
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
    <header className="border-b border-gray-200 bg-white px-8">
      <div className="mx-auto flex h-15 max-w-[1100px] items-center justify-between py-3">
        <Link href="/cotacao" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
            <Truck size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold leading-none text-gray-900">
              UpperTruck
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Aprovação de Fretes
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <Link
            href="/cotacao"
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-900"
          >
            <User size={14} /> Cotador
          </Link>
          {role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              <Settings size={14} />
              {pendingCount > 0 ? `Admin (${pendingCount})` : "Admin"}
            </Link>
          )}
          <NotificationBell />
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
