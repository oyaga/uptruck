"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/session";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await api.logout();
          } catch {
            // Mesmo se falhar no servidor, limpa local.
          }
          clearSession();
          router.replace("/login");
        })
      }
      className="ml-1 rounded-md px-3 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-60"
    >
      Sair
    </button>
  );
}
