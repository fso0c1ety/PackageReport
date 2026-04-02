import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI Service configuration missing' }, { status: 500 });

  const { messages, systemPrompt, input } = await req.json();
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          { role: 'user', content: input },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI Request Failed');
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Nexus Brain Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
