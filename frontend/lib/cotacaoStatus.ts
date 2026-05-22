// Fluxo de status de uma cotação e as ações disponíveis em cada etapa.
//
//  Em Análise → Respondida → Enviada ao Cliente → Aprovada pelo Cliente
//             → Em Aprovação Comercial → Fechada
//  (Recusada é terminal e pode vir do admin ou do cliente/comercial.)

export const COTACAO_STATUS = [
  "Em Análise",
  "Respondida",
  "Enviada ao Cliente",
  "Aprovada pelo Cliente",
  "Em Aprovação Comercial",
  "Fechada",
  "Recusada",
] as const;

export type CotacaoStatus = (typeof COTACAO_STATUS)[number];

type BadgeVariant = "pending" | "info" | "approved" | "rejected";

interface StatusMeta {
  variant: BadgeVariant; // classe do .ut-badge
  accent: string; // cor da barra lateral do card
}

const META: Record<string, StatusMeta> = {
  "Em Análise": { variant: "pending", accent: "var(--ut-yellow)" },
  "Respondida": { variant: "info", accent: "var(--ut-info-fg)" },
  "Enviada ao Cliente": { variant: "info", accent: "var(--ut-info-fg)" },
  "Aprovada pelo Cliente": { variant: "approved", accent: "var(--ut-success-fg)" },
  "Em Aprovação Comercial": { variant: "pending", accent: "var(--ut-yellow)" },
  "Fechada": { variant: "approved", accent: "var(--ut-success-fg)" },
  "Recusada": { variant: "rejected", accent: "var(--ut-danger-fg)" },
};

export function statusMeta(status: string): StatusMeta {
  return META[status] || { variant: "info", accent: "var(--ut-info-fg)" };
}

// Ação que o cotador pode tomar para avançar a cotação.
export interface CotadorAction {
  acao: string;
  label: string;
  tone: "primary" | "approve" | "reject";
  confirm?: string; // se definido, pede confirmação antes de executar
}

// Ações do cotador disponíveis conforme o status atual da cotação.
export const COTADOR_ACTIONS: Record<string, CotadorAction[]> = {
  "Respondida": [
    { acao: "enviar_cliente", label: "Enviar valor ao cliente", tone: "primary" },
  ],
  "Enviada ao Cliente": [
    { acao: "cliente_aprovou", label: "Cliente aprovou o valor", tone: "approve" },
    {
      acao: "cliente_recusou",
      label: "Cliente recusou",
      tone: "reject",
      confirm: "Confirmar que o cliente recusou? A cotação será encerrada.",
    },
  ],
  "Aprovada pelo Cliente": [
    {
      acao: "enviar_comercial",
      label: "Enviar contrato p/ aprovação comercial",
      tone: "primary",
    },
  ],
  "Em Aprovação Comercial": [
    { acao: "fechar", label: "Comercial aprovou — fechar cotação", tone: "approve" },
    {
      acao: "recusar_comercial",
      label: "Comercial recusou",
      tone: "reject",
      confirm: "Confirmar que o comercial recusou? A cotação será encerrada.",
    },
  ],
};

// Texto auxiliar do que está pendente em cada status (mostrado no card).
export const STATUS_HINT: Record<string, string> = {
  "Em Análise": "Aguardando o administrador analisar e responder o valor.",
  "Respondida": "O admin respondeu — envie o valor ao cliente.",
  "Enviada ao Cliente": "Aguardando a resposta do cliente.",
  "Aprovada pelo Cliente": "Cliente aceitou — envie o contrato para aprovação comercial.",
  "Em Aprovação Comercial": "Contrato em aprovação comercial.",
  "Fechada": "Cotação concluída.",
  "Recusada": "Cotação recusada.",
};
