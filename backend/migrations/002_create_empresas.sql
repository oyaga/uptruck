-- Migration 002: cadastro de empresas + vínculo com cotações.
--
-- O GORM AutoMigrate aplica este schema automaticamente no boot da API
-- (ver cmd/server/main.go). Este arquivo documenta o resultado esperado.

CREATE TABLE IF NOT EXISTS empresas (
  id            SERIAL PRIMARY KEY,
  cnpj          VARCHAR(14)  UNIQUE NOT NULL,
  razao_social  VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  cep           VARCHAR(9),
  logradouro    VARCHAR(200),
  numero        VARCHAR(20),
  complemento   VARCHAR(100),
  bairro        VARCHAR(100),
  cidade        VARCHAR(100) NOT NULL,
  uf            VARCHAR(2)   NOT NULL,
  telefone      VARCHAR(30),
  email         VARCHAR(160),
  situacao      VARCHAR(40),
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vínculo opcional da cotação com a empresa de coleta (origem) e entrega
-- (destino). O endereço continua copiado na própria cotação — o vínculo só
-- registra de qual cadastro os dados vieram.
ALTER TABLE cotacoes
  ADD COLUMN IF NOT EXISTS empresa_ori_id INTEGER REFERENCES empresas(id),
  ADD COLUMN IF NOT EXISTS empresa_des_id INTEGER REFERENCES empresas(id);
