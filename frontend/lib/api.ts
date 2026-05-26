// Cliente HTTP fino para a API Go. Em produção, frontend e backend são servidos
// pelo mesmo binário (mesmo origin) — o cookie httpOnly viaja automaticamente.
// Em dev, o cookie é setado pelo Go via Set-Cookie e o navegador o reenvia.

import type { CotacaoStatus } from "./cotacaoStatus";

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role: "cotador" | "admin";
}

// Resposta enxuta de /api/admin/users (sem dados sensíveis).
export interface UserApi {
  id: number;
  name: string;
  email: string;
  role: "cotador" | "admin";
}

export interface NotificacaoApi {
  id: number;
  user_id: number;
  type:
    | "cotacao_pendente"
    | "cotacao_aprovada"
    | "cotacao_reprovada"
    | string;
  title: string;
  message: string;
  cotacao_id?: number;
  read_at?: string | null;
  created_at: string;
}

export interface EmpresaApi {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  telefone?: string;
  email?: string;
  situacao?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export type EmpresaInput = Omit<
  EmpresaApi,
  "id" | "created_by" | "created_at" | "updated_at"
>;

export interface CotacaoApi {
  id: number;
  status: CotacaoStatus;
  created_at: string;
  updated_at: string;
  cep_ori?: string;
  uf_ori: string;
  cidade_ori: string;
  bairro_ori?: string;
  cep_des?: string;
  uf_des: string;
  cidade_des: string;
  bairro_des?: string;
  distancia_km: number;
  produto?: string;
  embalagem?: string;
  unitizacao?: string;
  peso_kg?: number;
  volumes?: number;
  cubagem_m3?: number;
  valor_nf?: number;
  veiculo: string;
  categoria: string;
  antt_min: number;
  valor_sugerido: number;
  admin_comment?: string;
  approved_by?: number;
  approved_at?: string;
  created_by?: number;
  empresa_ori_id?: number;
  empresa_des_id?: number;
  empresa_ori?: EmpresaApi;
  empresa_des?: EmpresaApi;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function apiBase(): string {
  // Em dev, NEXT_PUBLIC_API_URL aponta para http://localhost:8080.
  // Em produção (servido pelo Go) deixe vazio para usar o mesmo origin.
  return process.env.NEXT_PUBLIC_API_URL || "";
}

async function handle<T>(r: Response): Promise<T> {
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new ApiError(r.status, msg, data);
  }
  return data as T;
}

interface ReqOpts {
  body?: unknown;
}

async function req<T>(
  method: string,
  path: string,
  opts: ReqOpts = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  const r = await fetch(apiBase() + path, {
    method,
    headers,
    credentials: "include",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  return handle<T>(r);
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: ApiUser }>("POST", "/api/auth/login", {
      body: { email, password },
    }),

  // Resolve a sessão a partir do cookie httpOnly. Usado pra revalidar
  // quando o frontend (especialmente PWA) abre sem localStorage.
  me: () => req<ApiUser>("GET", "/api/auth/me"),

  updateProfile: (body: {
    name: string;
    email: string;
    current_password?: string;
    new_password?: string;
  }) => req<ApiUser>("PATCH", "/api/auth/profile", { body }),

  logout: () => req<{ ok: boolean }>("POST", "/api/auth/logout"),

  listMine: () => req<CotacaoApi[]>("GET", "/api/cotacoes"),

  create: (body: Partial<CotacaoApi> & { created_for_user_id?: number }) =>
    req<CotacaoApi>("POST", "/api/cotacoes", { body }),

  // Admin: lista enxuta de usuários (pra escolher pra quem criar a cotação).
  listUsers: () => req<UserApi[]>("GET", "/api/admin/users"),

  // Admin: baixa as cotações filtradas como planilha .xlsx.
  // Retorna o blob + nome de arquivo sugerido pelo backend.
  exportCotacoes: async (
    filters: { status?: string; uf_ori?: string; uf_des?: string; from?: string; to?: string },
  ): Promise<{ blob: Blob; filename: string }> => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) qs.set(k, v);
    }
    const url =
      apiBase() +
      `/api/admin/cotacoes/export${qs.toString() ? "?" + qs.toString() : ""}`;
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!r.ok) {
      let msg = `Falha ao exportar (HTTP ${r.status})`;
      try {
        const j = (await r.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* corpo não-JSON — mantém msg padrão */
      }
      throw new ApiError(r.status, msg, null);
    }
    const disp = r.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(disp);
    const filename = m?.[1] || "cotacoes.xlsx";
    const blob = await r.blob();
    return { blob, filename };
  },

  listAll: (status?: string) =>
    req<CotacaoApi[]>(
      "GET",
      `/api/admin/cotacoes${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),

  // Admin responde a cotação com o valor corrigido (Em Análise → Respondida).
  responder: (id: number, comment: string, valorSugerido: number) =>
    req<CotacaoApi>("PATCH", `/api/admin/cotacoes/${id}/responder`, {
      body: { comment, valor_sugerido: valorSugerido },
    }),

  // Admin recusa a cotação (Em Análise → Recusada).
  recusarCotacao: (id: number, comment: string) =>
    req<CotacaoApi>("PATCH", `/api/admin/cotacoes/${id}/recusar`, {
      body: { comment },
    }),

  // Cotador avança a cotação pelas etapas seguintes do fluxo.
  transicao: (id: number, acao: string) =>
    req<CotacaoApi>("PATCH", `/api/cotacoes/${id}/transicao`, {
      body: { acao },
    }),

  // ── Empresas ──────────────────────────────────────────────────────────
  listEmpresas: (q?: string) =>
    req<EmpresaApi[]>(
      "GET",
      `/api/empresas${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),

  getEmpresa: (id: number) => req<EmpresaApi>("GET", `/api/empresas/${id}`),

  createEmpresa: (body: EmpresaInput) =>
    req<EmpresaApi>("POST", "/api/empresas", { body }),

  updateEmpresa: (id: number, body: EmpresaInput) =>
    req<EmpresaApi>("PUT", `/api/empresas/${id}`, { body }),

  deleteEmpresa: (id: number) =>
    req<{ ok: boolean }>("DELETE", `/api/empresas/${id}`),

  // ── Notificações ───────────────────────────────────────────────────────
  listNotifications: () =>
    req<NotificacaoApi[]>("GET", "/api/notificacoes"),

  unreadCount: () =>
    req<{ unread: number }>("GET", "/api/notificacoes/unread-count"),

  markNotificationRead: (id: number) =>
    req<{ ok: boolean }>("PATCH", `/api/notificacoes/${id}/read`),

  markAllNotificationsRead: () =>
    req<{ ok: boolean }>("POST", "/api/notificacoes/read-all"),

  // ── Web Push ──────────────────────────────────────────────────────────
  vapidPublicKey: () =>
    req<{ public_key: string }>("GET", "/api/push/vapid-public-key"),

  subscribePush: (body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    user_agent?: string;
  }) => req<{ ok: boolean }>("POST", "/api/push/subscribe", { body }),

  unsubscribePush: (endpoint: string) =>
    req<{ ok: boolean }>("POST", "/api/push/unsubscribe", {
      body: { endpoint },
    }),
};
