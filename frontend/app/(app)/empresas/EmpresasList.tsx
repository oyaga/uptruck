"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api, type EmpresaApi } from "@/lib/api";
import { fmtCnpj } from "@/lib/empresa";

export default function EmpresasList() {
  const [empresas, setEmpresas] = useState<EmpresaApi[] | null>(null);
  const [err, setErr] = useState("");
  const [busca, setBusca] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .listEmpresas()
      .then(setEmpresas)
      .catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    if (!empresas) return [];
    const t = busca.trim().toLowerCase();
    if (!t) return empresas;
    const digits = t.replace(/\D/g, "");
    return empresas.filter(
      (e) =>
        e.razao_social.toLowerCase().includes(t) ||
        (e.nome_fantasia || "").toLowerCase().includes(t) ||
        e.cidade.toLowerCase().includes(t) ||
        (digits.length > 0 && e.cnpj.includes(digits)),
    );
  }, [empresas, busca]);

  async function remover(e: EmpresaApi) {
    if (
      !window.confirm(
        `Excluir a empresa "${e.nome_fantasia || e.razao_social}"? ` +
          "As cotações já enviadas mantêm o endereço, apenas o vínculo é removido.",
      )
    )
      return;
    setDeleting(e.id);
    setErr("");
    try {
      await api.deleteEmpresa(e.id);
      setEmpresas((prev) => (prev ? prev.filter((x) => x.id !== e.id) : prev));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro ao excluir empresa.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Building2 size={18} className="text-gray-700" />
          Empresas
        </h1>
        <Link
          href="/empresas/nova"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus size={14} />
          Nova Empresa
        </Link>
      </div>

      <p className="mb-4 text-[13px] text-gray-500">
        Cadastre clientes e fornecedores uma vez e reutilize os dados de coleta
        e entrega nas cotações de frete.
      </p>

      {/* Busca */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
        <Search size={15} className="shrink-0 text-gray-400" />
        <input
          className="w-full text-sm text-gray-900 outline-none"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por razão social, nome fantasia, cidade ou CNPJ"
        />
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Lista */}
      {empresas === null ? (
        <div className="flex justify-center py-14 text-gray-400">
          <Loader2 size={18} className="animate-spin-slow" />
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-14 text-center">
          <Building2 size={28} className="text-gray-300" />
          <div>
            <div className="text-sm font-bold text-gray-700">
              {empresas.length === 0
                ? "Nenhuma empresa cadastrada"
                : "Nenhuma empresa encontrada"}
            </div>
            <div className="text-[13px] text-gray-500">
              {empresas.length === 0
                ? "Cadastre a primeira empresa para agilizar suas cotações."
                : "Tente ajustar a busca."}
            </div>
          </div>
          {empresas.length === 0 && (
            <Link
              href="/empresas/nova"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <Plus size={14} />
              Nova Empresa
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((e) => {
            const inativa =
              !!e.situacao && e.situacao.toUpperCase() !== "ATIVA";
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Building2 size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {e.nome_fantasia || e.razao_social}
                    </span>
                    {e.situacao && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          inativa
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {e.situacao}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>CNPJ {fmtCnpj(e.cnpj)}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} />
                      {e.cidade}/{e.uf}
                    </span>
                    {e.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} />
                        {e.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/empresas/nova?id=${e.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={13} />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => remover(e)}
                    disabled={deleting === e.id}
                    className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    aria-label="Excluir empresa"
                  >
                    {deleting === e.id ? (
                      <Loader2 size={13} className="animate-spin-slow" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
