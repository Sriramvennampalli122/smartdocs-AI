import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json();

    if (!question || !context) {
      return NextResponse.json({ error: 'Missing question or context' }, { status: 400 });
    }

    const prompt = `You are an expert document analysis assistant.
Answer the user's question based ONLY on the context provided below.
If the answer is not found in the context, say "I could not find information about that in the provided document."
Be concise, accurate, and cite the relevant page numbers in your answer.

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

    const { text } = await ai.generate(prompt);

    return NextResponse.json({ answer: text?.trim() || 'No answer generated.' });
  } catch (error: any) {
    console.error('[SmartDoc AI] /api/generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
