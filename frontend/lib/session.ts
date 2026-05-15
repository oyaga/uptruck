// Sessão client-side.
//
// O cookie httpOnly setado pelo backend é o **source of truth** — o
// localStorage é só um cache pra render instantâneo (evitar flash de loading).
//
// Fluxo de boot:
//  1. Lê localStorage (instantâneo)
//  2. Sempre valida com GET /api/auth/me em background
//     • sucesso → atualiza localStorage e estado com o user do servidor
//     • falha   → limpa localStorage, marca como deslogado
//
// Isso resolve o caso do PWA: ao instalar e abrir, o cookie httpOnly viaja
// junto com o request (mesmo origin), o /me responde 200 com o user, e o
// AuthGuard mantém o usuário logado mesmo sem localStorage.

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "cotador" | "admin";
}

const KEY = "freteantt:session";

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function writeSession(u: SessionUser) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(u));
  } catch {
    /* armazenamento cheio/bloqueado — ok */
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1) instantâneo do cache
    const cached = readSession();
    if (cached) {
      setUser(cached);
      setReady(true);
    }

    // 2) sempre revalida com o servidor (fonte da verdade)
    api
      .me()
      .then((u) => {
        if (cancelled) return;
        const next: SessionUser = {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        };
        writeSession(next);
        setUser(next);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, ready, setUser };
}
