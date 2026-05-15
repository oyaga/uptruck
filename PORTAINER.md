# Deploy via Portainer

Stack pronta: [portainer-stack.yml](portainer-stack.yml). Sobe **app + Postgres**
em containers, num único stack autocontido.

## Pré-requisito — publicar a imagem no Docker Hub

Portainer puxa de registry, então **a imagem precisa estar publicada antes**.
Da sua máquina local (onde já rodamos `docker build -t freteantt:local .`):

```bash
docker login

# substitua <USUARIO> pelo seu Docker Hub
docker tag freteantt:local <USUARIO>/freteantt:0.1.0
docker tag freteantt:local <USUARIO>/freteantt:latest
docker push <USUARIO>/freteantt:0.1.0
docker push <USUARIO>/freteantt:latest
```

## Passo a passo no Portainer

1. **Stacks** → **+ Add stack**
2. Nome: `freteantt`
3. **Build method**: **Web editor**
4. Cole o conteúdo de [portainer-stack.yml](portainer-stack.yml)
5. Role até **Environment variables** → **+ Add an environment variable** e
   preencha:

   | Name              | Value                                    |
   |-------------------|------------------------------------------|
   | `IMAGE_TAG`       | `<USUARIO>/freteantt:latest`             |
   | `JWT_SECRET`      | string longa aleatória (≥ 32 chars)      |
   | `POSTGRES_PASSWORD` | senha forte do Postgres                |
   | `APP_PORT`        | `8080` (ou outra porta livre no host)    |
   | `COOKIE_SECURE`   | `false` (mude para `true` quando colocar TLS) |

   Para gerar o `JWT_SECRET`:
   ```bash
   openssl rand -hex 32
   ```

6. **Deploy the stack**

Depois de subir, abra `http://<IP-DO-HOST>:8080`. Login seed:

| Email                  | Senha       | Role    |
|------------------------|-------------|---------|
| admin@freteantt.com    | admin123    | admin   |
| cotador@freteantt.com  | cotador123  | cotador |

> **⚠️ Troque essas senhas** assim que o sistema entrar em produção.

## Apontar `rastreio.uppertruck.com` para a stack

### Se você já tem nginx/Caddy no host

Crie um vhost que faça proxy da porta `APP_PORT` (default `8080`):

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
  }
}
```

Aponte o DNS A de `rastreio.uppertruck.com` para o IP do host. Depois,
quando colocar TLS (`certbot --nginx -d rastreio.uppertruck.com`), volte ao
Portainer e mude **COOKIE_SECURE=true** → **Update the stack**.

### Se você usa Traefik

No `portainer-stack.yml`, comente o bloco `ports:` do serviço `app` (deixa
sem porta exposta) e descomente as `labels:` de Traefik que já estão lá.
Configure `IMAGE_TAG`, etc., e dê deploy.

## Atualização

Quando publicar uma nova versão da imagem:

```bash
docker tag freteantt:local <USUARIO>/freteantt:0.2.0
docker push <USUARIO>/freteantt:0.2.0
```

No Portainer:
- **Stacks** → `freteantt` → **Editor**
- Mude `IMAGE_TAG` → `<USUARIO>/freteantt:0.2.0` (ou só dispare **Pull and
  redeploy** se estiver usando `:latest`)
- **Update the stack**

## Persistência e backup

Os dados do Postgres ficam no volume `freteantt-pgdata`. Backup manual:

```bash
docker exec freteantt-db pg_dump -U freteantt freteantt > backup-$(date +%F).sql
```

Restore:

```bash
cat backup-2026-05-06.sql | docker exec -i freteantt-db psql -U freteantt -d freteantt
```
