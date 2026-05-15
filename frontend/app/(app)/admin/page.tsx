"use client";

// Página admin — usa AuthGuard adicional pra restringir o role.
// (O layout pai já garantiu autenticação básica; aqui só refinamos pro role.)

import { useCallback, useEffect, useState } from "react";
import { Loader2, Settings } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import AdminPanel from "./AdminPanel";
import { api, type CotacaoApi } from "@/lib/api";
import { onNewNotification } from "@/lib/notify";

function AdminInner() {
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

  // Auto-refresh quando uma nova cotação pendente chegar via SSE
  useEffect(() => {
    return onNewNotification((n) => {
      if (n.type === "cotacao_pendente") load();
    });
  }, [load]);

  return (
    <main className="mx-auto max-w-[1100px] px-8 py-7">
      <div className="mb-5 flex items-center gap-2">
        <Settings size={18} className="text-gray-700" />
        <h1 className="text-lg font-extrabold text-gray-900">
          Painel Administrativo
        </h1>
      </div>

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
        <AdminPanel initialQuotes={quotes} />
      )}
    </main>
  );
}

export default function Page() {
  return (
    <AuthGuard role="admin">
      <AdminInner />
    </AuthGuard>
  );
}
