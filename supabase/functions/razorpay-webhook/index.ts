import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Razorpay webhook receiver. Configure this URL + a webhook secret in the
// Razorpay Dashboard (Settings -> Webhooks), subscribed to "payment.captured".
//
// This is intentionally separate from RAZORPAY_KEY_SECRET: the webhook
// secret is a different value you set when creating the webhook, and it is
// what proves a request actually came from Razorpay's servers (not the
// browser, which is why this function does NOT check Authorization --
// Razorpay calls it directly, with no user session attached).
//
// Idempotent by design: payment_orders.status is checked before writing, so
// Razorpay's documented at-least-once webhook delivery (retries on timeout)
// can never double-activate or double-charge entitlements.
// ---------------------------------------------------------------------------

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

const PLAN_MONTHLY_PRICE_USD: Record<string, number> = { growth: 349, scale: 1490 };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      // Fail closed: never process an unverifiable webhook.
      return new Response("Webhook not configured", { status: 503 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("X-Razorpay-Signature") || "";
    const expected = await hmacHex(webhookSecret, rawBody);

    if (!timingSafeEqual(expected, signature)) {
      return new Response("Invalid signature", { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
      // Acknowledge anything we don't act on yet so Razorpay stops retrying it.
      return new Response("ignored", { status: 200 });
    }

    const orderId: string | undefined = payload.payload?.payment?.entity?.order_id;
    const paymentId: string | undefined = payload.payload?.payment?.entity?.id;
    if (!orderId) {
      return new Response("missing order id", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order || order.status === "verified") {
      // Unknown order, or already activated by verify-razorpay-payment -- no-op.
      return new Response("ok", { status: 200 });
    }

    await supabase
      .from("payment_orders")
      .update({ status: "verified", provider_payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    await supabase.from("subscriptions").upsert(
      [
        {
          user_id: order.user_id,
          plan_key: order.plan_key,
          status: "active",
          monthly_price: PLAN_MONTHLY_PRICE_USD[order.plan_key] || 0,
          current_period_end: periodEnd.toISOString(),
          provider: "razorpay",
          notes: `Activated via Razorpay webhook for order ${orderId}.`,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id" },
    );

    return new Response("ok", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("razorpay-webhook error:", message);
    // 200, not 500: an unexpected error here shouldn't put Razorpay into an
    // infinite retry loop. It's logged above for you to investigate.
    return new Response("logged", { status: 200 });
  }
});
