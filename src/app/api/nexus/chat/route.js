import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";

export const runtime = "nodejs";

function buildFallbackCompletion(payload) {
  return {
    id: "nexus-fallback",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "nexus-fallback",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify(payload),
        },
        finish_reason: "stop",
      },
    ],
  };
}

function buildGracefulPayload(input = "") {
  if (/invoice/i.test(input)) {
    return {
      response: "Nexus Brain is temporarily unavailable, so the app will prepare a draft from your selected tasks instead.",
      invoiceDraft: {
        assumptions: ["AI invoice enrichment is temporarily unavailable; local draft fallback is being used."],
        items: [],
      },
    };
  }

  return {
    thought: "Nexus Brain fallback response",
    action: "none",
    params: {},
    response:
      "Nexus Brain is temporarily unavailable. You can still continue using the board and try again shortly.",
  };
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input = "";

  try {
    const body = await req.json();
    input = body?.input || "";
    const systemPrompt = body?.systemPrompt || "";
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("[NEXUS][POST] Missing OPENAI_API_KEY, using graceful fallback.");
      return NextResponse.json(buildFallbackCompletion(buildGracefulPayload(input)));
    }

    const candidateModels = Array.from(
      new Set([process.env.OPENAI_MODEL, "gpt-4o-mini", "gpt-4o"].filter(Boolean))
    );

    let lastErrorMessage = "OpenAI Request Failed";

    for (const model of candidateModels) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }

      try {
        const errorData = await response.json();
        lastErrorMessage = errorData?.error?.message || lastErrorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          lastErrorMessage = errorText.slice(0, 500);
        }
      }

      console.warn(`[NEXUS][POST] Model ${model} failed: ${lastErrorMessage}`);
    }

    console.warn(`[NEXUS][POST] Upstream AI unavailable, using fallback: ${lastErrorMessage}`);
    return NextResponse.json(buildFallbackCompletion(buildGracefulPayload(input)));
  } catch (err) {
    console.error("[NEXUS][POST] Error:", err);
    return NextResponse.json(buildFallbackCompletion(buildGracefulPayload(input)));
  }
}
