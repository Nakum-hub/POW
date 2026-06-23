import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Creates a Razorpay Order for a plan upgrade.
//
// Security model: the client sends only a plan_key. The price is looked up
// here, server-side, from PLAN_PRICING_INR_PAISE -- never trusted from the
// request body. The resulting order is recorded in `payment_orders` with
// status 'created'. Nothing in this function ever writes to `subscriptions`;
// that only happens after verify-razorpay-payment or the razorpay-webhook
// confirms a real payment against this exact order_id.
//
// v1 scope: one-time monthly Orders, not Razorpay Subscriptions. Renewal is
// a manual "pay again" action next month. Recurring auto-billing via
// Razorpay's Subscriptions API (separate plan objects, mandate setup) is a
// deliberate v2 -- it adds real complexity (mandates, dunning, proration)
// that isn't worth taking on before the v1 flow has a single real payment.
// ---------------------------------------------------------------------------

// INR list price. These are a starting point, not a researched conversion --
// confirm against your actual GTM pricing before going live. Only growth and
// scale are self-serve; starter is free (no order needed) and enterprise is
// "contact sales" (custom, not a fixed price to charge through checkout).
const PLAN_PRICING_INR_PAISE: Record<string, number> = {
  growth: 2_900_00, // ~$349 equivalent, rounded for an Indian price point
  scale: 12_400_00, // ~$1,490 equivalent, rounded for an Indian price point
};

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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
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

    const { plan_key } = await req.json();
    const amount = PLAN_PRICING_INR_PAISE[plan_key];

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "plan_key must be 'growth' or 'scale'. Starter is free; enterprise is custom-priced (contact sales)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const receipt = `${user.id}-${plan_key}-${Date.now()}`.slice(0, 40);

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { user_id: user.id, plan_key },
      }),
    });

    if (!razorpayRes.ok) {
      const detail = await razorpayRes.text();
      throw new Error(`Razorpay order creation failed: ${detail}`);
    }

    const order = await razorpayRes.json();

    const { error: insertError } = await supabase.from("payment_orders").insert([
      {
        user_id: user.id,
        plan_key,
        provider: "razorpay",
        provider_order_id: order.id,
        amount,
        currency: "INR",
        status: "created",
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount,
        currency: "INR",
        key_id: keyId, // public key, safe to expose to the browser checkout widget
        plan_key,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
