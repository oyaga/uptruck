"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lightbulb, MapPin, Package } from "lucide-react";
import { calcMin, fmt, suggestVeiculoByPeso, VEI } from "@/lib/antt";
import { api, ApiError } from "@/lib/api";
import CepBlock from "@/components/cotacao/CepBlock";
import AnttCalculator from "@/components/cotacao/AnttCalculator";
import EmbalagemSelect from "@/components/cotacao/EmbalagemSelect";
import UnitizacaoSelect from "@/components/cotacao/UnitizacaoSelect";
import Field from "@/components/cotacao/Field";
import CurrencyInput, { centsToNumber } from "@/components/cotacao/CurrencyInput";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900";

type PesoUnit = "kg" | "t";

const empty = {
  cepOri: "",
  ufOri: "SP",
  cidOri: "",
  bairroOri: "",
  cepDes: "",
  ufDes: "",
  cidDes: "",
  bairroDes: "",
  produto: "",
  embalagem: "Palete",
  unitizacao: "paletizada",
  peso: "",          // valor digitado, na unidade selecionada (pesoUnit)
  pesoUnit: "kg" as PesoUnit,
  vol: "",
  cubagem: "",
  valorNF: "",       // centavos (string de dígitos) — formatado pelo CurrencyInput
  veiculo: "Toco",
  categoria: "Geral",
  distancia: "",
  valorSugerido: "",
};

