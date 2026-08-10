import { NextResponse } from "next/server";
import { getAuthenticatedUser, pool } from "../../_lib/server";
import { getBillingStatus } from "../../_lib/billing";

export const runtime = "nodejs";

async function stripeGet(path, key) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe request failed");
  return data;
}

export async function GET(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const billing = await getBillingStatus(user.id);
    const subscription = await pool.query(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [user.id]
    );
    const customerId = subscription.rows[0]?.stripe_customer_id;
    const stripeKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
    if (!customerId || !/^(sk_test_|sk_live_)/.test(stripeKey)) {
      return NextResponse.json({ billing, paymentMethod: null, invoices: [], contact: { email: user.email || "" } });
    }

    const customer = await stripeGet(`customers/${encodeURIComponent(customerId)}?expand[]=invoice_settings.default_payment_method`, stripeKey);
    const invoices = await stripeGet(`invoices?customer=${encodeURIComponent(customerId)}&limit=12`, stripeKey);
    const method = customer?.invoice_settings?.default_payment_method;
    return NextResponse.json({
      billing,
      paymentMethod: method?.card ? {
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
      } : null,
      contact: {
        name: customer?.name || "",
        email: customer?.email || user.email || "",
        phone: customer?.phone || "",
      },
      invoices: (invoices?.data || []).map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
        currency: invoice.currency || "eur",
        created: invoice.created,
        hostedUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
      })),
    });
  } catch (error) {
    console.error("[BILLING/OVERVIEW]", error);
    return NextResponse.json({ error: "Unable to load billing details" }, { status: 502 });
  }
}
