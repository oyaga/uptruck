"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginLeft: 4,
        padding: "5px 10px",
        borderRadius: "var(--ut-radius-sm)",
        background: "transparent",
        border: 0,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.5 : 1,
        color: "var(--ut-n-400)",
        fontSize: "var(--ut-fs-sm)",
        fontWeight: 600,
        fontFamily: "var(--ut-font-sans)",
        transition: "background var(--ut-dur-fast) var(--ut-ease), color var(--ut-dur-fast) var(--ut-ease)",
      }}
      onMouseEnter={(e) => {
        if (!pending) {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ut-white)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ut-n-400)";
      }}
    >
      <LogOut size={13} />
      Sair
    </button>
  );
}
