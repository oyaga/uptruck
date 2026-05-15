# Calculadora ANTT — sistema de aprovação

Web app de cotação de frete com cálculo do **piso mínimo ANTT 2025** e workflow
de aprovação por administradores.

- **Backend**: Go + Chi + GORM + PostgreSQL + JWT
- **Frontend**: Next.js 15 (static export) + TypeScript + Tailwind v3
- **Toolchain JS**: Bun
- **Deploy**: binário Go único, com o build do frontend embutido em
  `backend/manager/dist` via `embed.FS`. Sem servidor Node em produção.

## Estrutura

```
/
├── CalculadoraANTT.jsx          # protótipo de referência
├── backend/
│   ├── cmd/server/main.go       # serve API (/api/*) + frontend (/*)
│   ├── manager/
│   │   ├── manager.go           # //go:embed all:dist + handler SPA
│   │   └── dist/                # gerado por `bun run build` em frontend/
│   ├── internal/
│   │   ├── antt/antt.go         # tabela ANTT + calcMin
│   │   ├── auth/jwt.go
│   │   ├── handlers/{auth,cotacoes}.go
│   │   ├── middleware/auth.go
│   │   └── models/{user,cotacao}.go
│   ├── migrations/001_create_tables.sql
│   └── api.http                 # testes manuais (REST Client)
└── frontend/
    ├── app/{login,cotacao,admin}/
    ├── components/{cotacao,layout,auth}/
    ├── lib/{antt,api,session}.ts
    ├── scripts/copy-to-manager.ts   # post-build: copia out/ → backend/manager/dist
    └── next.config.ts               # output: 'export'
```

## Como rodar (binário único)

```bash
# 1) build do frontend (gera backend/manager/dist)
cd frontend
bun install
bun run build

# 2) compila o Go com o frontend embutido
cd ../backend
cp .env.example .env
go run ./cmd/server
```

Acesse [http://localhost:8080](http://localhost:8080). Tudo (UI + API)
roda no mesmo origin — sem CORS, sem proxy, sem `next dev`.

### Logins seed

| Email                  | Senha       | Role    |
|------------------------|-------------|---------|
| admin@freteantt.com    | admin123    | admin   |
| cotador@freteantt.com  | cotador123  | cotador |

## Modo dev (com hot-reload do frontend)

Se preferir desenvolver com HMR, rode os dois processos separados:

```bash
# terminal 1
cd backend
CORS_ORIGINS=http://localhost:3000 go run ./cmd/server

# terminal 2
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8080 bun run dev
```

A flag `CORS_ORIGINS` libera o origin do `next dev` no Go.
`NEXT_PUBLIC_API_URL` faz o front bater na API correta.

## Endpoints

| Método | Rota                                  | Auth    |
|--------|---------------------------------------|---------|
| POST   | `/api/auth/login`                     | público |
| POST   | `/api/auth/logout`                    | público |
| POST   | `/api/cotacoes`                       | cotador |
| GET    | `/api/cotacoes`                       | cotador |
| GET    | `/api/admin/cotacoes`                 | admin   |
| PATCH  | `/api/admin/cotacoes/:id/aprovar`     | admin   |
| PATCH  | `/api/admin/cotacoes/:id/reprovar`    | admin   |

Validações no backend:

- `valor_sugerido >= antt_min` (recalculado server-side a partir de
  `veiculo + distancia_km + categoria`) — caso contrário retorna **422**.
- `distancia_km > 0`.
- `uf_ori`, `cidade_ori`, `uf_des`, `cidade_des` obrigatórios.
- `veiculo` e `categoria` precisam estar no enum da Tabela ANTT.

## Sessão

- O Go emite o JWT e o salva em cookie **httpOnly** no Set-Cookie do login
  (mesmo origin → o navegador reenvia automaticamente em todas as requests).
- O frontend persiste apenas `{role, name, email}` em `localStorage`, usado só
  para gating de UI. Toda autorização real é validada no Go.
- `<AuthGuard role="admin">` redireciona para `/cotacao` ou `/login` sem flicker.

## Smoke test rápido

```bash
# saúde
curl http://localhost:8080/health

# login (salva cookie em /tmp/cookies)
curl -i -c /tmp/cookies -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"cotador@freteantt.com","password":"cotador123"}'

# lista cotações com cookie
curl -b /tmp/cookies http://localhost:8080/api/cotacoes
```

Ou abra `backend/api.http` no VS Code com a extensão **REST Client**.
