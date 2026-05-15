// Lógica ANTT compartilhada — espelha CalculadoraANTT.jsx (VEI, CAT, calcMin, fmt, fmtCep)

export type VeiculoKey =
  | "VUC"
  | "3/4"
  | "Toco"
  | "Truck"
  | "Carreta"
  | "Carreta LS"
  | "Bi-trem";

export type CategoriaKey =
  | "Geral"
  | "Frigorificada"
  | "Granel Sólido"
  | "Granel Líquido"
  | "Neogranel"
  | "Perigosa";

export interface VeiculoInfo {
  l: string;   // label
  r: number;   // R$/km
  m: number;   // mínimo de viagem
  cap: number; // capacidade máxima de carga (toneladas)
}

export const VEI: Record<VeiculoKey, VeiculoInfo> = {
  "VUC":          { l: "VUC (até 3,5t)",         r: 1.4258, m: 158.19, cap: 3.5  },
  "3/4":          { l: "3/4 (até 6t)",            r: 1.4912, m: 165.45, cap: 6    },
  "Toco":         { l: "Toco (até 14t)",          r: 2.1274, m: 236.38, cap: 14   },
  "Truck":        { l: "Truck (até 23t)",         r: 2.4851, m: 275.89, cap: 23   },
  "Carreta":      { l: "Carreta (até 33t)",       r: 3.0567, m: 339.41, cap: 33   },
  "Carreta LS":   { l: "Carreta LS (até 41,5t)",  r: 3.4068, m: 378.46, cap: 41.5 },
  "Bi-trem":      { l: "Bi-trem (até 45t)",       r: 3.8534, m: 427.97, cap: 45   },
};

// Devolve a chave do menor veículo capaz de carregar `pesoKg`.
// Retorna null se vazio/inválido, ou a maior categoria se exceder todas.
export function suggestVeiculoByPeso(pesoKg: number | string): VeiculoKey | null {
  const kg = Number(pesoKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const t = kg / 1000;
  const ordered = (Object.entries(VEI) as [VeiculoKey, VeiculoInfo][])
    .sort((a, b) => a[1].cap - b[1].cap);
  for (const [k, v] of ordered) {
    if (v.cap >= t) return k;
  }
  return ordered[ordered.length - 1][0];
}

export const CAT: Record<CategoriaKey, number> = {
  "Geral": 1.0,
  "Frigorificada": 1.15,
  "Granel Sólido": 0.95,
  "Granel Líquido": 1.0,
  "Neogranel": 1.0,
  "Perigosa": 1.3,
};

export const EMBALAGENS = [
  "Palete",
  "Granel",
  "Tambor",
  "Milheiro",
  "Caixa",
  "Saco / Big Bag",
  "IBC / Contentor",
  "Fardo",
  "Bobina",
  "Peça Solta",
  "Container",
  "Outro",
] as const;

export const UNITIZACOES = [
  { value: "paletizada",    label: "Paletizada",     desc: "Carga sobre paletes, empilhável" },
  { value: "granel",        label: "A Granel",        desc: "Sem embalagem unitizada" },
  { value: "lote",          label: "Por Lote",        desc: "Agrupada em lotes identificados" },
  { value: "tambor",        label: "Em Tambor / IBC", desc: "Líquidos ou sólidos em tambores" },
  { value: "milheiro",      label: "Milheiro",        desc: "Contagem unitária em mil peças" },
  { value: "nao_unitizada", label: "Não Unitizada",   desc: "Carga solta, sem padrão" },
] as const;

export type UnitizacaoValue = (typeof UNITIZACOES)[number]["value"];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const fmt = (v: number | string | undefined | null): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v) || 0,
  );

export const fmtCep = (v: string): string =>
  v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export function calcMin(
  veiculo: string,
  distancia: number | string,
  categoria: string,
): number {
  const v = VEI[veiculo as VeiculoKey];
  const d = Number(distancia);
  if (!v || !d || d <= 0) return 0;
  const fator = CAT[categoria as CategoriaKey] ?? 1;
  return Math.round(Math.max(v.m, v.r * d) * fator * 100) / 100;
}

export interface ViaCepResult {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export async function fetchCep(cepRaw: string): Promise<ViaCepResult> {
  const n = cepRaw.replace(/\D/g, "");
  if (n.length < 8) throw new Error("CEP incompleto");
  const r = await fetch(`https://viacep.com.br/ws/${n}/json/`);
  const d: ViaCepResult = await r.json();
  if (d.erro) throw new Error("CEP não encontrado.");
  return d;
}

// Quando o piso aplicado é o mínimo de viagem (i.e. taxa*km ficou abaixo)
export function usedFloor(veiculo: string, distancia: number | string): boolean {
  const v = VEI[veiculo as VeiculoKey];
  const d = Number(distancia);
  if (!v || !d) return false;
  return v.r * d < v.m;
}
