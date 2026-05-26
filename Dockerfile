# syntax=docker/dockerfile:1.7

###############################################################################
# Stage 1 — frontend build (Next.js static export via Bun)
###############################################################################
FROM oven/bun:1.3 AS frontend
WORKDIR /app/frontend

# Copia manifesto e instala dependências (cache eficiente)
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copia o restante e gera o build estático (out/ -> backend/manager/dist/)
COPY frontend/ ./
COPY backend/manager/dist /app/backend/manager/dist
RUN bun run build


###############################################################################
# Stage 2 — backend build (Go com embed da SPA)
###############################################################################
FROM golang:1.24-alpine AS backend
WORKDIR /src

RUN apk add --no-cache git

# Resolve módulos com cache
COPY backend/go.mod backend/go.sum* ./backend/
WORKDIR /src/backend
RUN go mod download

# Copia o código e o frontend já buildado pelo stage anterior
COPY backend/ ./
COPY --from=frontend /app/backend/manager/dist ./manager/dist

# Binário estático (sem CGO) — pgx é Go puro, GORM idem
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -trimpath -ldflags="-s -w" -o /out/freteantt ./cmd/server


###############################################################################
# Stage 3 — runtime mínimo
###############################################################################
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=backend /out/freteantt /app/freteantt

ENV PORT=8080 \
    APP_ENV=production
EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/app/freteantt"]
