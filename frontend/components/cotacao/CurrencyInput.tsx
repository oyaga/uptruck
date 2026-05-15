"use client";

// Input que formata moeda em tempo real (BRL).
// Estado externo é o valor em centavos como string ("123456" = R$ 1.234,56).
// Razão: evita problemas de ponto flutuante e conversão de vírgula/ponto.
// Helpers: centsToNumber/numberToCents para conversões nas bordas.

import { forwardRef } from "react";

export const centsToNumber = (cents: string | number): number => {
  const n = typeof cents === "string" ? Number(cents.replace(/\D/g, "")) : cents;
  return Number.isFinite(n) ? n / 100 : 0;
};

export const numberToCents = (n: number | string): string => {
  const v = typeof n === "string" ? Number(String(n).replace(",", ".")) : n;
  if (!Number.isFinite(v)) return "";
  return Math.round(v * 100).toString();
};

const fmtBRL = (cents: string): string => {
  const digits = (cents || "").replace(/\D/g, "");
  if (!digits) return "";
  const v = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
};

interface Props {
  value: string; // centavos como string
  onChange: (cents: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, Props>(function CurrencyInput(
  { value, onChange, placeholder = "R$ 0,00", className = "", disabled, id },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      value={fmtBRL(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      onKeyDown={(e) => {
        // Backspace remove o último dígito numérico (intuitivo)
        if (e.key === "Backspace") {
          e.preventDefault();
          onChange((value || "").slice(0, -1));
        }
      }}
      className={
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 " +
        className
      }
    />
  );
});

export default CurrencyInput;
