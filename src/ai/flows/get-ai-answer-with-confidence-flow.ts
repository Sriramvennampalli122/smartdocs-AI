
'use server';
/**
 * @fileOverview Calls the Python backend which handles TF-IDF retrieval
 * + Groq LLM generation. Returns a structured answer with sources.
 */

import { z } from 'genkit';

const GetAiAnswerWithConfidenceInputSchema = z.object({
  question: z.string(),
  docId: z.string(),
});
export type GetAiAnswerWithConfidenceInput = z.infer<typeof GetAiAnswerWithConfidenceInputSchema>;

export type GetAiAnswerWithConfidenceOutput = {
  answer: string;
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  hallucinationRisk: 'Safe' | 'Uncertain' | 'Risky';
  sources: { text: string; page: number }[];
};

export async function getAiAnswerWithConfidence(
  input: GetAiAnswerWithConfidenceInput
): Promise<GetAiAnswerWithConfidenceOutput> {
  const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8001';
  const baseUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
  const askEndpoint = `${baseUrl}/ask`;

  console.log(`[SmartDoc AI] Sending query to: ${askEndpoint}`);

  try {
    const response = await fetch(askEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: input.question, doc_id: input.docId }),
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(
        `Backend Error (${response.status}): ${errorData.detail || errorData.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`[SmartDoc AI] Got answer (${result.answer?.length ?? 0} chars)`);

    return {
      answer: result.answer || 'No answer generated.',
      confidence: result.confidence ?? 0,
      confidenceLabel: (result.confidence_label || 'Medium') as 'High' | 'Medium' | 'Low',
      hallucinationRisk: (result.hallucination_risk || 'Uncertain') as 'Safe' | 'Uncertain' | 'Risky',
      sources: (result.sources || []).map((s: any) => ({
        text: s.text || '',
        page: s.page ?? 1,
      })),
    };
  } catch (error: any) {
    console.error(`[SmartDoc AI] Query Error:`, error);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      throw new Error(
        `Cannot connect to backend at ${askEndpoint}. Make sure the Python server is running with: npm run backend`
      );
    }
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