export default function NovaCotacaoForm() {
  const router = useRouter();
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const set = <K extends keyof typeof empty>(k: K, v: typeof empty[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const min = useMemo(
    () => calcMin(f.veiculo, f.distancia, f.categoria),
    [f.veiculo, f.distancia, f.categoria],
  );
  // valorSugerido é guardado como centavos (string de dígitos), igual ao valor da NF
  const sug = centsToNumber(f.valorSugerido);
  const below = sug > 0 && sug < min; // só pra exibir o aviso — não bloqueia mais

  // Conversões para o campo peso (estado guarda na unidade selecionada)
  const pesoEmKg = useMemo(() => {
    const n = Number(String(f.peso).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return f.pesoUnit === "t" ? n * 1000 : n;
  }, [f.peso, f.pesoUnit]);

  // Sugestão do menor veículo capaz de carregar essa carga
  const sugVeiculo = useMemo(
    () => suggestVeiculoByPeso(pesoEmKg),
    [pesoEmKg],
  );
  const showSug = !!sugVeiculo && sugVeiculo !== f.veiculo;
  const excedeCap = pesoEmKg > 0 && pesoEmKg / 1000 > VEI[f.veiculo as keyof typeof VEI].cap;

  // Troca de unidade preserva o peso real (kg) — converte o valor digitado
  const togglePesoUnit = (next: PesoUnit) => {
    if (next === f.pesoUnit) return;
    const n = Number(String(f.peso).replace(",", "."));
    let novo = "";
    if (Number.isFinite(n) && n > 0) {
      novo = next === "t" ? String(n / 1000) : String(n * 1000);
      // remove decimais espúrios (1500 / 1000 = 1.5 mantém, mas 2000/1000 = 2 ok)
      novo = String(Number(novo));
    }
    setF((p) => ({ ...p, peso: novo, pesoUnit: next }));
  };

  async function submit() {
    if (!f.cidOri.trim() || !f.ufDes || !f.cidDes.trim()) {
      setErr("Preencha origem e destino completos.");
      return;
    }
    if (!f.distancia || Number(f.distancia) <= 0) {
      setErr("Informe a distância rodoviária em km.");
      return;
    }
    if (sug <= 0) {
      setErr("Informe o valor sugerido do frete.");
      return;
    }
    setErr("");
    setSubmitting(true);
    try {
      await api.create({
        cep_ori: f.cepOri,
        uf_ori: f.ufOri,
        cidade_ori: f.cidOri,
        bairro_ori: f.bairroOri,
        cep_des: f.cepDes,
        uf_des: f.ufDes,
        cidade_des: f.cidDes,
        bairro_des: f.bairroDes,
        distancia_km: Number(f.distancia),
        produto: f.produto,
        embalagem: f.embalagem,
        unitizacao: f.unitizacao,
        peso_kg: pesoEmKg, // sempre persistido em kg, independente da unit do form
        volumes: f.vol ? Number(f.vol) : 0,
        cubagem_m3: f.cubagem ? Number(f.cubagem) : 0,
        valor_nf: centsToNumber(f.valorNF),
        veiculo: f.veiculo,
        categoria: f.categoria,
        valor_sugerido: sug,
      });
      router.replace("/cotacao?created=1");
      router.refresh();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao enviar cotação.";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rota */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <MapPin size={12} /> Rota
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 border-b border-gray-100 pb-2 text-[13px] font-bold text-gray-700">
              Origem
            </p>
            <CepBlock
              prefix="ori"
              cep={f.cepOri}
              setCep={(v) => set("cepOri", v)}
              uf={f.ufOri}
              setUf={(v) => set("ufOri", v)}
              cidade={f.cidOri}
              setCidade={(v) => set("cidOri", v)}
              bairro={f.bairroOri}
              setBairro={(v) => set("bairroOri", v)}
            />
          </div>
          <div>
            <p className="mb-3 border-b border-gray-100 pb-2 text-[13px] font-bold text-gray-700">
              Destino
            </p>
            <CepBlock
              prefix="des"
              cep={f.cepDes}
              setCep={(v) => set("cepDes", v)}
              uf={f.ufDes}
              setUf={(v) => set("ufDes", v)}
              cidade={f.cidDes}
              setCidade={(v) => set("cidDes", v)}
              bairro={f.bairroDes}
              setBairro={(v) => set("bairroDes", v)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Carga */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <Package size={12} /> Carga
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Produto / Descrição">
                <input
                  className={inputCls}
                  value={f.produto}
                  onChange={(e) => set("produto", e.target.value.toUpperCase())}
                  placeholder="Ex: BQ STD MONTADO"
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="mb-1.5 flex items-end justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Peso ({f.pesoUnit === "t" ? "t" : "kg"})
                    </label>
                    <div className="inline-flex overflow-hidden rounded-md border border-gray-200 text-[10px] font-bold uppercase">
                      {(["kg", "t"] as PesoUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => togglePesoUnit(u)}
                          className={`px-2 py-0.5 transition ${
                            f.pesoUnit === u
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-100"
                          }`}
                          aria-pressed={f.pesoUnit === u}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step={f.pesoUnit === "t" ? "0.001" : "1"}
                    value={f.peso}
                    onChange={(e) => set("peso", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <Field label="Volumes">
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    value={f.vol}
                    onChange={(e) => set("vol", e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Cubagem m³">
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.1"
                    value={f.cubagem}
                    onChange={(e) => set("cubagem", e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* Sugestão de veículo / aviso de excesso */}
              {pesoEmKg > 0 && (showSug || excedeCap) && (
                <div
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${
                    excedeCap
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  {excedeCap ? (
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  ) : (
                    <Lightbulb size={13} className="mt-0.5 shrink-0" />
                  )}
                  <span>
                    {excedeCap ? (
                      <>
                        <strong>{(pesoEmKg / 1000).toLocaleString("pt-BR")} t</strong>
                        {" "}excede a capacidade do {VEI[f.veiculo as keyof typeof VEI].l}.
                        {sugVeiculo && (
                          <>
                            {" "}Use{" "}
                            <button
                              type="button"
                              onClick={() => set("veiculo", sugVeiculo)}
                              className="underline font-semibold hover:text-red-900"
                            >
                              {VEI[sugVeiculo].l}
                            </button>
                            .
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Para <strong>{(pesoEmKg / 1000).toLocaleString("pt-BR")} t</strong>
                        {" "}o veículo sugerido é{" "}
                        <button
                          type="button"
                          onClick={() => sugVeiculo && set("veiculo", sugVeiculo)}
                          className="underline font-semibold hover:text-blue-900"
                        >
                          {sugVeiculo && VEI[sugVeiculo].l}
                        </button>
                        .
                      </>
                    )}
                  </span>
                </div>
              )}

              <Field label="Valor da Nota Fiscal (R$)">
                <CurrencyInput
                  value={f.valorNF}
                  onChange={(cents) => set("valorNF", cents)}
                  placeholder="R$ 0,00"
                />
              </Field>
            </div>
          </section>

          {/* Embalagem */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <Package size={12} /> Embalagem &amp; Unitização
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Tipo de Embalagem">
                <EmbalagemSelect
                  value={f.embalagem}
                  onChange={(v) => set("embalagem", v)}
                />
              </Field>
              <Field label="Unitização da Carga">
                <UnitizacaoSelect
                  value={f.unitizacao}
                  onChange={(v) => set("unitizacao", v)}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Cálculo + Valor sugerido */}
        <div className="flex flex-col gap-4">
          <AnttCalculator
            veiculo={f.veiculo}
            setVeiculo={(v) => set("veiculo", v)}
            categoria={f.categoria}
            setCategoria={(v) => set("categoria", v)}
            distancia={f.distancia}
            setDistancia={(v) => set("distancia", v)}
          />

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <Field
              label="Valor Sugerido do Frete (R$)"
              hint={
                below
                  ? `Abaixo do piso ANTT de ${fmt(min)} — envio liberado, mas sinalizado ao admin`
                  : min > 0 && sug >= min
                    ? `+${(((sug - min) / min) * 100).toFixed(1)}% acima do piso — dentro do limite legal`
                    : undefined
              }
              hintColor={below ? "#dc2626" : "#16a34a"}
            >
              <CurrencyInput
                value={f.valorSugerido}
                onChange={(cents) => set("valorSugerido", cents)}
                placeholder="R$ 0,00"
                className={below ? "border-red-300 bg-red-50" : ""}
              />
            </Field>

            {err && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {err}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-3.5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar para Aprovação"}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-gray-400">
              Portaria SEAE 71/2022 — Tabela ANTT 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
