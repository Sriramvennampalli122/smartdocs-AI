
'use server';
/**
 * @fileOverview A Genkit flow for asking questions about an uploaded document.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetAiAnswerWithConfidenceInputSchema = z.object({
  question: z.string().describe('The user’s question about the document.'),
  docId: z.string().describe('The unique identifier of the uploaded document.'),
});
export type GetAiAnswerWithConfidenceInput = z.infer<typeof GetAiAnswerWithConfidenceInputSchema>;

const GetAiAnswerWithConfidenceOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
  confidence: z.number().min(0.0).max(1.0).describe('A numerical confidence score (0.0 to 1.0) for the answer.'),
  confidenceLabel: z.enum(['High', 'Medium', 'Low']).describe('A human-readable label for the confidence score.'),
  hallucinationRisk: z.enum(['Safe', 'Uncertain', 'Risky']).describe('An assessment of the hallucination risk for the answer.'),
  sources: z.array(z.object({
    text: z.string().describe('The text content of the source chunk.'),
    page: z.number().int().describe('The page number from which the source chunk was extracted.'),
  })).describe('An array of source passages from the document used to generate the answer.'),
});
export type GetAiAnswerWithConfidenceOutput = z.infer<typeof GetAiAnswerWithConfidenceOutputSchema>;

const getAiAnswerWithConfidenceFlow = ai.defineFlow(
  {
    name: 'getAiAnswerWithConfidenceFlow',
    inputSchema: GetAiAnswerWithConfidenceInputSchema,
    outputSchema: GetAiAnswerWithConfidenceOutputSchema,
  },
  async (input) => {
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const baseUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
    const askEndpoint = `${baseUrl}/ask`;
    
    console.log(`[SmartDoc AI] Sending query to: ${askEndpoint}`);

    try {
      const response = await fetch(askEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input.question, doc_id: input.docId }),
        signal: AbortSignal.timeout(60000), // 60s timeout for RAG search
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Backend Response Error (${response.status}): ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      return {
        answer: result.answer || '',
        confidence: result.confidence ?? 0,
        confidenceLabel: (result.confidence_label || result.confidenceLabel || 'Medium') as 'High' | 'Medium' | 'Low',
        hallucinationRisk: (result.hallucination_risk || result.hallucinationRisk || 'Uncertain') as 'Safe' | 'Uncertain' | 'Risky',
        sources: (result.sources || []).map((s: any) => ({
          text: s.text || '',
          page: s.page ?? s.page_number ?? 1
        })),
      };
    } catch (error: any) {
      console.error(`[SmartDoc AI] Query Error:`, error);

      if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new Error(
          `CONNECTION REFUSED: Could not reach the backend for analysis at ${askEndpoint}. ` +
          `Check your Python server logs and ensure it is bound to 127.0.0.1:8000.`
        );
      }
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }
);

export async function getAiAnswerWithConfidence(
  input: GetAiAnswerWithConfidenceInput
): Promise<GetAiAnswerWithConfidenceOutput> {
  return getAiAnswerWithConfidenceFlow(input);
}
