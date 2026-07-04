import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { PLANS } from "../../_lib/billing";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({}));
  const config = PLANS[plan];
  if (!config || plan === "trial") {
    return NextResponse.json({ error: "Invalid paid plan" }, { status: 400 });
  }
  const stripeKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk_test_|sk_live_)[A-Za-z0-9_]+$/.test(stripeKey)) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }

  const frontend = String(process.env.NEXT_PUBLIC_FRONTEND_URL || new URL(req.url).origin).replace(/\/$/, "");
  const params = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[0]": "card",
    success_url: `${frontend}/pricing/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontend}/pricing/?checkout=canceled`,
    customer_email: user.email,
    "metadata[user_id]": user.id,
    "metadata[plan]": plan,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(config.amountCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `Smart Manage ${plan}`,
  });
  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 401 ? "Billing is not configured" : data?.error?.message || "Checkout creation failed" },
        { status: response.status === 401 ? 503 : 502 }
      );
    }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("[BILLING/CHECKOUT]", error);
    return NextResponse.json({ error: "Billing is temporarily unavailable" }, { status: 503 });
  }
}
