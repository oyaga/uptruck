"use client";

// Página admin — usa AuthGuard adicional pra restringir o role.
// (O layout pai já garantiu autenticação básica; aqui só refinamos pro role.)

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Settings } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import AdminPanel from "./AdminPanel";
import { api, type CotacaoApi } from "@/lib/api";
import { onNewNotification } from "@/lib/notify";
import { useSession } from "@/lib/session";

function AdminInner() {
  const sp = useSearchParams();
  const justCreated = sp.get("created") === "1";
  const { user } = useSession();
  const [quotes, setQuotes] = useState<CotacaoApi[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api
      .listAll()
      .then(setQuotes)
      .catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh quando uma cotação for criada ou avançar de etapa
  useEffect(() => {
    return onNewNotification((n) => {
      if (n.cotacao_id) load();
    });
  }, [load]);

  return (
    <main className="mx-auto max-w-[1100px] px-8 py-7">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-700" />
          <h1 className="text-lg font-extrabold text-gray-900">
            Painel Administrativo
          </h1>
        </div>
        <Link
          href="/cotacao/nova"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-gray-800"
        >
          <Plus size={14} />
          Nova cotação
        </Link>
      </div>

      {justCreated && (
        <div
          className="mb-3 flex items-center gap-2 rounded-lg px-4 py-2.5"
          style={{
            background: "var(--ut-success-bg)",
            border: "1px solid var(--ut-success-line)",
            fontSize: "var(--ut-fs-sm)",
            fontWeight: 600,
            color: "var(--ut-success-fg)",
          }}
        >
          Cotação criada com sucesso.
        </div>
      )}

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {quotes === null ? (
        <div className="flex justify-center py-12 text-gray-400">
          <Loader2 size={18} className="animate-spin-slow" />
        </div>
      ) : (
        <AdminPanel initialQuotes={quotes} currentUserId={user?.id} />
      )}
    </main>
  );
}

export default function Page() {
  return (
    <AuthGuard role="admin">
      <Suspense fallback={null}>
        <AdminInner />
      </Suspense>
    </AuthGuard>
  );
}
