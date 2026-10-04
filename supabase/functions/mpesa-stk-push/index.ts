// M-Pesa STK Push initiation (Daraja API).
// Body: { order_id: string, phone: string }
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
const passkey = Deno.env.get("MPESA_PASSKEY")!;
const baseUrl = Deno.env.get("MPESA_BASE_URL") ?? "https://sandbox.safaricom.co.ke";
const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
      },
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Daraja auth failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const {
      data: { user },
      error: authError,
    } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { order_id, phone } = await req.json();
    if (!order_id || !phone) {
      return new Response(JSON.stringify({ error: "order_id and phone required" }), { status: 400 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, amount_total, status")
      .eq("id", order_id)
      .single();

    if (!order || order.buyer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }
    if (order.status !== "pending_payment") {
      return new Response(JSON.stringify({ error: "Order is not awaiting payment" }), { status: 409 });
    }

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: order.amount_total,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: order.id,
        TransactionDesc: "eFootballMarket order payment",
      }),
    });
    const json = await res.json();

    const { data: payment } = await supabase
      .from("payment_requests")
      .insert({
        order_id: order.id,
        buyer_id: user.id,
        amount: order.amount_total,
        currency: "KES",
        phone,
        merchant_reference: json.CheckoutRequestID ?? `pay-${crypto.randomUUID()}`,
        checkout_request_id: json.CheckoutRequestID,
        status: res.ok ? "stk_sent" : "failed",
        raw_callback: json,
      })
      .select("id")
      .single();

    await supabase.from("payment_logs").insert({
      payment_request_id: payment?.id,
      event: "stk_push_initiated",
      payload: json,
    });

    return new Response(JSON.stringify({ success: res.ok, payment, daraja: json }), {
      status: res.ok ? 200 : 502,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
