ALTER TABLE payments ALTER COLUMN subscription_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check') THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
END $$;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'past_due', 'cancel_at_period_end', 'canceled', 'expired'));

ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0);
CREATE INDEX IF NOT EXISTS subscriptions_workspace_idx ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS payments_workspace_idx ON payments(workspace_id);
