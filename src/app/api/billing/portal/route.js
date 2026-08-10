import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await pool.query(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [user.id]
    );
    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) return NextResponse.json({ error: "No paid subscription is connected to this account" }, { status: 400 });

    const stripeKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
    if (!/^(sk_test_|sk_live_)/.test(stripeKey)) {
      return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
    }
    const origin = String(process.env.NEXT_PUBLIC_FRONTEND_URL || new URL(req.url).origin).replace(/\/$/, "");
    const params = new URLSearchParams({ customer: customerId, return_url: `${origin}/settings/?tab=billing` });
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Unable to open billing portal");
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("[BILLING/PORTAL]", error);
    return NextResponse.json({ error: error.message || "Billing portal is temporarily unavailable" }, { status: 502 });
  }
}
