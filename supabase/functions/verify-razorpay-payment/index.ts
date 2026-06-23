import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Verifies a Razorpay checkout success callback and activates the plan.
//
// This is the immediate-UX path: the browser calls this right after
// Razorpay's checkout widget reports success. razorpay-webhook is the
// durable backstop for the case where the browser closes before this call
// completes -- both paths verify the signature independently and both are
// idempotent against `payment_orders.status`, so whichever fires first wins
// and the second is a no-op.
//
// Never trust `razorpay_payment_id` / `razorpay_signature` at face value:
// anyone can POST arbitrary values here. The HMAC check below, computed
// with a secret only this server holds, is what actually proves the
// payment happened.
// ---------------------------------------------------------------------------

function getCorsHeaders(req: Request) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    Deno.env.get("SITE_URL") || "",
    Deno.env.get("ALLOWED_ORIGIN") || "",
  ].filter(Boolean);

  const origin = req.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) {
      return new Response(JSON.stringify({ error: "Billing is not configured yet." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing Razorpay callback fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("provider_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found for this user." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already settled by the webhook (or a previous call) -- idempotent no-op.
    if (order.status === "verified") {
      return new Response(JSON.stringify({ ok: true, plan_key: order.plan_key, already_verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSignature = await hmacHex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (!timingSafeEqual(expectedSignature, razorpay_signature)) {
      await supabase.from("payment_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
      return new Response(JSON.stringify({ error: "Signature verification failed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("payment_orders")
      .update({ status: "verified", provider_payment_id: razorpay_payment_id, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error: subError } = await supabase.from("subscriptions").upsert(
      [
        {
          user_id: user.id,
          plan_key: order.plan_key,
          status: "active",
          monthly_price: PLAN_MONTHLY_PRICE_USD[order.plan_key] || 0,
          current_period_end: periodEnd.toISOString(),
          provider: "razorpay",
          notes: `Activated via Razorpay order ${razorpay_order_id}.`,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id" },
    );

    if (subError) throw subError;

    return new Response(JSON.stringify({ ok: true, plan_key: order.plan_key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
