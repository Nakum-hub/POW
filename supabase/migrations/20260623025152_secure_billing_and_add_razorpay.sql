-- Secure billing writes and add Razorpay order/payment tracking.
--
-- PROBLEM THIS FIXES: the previous migration gave `authenticated` users an
-- unrestricted UPDATE policy on `subscriptions`. Any signed-in user holding
-- the public anon key (shipped to every browser by design) could call
-- `supabase.from('subscriptions').update({ plan_key: 'enterprise', status: 'active' })`
-- directly and grant themselves a paid plan with zero payment. RLS was
-- enforcing *ownership*, not *who is allowed to grant a paid plan*.
--
-- FIX: only a free/no-cost downgrade to 'starter' is allowed directly from
-- the client. Every paid plan_key may only be written by the service role,
-- which is held exclusively by the create-razorpay-order and
-- verify-razorpay-payment / razorpay-webhook Edge Functions after a real
-- payment is verified server-side.

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

CREATE POLICY "Users can self-serve only the free starter plan"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND plan_key = 'starter' AND monthly_price = 0);

CREATE POLICY "Users can downgrade to starter but never self-upgrade"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND plan_key = 'starter' AND monthly_price = 0);

-- Provider linkage on the subscription row itself.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text;

-- One row per checkout attempt. This is what create-razorpay-order writes
-- (status 'created'), and what verify-razorpay-payment / the webhook flip to
-- 'verified' or 'failed' after checking the Razorpay signature server-side.
-- It is also the idempotency guard: a replayed webhook for an order that is
-- already 'verified' is a no-op, not a double-grant.
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_key text NOT NULL CHECK (plan_key IN ('growth', 'scale')),
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'verified', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_order_id ON payment_orders(provider_order_id);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Users may look up their own checkout attempts (e.g. to show "payment
-- processing" state). They may never insert/update/delete one directly --
-- only the service role (Edge Functions) writes to this table.
CREATE POLICY "Users can view own payment orders"
  ON payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
