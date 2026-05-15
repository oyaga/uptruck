-- Migration 001: cria tabelas de usuários e cotações ANTT

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'cotador'
                CHECK (role IN ('cotador','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotacoes (
  id            SERIAL PRIMARY KEY,
  status        VARCHAR(20) NOT NULL DEFAULT 'Aguardando'
                CHECK (status IN ('Aguardando','Aprovada','Reprovada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Rota
  cep_ori       VARCHAR(10),
  uf_ori        VARCHAR(2)   NOT NULL,
  cidade_ori    VARCHAR(100) NOT NULL,
  bairro_ori    VARCHAR(100),
  cep_des       VARCHAR(10),
  uf_des        VARCHAR(2)   NOT NULL,
  cidade_des    VARCHAR(100) NOT NULL,
  bairro_des    VARCHAR(100),
  distancia_km  NUMERIC(10,2) NOT NULL,

  -- Carga
  produto       VARCHAR(200),
  embalagem     VARCHAR(50),
  unitizacao    VARCHAR(50),
  peso_kg       NUMERIC(10,3),
  volumes       INTEGER,
  cubagem_m3    NUMERIC(10,3),
  valor_nf      NUMERIC(14,2),

  -- ANTT
  veiculo       VARCHAR(20)   NOT NULL,
  categoria     VARCHAR(30)   NOT NULL,
  antt_min      NUMERIC(14,2) NOT NULL,
  valor_sugerido NUMERIC(14,2) NOT NULL,

  -- Aprovação
  admin_comment TEXT,
  approved_by   INTEGER REFERENCES users(id),
  approved_at   TIMESTAMPTZ,

  -- Cotador
  created_by    INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_status     ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_created_by ON cotacoes(created_by);

-- Os usuários padrão (admin@freteantt.com / cotador@freteantt.com)
-- são criados automaticamente pela API no primeiro start, com bcrypt.
-- Senhas iniciais: admin123 e cotador123 (alterar em produção).
