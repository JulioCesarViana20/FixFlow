INSERT INTO plans (code, name, description, price_cents, billing_interval, limits, features, active)
VALUES
  ('free', 'Free', 'Para começar com organização', 0, 'month', '{"clients": 20, "orders": 20, "transactions": 20, "devices": 3, "teamMembers": 1}', '["basic_dashboard"]', TRUE),
  ('pro', 'Pro', 'Para empresas que querem crescer com mais controle', 4999, 'month', '{"clients": 100, "orders": 100, "transactions": 100, "devices": 10, "teamMembers": 3}', '["basic_dashboard", "advanced_dashboard", "reports"]', TRUE),
  ('business', 'Business', 'Para operações com equipe e escala', 9999, 'month', '{"clients": -1, "orders": -1, "transactions": -1, "devices": -1, "teamMembers": 10}', '["basic_dashboard", "advanced_dashboard", "reports", "team_management", "api_access", "audit_log"]', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  active = EXCLUDED.active,
  updated_at = now();
