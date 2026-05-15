"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { fetchCep, fmtCep, UFS } from "@/lib/antt";
import Field from "./Field";

interface Props {
  prefix: "ori" | "des";
  cep: string;
  setCep: (v: string) => void;
  uf: string;
  setUf: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  bairro: string;
  setBairro: (v: string) => void;
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

export default function CepBlock({
  prefix,
  cep,
  setCep,
  uf,
  setUf,
  cidade,
  setCidade,
  bairro,
  setBairro,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const buscar = async (raw: string) => {
    const n = raw.replace(/\D/g, "");
    if (n.length < 8) return;
    setLoading(true);
    setErr("");
    try {
      const d = await fetchCep(raw);
      setUf(d.uf || "");
      setCidade((d.localidade || "").toUpperCase());
      setBairro((d.bairro || "").toUpperCase());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao consultar o CEP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Field
        label={prefix === "ori" ? "CEP Origem" : "CEP Destino"}
        hint={err}
        hintColor="#dc2626"
      >
        <div className="flex gap-1.5">
          <input
            className={`${inputCls} flex-1`}
            value={cep}
            maxLength={9}
            placeholder="00000-000"
            onChange={(e) => {
              const v = fmtCep(e.target.value);
              setCep(v);
              if (v.replace(/\D/g, "").length === 8) buscar(v);
            }}
          />
          <button
            type="button"
            onClick={() => buscar(cep)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin-slow" />
            ) : (
              <Search size={14} />
            )}
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Field label="UF">
          <select
            className={inputCls}
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">--</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cidade">
          <input
            className={inputCls}
            value={cidade}
            onChange={(e) => setCidade(e.target.value.toUpperCase())}
            placeholder="Ex: MAUÁ"
          />
        </Field>
      </div>

      <Field label="Bairro / Distrito">
        <input
          className={inputCls}
          value={bairro}
          onChange={(e) => setBairro(e.target.value.toUpperCase())}
          placeholder="Preenchido via CEP ou manual"
        />
      </Field>
    </div>
  );
}
