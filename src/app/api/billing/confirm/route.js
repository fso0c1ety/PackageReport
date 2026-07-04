import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";
import { activateBillingPlan } from "../../_lib/billing";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stripeKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!/^(sk_test_|sk_live_)[A-Za-z0-9_]+$/.test(stripeKey)) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }
  const { sessionId } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "Missing checkout session" }, { status: 400 });

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const session = await response.json();
    if (!response.ok || session.metadata?.user_id !== user.id || session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment is not confirmed" }, { status: 400 });
    }
    let currentPeriodEnd = null;
    if (session.subscription) {
      const subscriptionResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      if (subscriptionResponse.ok) {
        const subscription = await subscriptionResponse.json();
        if (subscription.current_period_end) {
          currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
      }
    }
    return NextResponse.json(await activateBillingPlan(user.id, session.metadata.plan, {
      customerId: session.customer,
      subscriptionId: session.subscription,
      currentPeriodEnd,
    }));
  } catch (error) {
    console.error("[BILLING/CONFIRM]", error);
    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 503 });
  }
}
