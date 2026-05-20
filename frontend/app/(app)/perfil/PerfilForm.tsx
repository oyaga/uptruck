"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  UserCog,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { writeSession } from "@/lib/session";
import Field from "@/components/cotacao/Field";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export default function PerfilForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [role, setRole] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirma, setConfirma] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (cancelled) return;
        setNome(u.name);
        setEmail(u.email);
        setOrigEmail(u.email);
        setRole(u.role);
      })
      .catch((e: Error) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setErr("");
    setOk(false);

    if (!nome.trim()) {
      setErr("Informe seu nome.");
      return;
    }
    const mail = email.trim().toLowerCase();
    if (!mail || !mail.includes("@")) {
      setErr("Informe um e-mail válido.");
      return;
    }
    const emailChanged = mail !== origEmail;
    const wantsPassword = novaSenha !== "";

    if (wantsPassword) {
      if (novaSenha.length < 6) {
        setErr("A nova senha deve ter ao menos 6 caracteres.");
        return;
      }
      if (novaSenha !== confirma) {
        setErr("A confirmação da nova senha não confere.");
        return;
      }
    }
    if ((emailChanged || wantsPassword) && !senhaAtual) {
      setErr("Informe a senha atual para confirmar a alteração de e-mail ou senha.");
      return;
    }

    setSaving(true);
    try {
      const u = await api.updateProfile({
        name: nome.trim(),
        email: mail,
        current_password: senhaAtual || undefined,
        new_password: wantsPassword ? novaSenha : undefined,
      });
      writeSession({ id: u.id, email: u.email, name: u.name, role: u.role });
      setNome(u.name);
      setEmail(u.email);
      setOrigEmail(u.email);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirma("");
      setOk(true);
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao salvar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Loader2 size={18} className="animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <UserCog size={18} className="text-gray-700" />
        <h1 className="text-lg font-extrabold text-gray-900">Meu Perfil</h1>
      </div>

      {/* Conta */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Conta
          </div>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
            {role === "admin" ? "Administrador" : "Cotador"}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Nome">
            <input
              className={inputCls}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>
          <Field label="E-mail">
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </Field>
        </div>
      </section>

      {/* Senha */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Lock size={12} /> Alterar Senha
        </div>
        <p className="mb-3.5 text-[12px] text-gray-500">
          Deixe os campos de nova senha em branco para manter a senha atual.
        </p>
        <div className="flex flex-col gap-3">
          <Field label="Nova senha">
            <input
              className={inputCls}
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              className={inputCls}
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
            />
          </Field>
        </div>
      </section>

      {/* Confirmação */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <Field
          label="Senha atual"
          hint="Obrigatória para confirmar alteração de e-mail ou de senha."
        >
          <input
            className={inputCls}
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="Sua senha atual"
            autoComplete="current-password"
          />
        </Field>

        {err && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {err}
          </div>
        )}
        {ok && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            Perfil atualizado com sucesso.
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-3.5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </section>
    </div>
  );
}
