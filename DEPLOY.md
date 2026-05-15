# Deploy — Docker Hub + rastreio.uppertruck.com

A imagem é **22.9 MB** (distroless + binário Go estático com a SPA Next.js
embutida via `embed.FS`). Sem servidor Node em produção.

## 1. Build local

```bash
docker build -t freteantt:local .
```

Roda os 3 stages: Bun (Next build estático) → Go (compila + embed) →
distroless (final). Saída em `freteantt:local`.

Smoke test com docker-compose (sobe Postgres junto):

```bash
docker compose up -d
curl http://localhost:8080/health           # {"ok":true}
curl -i -c /tmp/c.txt -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"cotador@freteantt.com","password":"cotador123"}'
docker compose down
```

## 2. Publicar no Docker Hub

Substitua `<DOCKERHUB_USER>` pelo seu usuário/organização.

```bash
docker login

# tag local → tag remota com versão e :latest
docker tag freteantt:local <DOCKERHUB_USER>/freteantt:0.1.0
docker tag freteantt:local <DOCKERHUB_USER>/freteantt:latest

docker push <DOCKERHUB_USER>/freteantt:0.1.0
docker push <DOCKERHUB_USER>/freteantt:latest
```

Build multi-arch (amd64 + arm64) opcional, útil para servidores ARM:

```bash
docker buildx create --name freteantt-builder --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <DOCKERHUB_USER>/freteantt:0.1.0 \
  -t <DOCKERHUB_USER>/freteantt:latest \
  --push .
```

## 3. Deploy em rastreio.uppertruck.com

No host de produção:

```bash
# .env do compose
cat > .env <<'EOF'
IMAGE_TAG=<DOCKERHUB_USER>/freteantt:latest
JWT_SECRET=$(openssl rand -hex 32)
EOF

# baixa a imagem e sobe
docker compose pull app
docker compose up -d
```

Como a URL é **http://rastreio.uppertruck.com** (sem TLS), o `docker-compose.yml`
mantém `COOKIE_SECURE=false`. **Quando colocar HTTPS na frente, mude para
`true`** (e idealmente force HSTS no proxy).

### Reverse proxy (exemplo nginx)

`/etc/nginx/sites-available/rastreio`:

```nginx
server {
  listen 80;
  server_name rastreio.uppertruck.com;

  location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_buffering    off;
  }
}
```

Para subir TLS depois (recomendado): `certbot --nginx -d rastreio.uppertruck.com`,
e depois ajustar `COOKIE_SECURE=true` no `.env` + `docker compose up -d`.

## 4. Variáveis de ambiente

| Variável         | Padrão              | Descrição                                                            |
|------------------|---------------------|----------------------------------------------------------------------|
| `DATABASE_URL`   | postgres local      | DSN do Postgres (formato GORM)                                       |
| `JWT_SECRET`     | dev-secret-change-me | **Obrigatório alterar** em produção                                  |
| `PORT`           | 8080                | Porta de escuta                                                      |
| `APP_ENV`        | -                   | Reservado para flags futuras                                         |
| `COOKIE_SECURE`  | false               | `true` quando estiver atrás de HTTPS                                 |
| `CORS_ORIGINS`   | -                   | Só usado em modo dev separado (`bun run dev` em outra porta)         |

## 5. Atualização contínua

```bash
# em produção
docker compose pull app
docker compose up -d --no-deps app
```

## 6. Logs e troubleshooting

```bash
docker compose logs -f app           # logs do servidor Go (chi.Logger)
docker compose logs -f db            # logs do Postgres
docker compose exec db psql -U postgres -d freteantt
```
