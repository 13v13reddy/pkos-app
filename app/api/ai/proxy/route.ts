// app/api/ai/proxy/route.ts

import { NextResponse } from 'next/server';

// This is a mock function simulating a call to an external AI provider like OpenAI.
// In a real application, this function would make an actual HTTPS request.
async function getMockAiSummary(text: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500)); 

  const wordCount = text.trim().split(/\s+/).length;
  return `This is a mock AI summary. The provided text has approximately ${wordCount} words. The key themes appear to be related to the core concepts presented in the document.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { textContent } = body;

    if (!textContent) {
      return NextResponse.json({ message: 'textContent is required.' }, { status: 400 });
    }

    // --- Secure Proxy Logic ---
    // 1. The decrypted text is received from the client.
    // 2. It's held in memory only for the duration of this request.
    // 3. It's sent to the AI provider.
    // 4. The response is immediately sent back to the client.
    // 5. The decrypted text is discarded when the function returns. It is never logged or stored.

    const summary = await getMockAiSummary(textContent);

    return NextResponse.json({ summary }, { status: 200 });

  } catch (error) {
    console.error('AI Proxy Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}