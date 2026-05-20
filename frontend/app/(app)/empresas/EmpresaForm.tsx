"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { api, ApiError, type EmpresaInput } from "@/lib/api";
import { fetchCep, fmtCep, UFS } from "@/lib/antt";
import { fetchCnpj, fmtCnpj, isValidCnpj, onlyDigitsCnpj } from "@/lib/empresa";
import Field from "@/components/cotacao/Field";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

const empty = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  telefone: "",
  email: "",
  situacao: "",
};

export default function EmpresaForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = Number(sp.get("id")) || 0;

  const [f, setF] = useState(empty);
  const [loading, setLoading] = useState(editId > 0);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cnpjMsg, setCnpjMsg] = useState("");
  const [err, setErr] = useState("");

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  // Em modo edição, carrega o cadastro existente.
  useEffect(() => {
    if (editId <= 0) return;
    let cancelled = false;
    api
      .getEmpresa(editId)
      .then((e) => {
        if (cancelled) return;
        setF({
          cnpj: fmtCnpj(e.cnpj),
          razaoSocial: e.razao_social,
          nomeFantasia: e.nome_fantasia || "",
          cep: e.cep ? fmtCep(e.cep) : "",
          logradouro: e.logradouro || "",
          numero: e.numero || "",
          complemento: e.complemento || "",
          bairro: e.bairro || "",
          cidade: e.cidade,
          uf: e.uf,
          telefone: e.telefone || "",
          email: e.email || "",
          situacao: e.situacao || "",
        });
      })
      .catch((e: Error) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const cnpjValido = useMemo(() => isValidCnpj(f.cnpj), [f.cnpj]);
  const situacaoInativa =
    !!f.situacao && f.situacao.toUpperCase() !== "ATIVA";

  async function consultarCnpj() {
    setCnpjMsg("");
    setErr("");
    if (!isValidCnpj(f.cnpj)) {
      setCnpjMsg("Informe um CNPJ válido para consultar.");
      return;
    }
    setCnpjLoading(true);
    try {
      const d = await fetchCnpj(f.cnpj);
      setF((p) => ({
        ...p,
        cnpj: fmtCnpj(d.cnpj),
        razaoSocial: d.razaoSocial || p.razaoSocial,
        nomeFantasia: d.nomeFantasia || p.nomeFantasia,
        cep: d.cep ? fmtCep(d.cep) : p.cep,
        logradouro: d.logradouro || p.logradouro,
        numero: d.numero || p.numero,
        complemento: d.complemento || p.complemento,
        bairro: (d.bairro || p.bairro).toUpperCase(),
        cidade: (d.cidade || p.cidade).toUpperCase(),
        uf: d.uf || p.uf,
        telefone: d.telefone || p.telefone,
        email: d.email || p.email,
        situacao: d.situacao || p.situacao,
      }));
      setCnpjMsg(
        d.ativa
          ? "Empresa ATIVA na Receita Federal — dados preenchidos."
          : `Situação cadastral: ${d.situacao || "desconhecida"}.`,
      );
    } catch (e) {
      setCnpjMsg(e instanceof Error ? e.message : "Erro ao consultar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
  }

  async function consultarCep(raw: string) {
    const n = raw.replace(/\D/g, "");
    if (n.length < 8) return;
    setCepLoading(true);
    setErr("");
    try {
      const d = await fetchCep(raw);
      setF((p) => ({
        ...p,
        logradouro: d.logradouro || p.logradouro,
        bairro: (d.bairro || p.bairro).toUpperCase(),
        cidade: (d.localidade || p.cidade).toUpperCase(),
        uf: d.uf || p.uf,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function submit() {
    setErr("");
    if (!cnpjValido) {
      setErr("Informe um CNPJ válido.");
      return;
    }
    if (!f.razaoSocial.trim()) {
      setErr("Informe a razão social.");
      return;
    }
    if (!f.cidade.trim() || f.uf.length !== 2) {
      setErr("Informe cidade e UF.");
      return;
    }
    const body: EmpresaInput = {
      cnpj: onlyDigitsCnpj(f.cnpj),
      razao_social: f.razaoSocial.trim(),
      nome_fantasia: f.nomeFantasia.trim(),
      cep: f.cep.trim(),
      logradouro: f.logradouro.trim(),
      numero: f.numero.trim(),
      complemento: f.complemento.trim(),
      bairro: f.bairro.trim(),
      cidade: f.cidade.trim().toUpperCase(),
      uf: f.uf.toUpperCase(),
      telefone: f.telefone.trim(),
      email: f.email.trim(),
      situacao: f.situacao.trim(),
    };
    setSaving(true);
    try {
      if (editId > 0) await api.updateEmpresa(editId, body);
      else await api.createEmpresa(body);
      router.replace("/empresas");
      router.refresh();
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao salvar empresa.",
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
        <Building2 size={18} className="text-gray-700" />
        <h1 className="text-lg font-extrabold text-gray-900">
          {editId > 0 ? "Editar Empresa" : "Nova Empresa"}
        </h1>
      </div>

      {/* Identificação */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Building2 size={12} /> Identificação
        </div>
        <div className="flex flex-col gap-3">
          <Field
            label="CNPJ"
            hint={
              f.cnpj && !cnpjValido
                ? "CNPJ incompleto ou dígito verificador inválido"
                : undefined
            }
            hintColor="#dc2626"
          >
            <div className="flex gap-1.5">
              <input
                className={`${inputCls} flex-1`}
                value={f.cnpj}
                maxLength={18}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                onChange={(e) => set("cnpj", fmtCnpj(e.target.value))}
              />
              <button
                type="button"
                onClick={consultarCnpj}
                disabled={cnpjLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                {cnpjLoading ? (
                  <Loader2 size={14} className="animate-spin-slow" />
                ) : (
                  <Search size={14} />
                )}
                Consultar
              </button>
            </div>
          </Field>

          {cnpjMsg && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${
                situacaoInativa
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {situacaoInativa ? (
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              )}
              <span>{cnpjMsg}</span>
            </div>
          )}

          <Field label="Razão Social">
            <input
              className={inputCls}
              value={f.razaoSocial}
              onChange={(e) => set("razaoSocial", e.target.value.toUpperCase())}
              placeholder="Razão social registrada"
            />
          </Field>
          <Field label="Nome Fantasia">
            <input
              className={inputCls}
              value={f.nomeFantasia}
              onChange={(e) => set("nomeFantasia", e.target.value.toUpperCase())}
              placeholder="Nome fantasia (opcional)"
            />
          </Field>
        </div>
      </section>

      {/* Endereço */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <MapPin size={12} /> Endereço
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field label="CEP">
              <div className="flex gap-1.5">
                <input
                  className={`${inputCls} flex-1`}
                  value={f.cep}
                  maxLength={9}
                  placeholder="00000-000"
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = fmtCep(e.target.value);
                    set("cep", v);
                    if (v.replace(/\D/g, "").length === 8) consultarCep(v);
                  }}
                />
                <button
                  type="button"
                  onClick={() => consultarCep(f.cep)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  {cepLoading ? (
                    <Loader2 size={14} className="animate-spin-slow" />
                  ) : (
                    <Search size={14} />
                  )}
                </button>
              </div>
            </Field>
            <div />
          </div>

          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Field label="Logradouro">
              <input
                className={inputCls}
                value={f.logradouro}
                onChange={(e) => set("logradouro", e.target.value)}
                placeholder="Rua / Avenida"
              />
            </Field>
            <Field label="Número">
              <input
                className={inputCls}
                value={f.numero}
                onChange={(e) => set("numero", e.target.value)}
                placeholder="Nº"
              />
            </Field>
          </div>

          <Field label="Complemento">
            <input
              className={inputCls}
              value={f.complemento}
              onChange={(e) => set("complemento", e.target.value)}
              placeholder="Sala, galpão, bloco (opcional)"
            />
          </Field>

          <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
            <Field label="Bairro">
              <input
                className={inputCls}
                value={f.bairro}
                onChange={(e) => set("bairro", e.target.value.toUpperCase())}
                placeholder="Bairro / Distrito"
              />
            </Field>
            <Field label="Cidade">
              <input
                className={inputCls}
                value={f.cidade}
                onChange={(e) => set("cidade", e.target.value.toUpperCase())}
                placeholder="Cidade"
              />
            </Field>
            <Field label="UF">
              <select
                className={inputCls}
                value={f.uf}
                onChange={(e) => set("uf", e.target.value)}
              >
                <option value="">--</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Contato
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone">
            <input
              className={inputCls}
              value={f.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field label="E-mail">
            <input
              className={inputCls}
              type="email"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contato@empresa.com.br"
            />
          </Field>
        </div>
      </section>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {err}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.replace("/empresas")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Salvando..."
            : editId > 0
              ? "Salvar Alterações"
              : "Cadastrar Empresa"}
        </button>
      </div>
    </div>
  );
}
