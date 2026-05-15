"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";

interface Props {
  role?: "cotador" | "admin";
  children: React.ReactNode;
}

// Bloqueia o render até saber se o usuário tem permissão. A segurança real
// fica no backend Go (cada chamada de /api é validada pelo JWT do cookie).
// Este guard é só pra UX — evita flashes de conteúdo protegido.
export default function AuthGuard({ role, children }: Props) {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/cotacao");
    }
  }, [ready, user, role, router]);

  if (!ready || !user || (role && user.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        <Loader2 size={18} className="animate-spin-slow" />
      </div>
    );
  }
  return <>{children}</>;
}
