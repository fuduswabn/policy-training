import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function hmacSha512Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";
    const secret = (globalThis as any).process?.env?.PAYSTACK_SECRET_KEY;

    if (!secret) {
      return new Response(JSON.stringify({ error: "Missing Paystack secret" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const expected = await hmacSha512Hex(secret, rawBody);
    if (expected !== signature.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        id?: number | string;
        amount?: number | string;
        currency?: string;
        paid_at?: string;
        reference?: string;
        metadata?: {
          companyId?: string;
          userId?: string;
          plan?: "starter" | "pro" | "enterprise";
          planRef?: "starter" | "pro" | "enterprise";
          reference?: string;
        };
      };
    };

    const data = payload.data ?? {};
    const metadata = data.metadata ?? {};
    const plan = metadata.plan ?? metadata.planRef;
    const reference = data.reference ?? metadata.reference;
    const companyId = metadata.companyId;

    if (!payload.event || !reference || !companyId || !plan) {
      return new Response(JSON.stringify({ error: "Missing payment metadata" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await ctx.runMutation(internal.paystack.processWebhookEvent, {
      eventType: payload.event,
      reference,
      transactionId: data.id != null ? String(data.id) : undefined,
      amount: typeof data.amount === "number" ? data.amount : Number(data.amount ?? 0),
      currency: data.currency ?? "ZAR",
      status: payload.event === "charge.success" ? "completed" : payload.event.includes("fail") ? "failed" : "pending",
      companyId: companyId as any,
      userId: typeof metadata.userId === "string" ? (metadata.userId as any) : undefined,
      packagePlan: plan,
      rawPayload: rawBody,
      paidAt: typeof data.paid_at === "string" ? Date.parse(data.paid_at) : undefined,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

http.route({
  path: "/paystack/return",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const reference = url.searchParams.get("reference") ?? "";
    const status = url.searchParams.get("status") ?? "success";
    const deepLink = `policytraining://paystack/success${reference || status ? `?${new URLSearchParams({ ...(reference ? { reference } : {}), status }).toString()}` : ""}`;

    return new Response(
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${deepLink}" />
    <title>Payment successful</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.5; }
      a { display: inline-block; margin-top: 16px; padding: 12px 16px; background: #111827; color: white; text-decoration: none; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>Payment successful</h1>
    <p>You can return to the app using the button below.</p>
    <a href="${deepLink}">Open app</a>
  </body>
</html>`,
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }),
});

export default http;
