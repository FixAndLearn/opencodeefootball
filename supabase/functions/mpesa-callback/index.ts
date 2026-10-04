// M-Pesa Daraja callback — verifies and persists payment results.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    const body = await req.json();
    const stk = body?.Body?.stkCallback;
    if (!stk) return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });

    const checkoutRequestId = stk.CheckoutRequestID as string | undefined;
    const resultCode = stk.ResultCode as number;
    const resultDesc = stk.ResultDesc as string;

    const { data: payment } = await supabase
      .from("payment_requests")
      .select("id, order_id, amount")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (!payment) {
      return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
    }

    if (resultCode === 0) {
      const items = (stk.CallbackMetadata?.Item ?? []) as { Name: string; Value?: unknown }[];
      const get = (name: string) => items.find((i) => i.Name === name)?.Value;
      const receipt = String(get("MpesaReceiptNumber") ?? "");
      const amount = Number(get("Amount") ?? 0);
      const phone = String(get("PhoneNumber") ?? "");
      const txId = String(get("TransactionID") ?? "");

      await supabase.from("payment_verifications").insert({
        payment_request_id: payment.id,
        transaction_id: txId,
        receipt_number: receipt || null,
        phone,
        amount,
        currency: "KES",
        verified: Boolean(receipt) && amount === payment.amount,
        raw_payload: stk,
      });

      await supabase
        .from("payment_requests")
        .update({ status: "success", raw_callback: stk })
        .eq("id", payment.id);

      await supabase.from("payment_receipts").insert({
        order_id: payment.order_id,
        receipt_number: receipt,
        amount,
        currency: "KES",
        phone,
        transaction_time: new Date().toISOString(),
      });

      await supabase
        .from("orders")
        .update({ status: "payment_received" })
        .eq("id", payment.order_id);

      await supabase
        .from("escrow_accounts")
        .update({ status: "payment_received" })
        .eq("order_id", payment.order_id);

      await supabase.from("escrow_transactions").insert({
        escrow_id: (await supabase.from("escrow_accounts").select("id").eq("order_id", payment.order_id).single()).data?.id,
        kind: "payment_in",
        amount,
        currency: "KES",
        reference: receipt,
      });
    } else {
      await supabase
        .from("payment_requests")
        .update({ status: "failed", raw_callback: stk })
        .eq("id", payment.id);
    }

    await supabase.from("payment_logs").insert({
      payment_request_id: payment.id,
      event: resultCode === 0 ? "payment_success" : "payment_failed",
      payload: { resultCode, resultDesc },
    });

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
