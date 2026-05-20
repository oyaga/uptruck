"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { api, type EmpresaApi } from "@/lib/api";
import { empresaLabel, fmtCnpj } from "@/lib/empresa";
import Field from "./Field";

interface Props {
  label: string;
  value: number; // id da empresa selecionada (0 = nenhuma)
  onSelect: (e: EmpresaApi | null) => void;
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

// EmpresaSelect lista as empresas cadastradas para o cotador escolher e
// pré-preencher os dados de coleta/entrega, evitando redigitar tudo.
export default function EmpresaSelect({ label, value, onSelect }: Props) {
  const [empresas, setEmpresas] = useState<EmpresaApi[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listEmpresas()
      .then((list) => !cancelled && setEmpresas(list))
      .catch(() => !cancelled && setEmpresas([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const hint =
    empresas !== null && empresas.length === 0 ? (
      <>
        Nenhuma empresa cadastrada.{" "}
        <Link href="/empresas/nova" className="underline hover:text-gray-700">
          Cadastrar agora
        </Link>
      </>
    ) : undefined;

  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Building2
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            className={`${inputCls} pl-8`}
            value={value || ""}
            disabled={empresas === null || empresas.length === 0}
            onChange={(e) => {
              const id = Number(e.target.value);
              onSelect(empresas?.find((x) => x.id === id) || null);
            }}
          >
            <option value="">
              {empresas === null
                ? "Carregando empresas..."
                : "— Preenchimento manual —"}
            </option>
            {empresas?.map((e) => (
              <option key={e.id} value={e.id}>
                {empresaLabel(e)} · {fmtCnpj(e.cnpj)} · {e.cidade}/{e.uf}
              </option>
            ))}
          </select>
        </div>
        {empresas === null && (
          <Loader2 size={14} className="animate-spin-slow text-gray-400" />
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </Field>
  );
}
