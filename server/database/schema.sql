CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  gateway_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_subscription_per_workspace
  ON subscriptions(workspace_id)
  WHERE status IN ('trialing', 'active', 'past_due');

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  order_nsu TEXT NOT NULL UNIQUE,
  transaction_nsu TEXT UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'failed', 'refunded', 'canceled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  document_type TEXT NOT NULL CHECK (document_type IN ('PRIVACY_POLICY', 'TERMS_OF_USE')),
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_document_idx
  ON legal_acceptances(user_id, document_type, document_version);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'DELETION_PROCESSING', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspace_members (
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'TECHNICIAN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (code, name, description, price_cents, billing_interval, limits, features)
VALUES
  ('free', 'Free', 'Para começar com organização', 0, 'month', '{"clients": 20, "orders": 20, "transactions": 20, "devices": 3, "teamMembers": 1}', '["basic_dashboard"]'),
  ('pro', 'Pro', 'Para empresas que querem crescer com mais controle', 4999, 'month', '{"clients": 100, "orders": 100, "transactions": 100, "devices": 10, "teamMembers": 3}', '["basic_dashboard", "advanced_dashboard", "reports"]'),
  ('business', 'Business', 'Para operações com equipe e escala', 9999, 'month', '{"clients": -1, "orders": -1, "transactions": -1, "devices": -1, "teamMembers": 10}', '["basic_dashboard", "advanced_dashboard", "reports", "team_management", "api_access", "audit_log"]')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents, billing_interval = EXCLUDED.billing_interval, limits = EXCLUDED.limits, features = EXCLUDED.features, active = TRUE, updated_at = now();
