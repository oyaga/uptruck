"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { writeSession } from "@/lib/session";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { user } = await api.login(email, password);
      writeSession(user);
      router.replace(user.role === "admin" ? "/admin" : "/cotacao");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao autenticar";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Email
        </label>
        <input
          className={inputCls}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Senha
        </label>
        <input
          className={inputCls}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {loading && <Loader2 size={14} className="animate-spin-slow" />}
        Entrar
      </button>

      <p className="mt-1 text-center text-[11px] text-gray-400">
        Portaria SEAE 71/2022 — Tabela ANTT 2025
      </p>
    </form>
  );
}
