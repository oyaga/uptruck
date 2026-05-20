// Utilidades de CNPJ: formatação, validação dos dígitos verificadores e
// consulta à BrasilAPI para auto-preenchimento do cadastro de empresas.
// Segue o mesmo padrão de fetchCep (ViaCEP) já usado no projeto.

import type { EmpresaApi } from "@/lib/api";

export const onlyDigitsCnpj = (v: string): string => (v || "").replace(/\D/g, "");

// fmtCnpj formata progressivamente para 00.000.000/0000-00.
export function fmtCnpj(v: string): string {
  const c = onlyDigitsCnpj(v).slice(0, 14);
  if (c.length > 12)
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
  if (c.length > 8)
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
  if (c.length > 5) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
  if (c.length > 2) return `${c.slice(0, 2)}.${c.slice(2)}`;
  return c;
}

export function fmtTelefone(v: string): string {
  const d = onlyDigitsCnpj(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
}

// isValidCnpj confere os 2 dígitos verificadores (módulo 11).
export function isValidCnpj(raw: string): boolean {
  const c = onlyDigitsCnpj(raw);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false; // rejeita sequências repetidas
  const calc = (len: number): number => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export interface CnpjLookup {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string; // descrição da situação cadastral (ex: ATIVA, BAIXADA)
  ativa: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
}

// fetchCnpj consulta a BrasilAPI (gratuita, dados públicos da Receita
// Federal) para auto-preencher e validar o cadastro da empresa.
export async function fetchCnpj(raw: string): Promise<CnpjLookup> {
  const c = onlyDigitsCnpj(raw);
  if (c.length !== 14) throw new Error("CNPJ incompleto.");
  if (!isValidCnpj(c)) throw new Error("CNPJ inválido (dígito verificador).");

  let r: Response;
  try {
    r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`);
  } catch {
    throw new Error("Sem conexão para consultar o CNPJ.");
  }
  if (r.status === 404)
    throw new Error("CNPJ não encontrado na Receita Federal.");
  if (!r.ok) throw new Error("Falha ao consultar o CNPJ. Tente novamente.");

  const d = await r.json();
  const situacao = String(d.descricao_situacao_cadastral || "").toUpperCase();
  return {
    cnpj: c,
    razaoSocial: d.razao_social || "",
    nomeFantasia: d.nome_fantasia || "",
    situacao,
    ativa: situacao === "ATIVA",
    cep: d.cep ? String(d.cep).replace(/\D/g, "") : "",
    logradouro: d.logradouro || "",
    numero: d.numero || "",
    complemento: d.complemento || "",
    bairro: d.bairro || "",
    cidade: d.municipio || "",
    uf: d.uf || "",
    telefone: fmtTelefone(String(d.ddd_telefone_1 || "")),
    email: d.email || "",
  };
}

// Rótulo curto para exibir uma empresa em selects e cards.
export function empresaLabel(e: Pick<EmpresaApi, "razao_social" | "nome_fantasia">): string {
  return e.nome_fantasia?.trim() || e.razao_social;
}
