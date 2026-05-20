"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { writeSession } from "@/lib/session";

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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="ut-label">Email</label>
        <input
          className="ut-input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label className="ut-label">Senha</label>
        <input
          className="ut-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {err && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "var(--ut-danger-bg)",
            border: "1px solid var(--ut-danger-line)",
            fontSize: "var(--ut-fs-sm)",
            color: "var(--ut-danger-fg)",
          }}
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="ut-btn ut-btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 2 }}
      >
        {loading && <Loader2 size={13} className="animate-spin-slow" />}
        Entrar
      </button>

      <p
        className="text-center"
        style={{ fontSize: "var(--ut-fs-eyebrow)", color: "var(--ut-fg-faint)", marginTop: 2 }}
      >
        Portaria SEAE 71/2022 — Tabela ANTT 2025
      </p>
    </form>
  );
}
