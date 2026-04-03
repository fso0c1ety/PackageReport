import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../_lib/server";

export const runtime = "nodejs";

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Service configuration missing (OPENAI_API_KEY)" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const input = body?.input || "";
    const systemPrompt = body?.systemPrompt || "";
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          { role: "user", content: input },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      let errorMessage = "OpenAI Request Failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText.slice(0, 500);
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[NEXUS][POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
