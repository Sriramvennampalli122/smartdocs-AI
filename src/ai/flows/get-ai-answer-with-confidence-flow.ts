'use server';
/**
 * @fileOverview A Genkit flow for asking questions about an uploaded document and getting an AI-generated answer with a confidence level and source passages.
 *
 * - getAiAnswerWithConfidence - A function that handles the document Q&A process with hallucination detection.
 * - GetAiAnswerWithConfidenceInput - The input type for the getAiAnswerWithConfidence function.
 * - GetAiAnswerWithConfidenceOutput - The return type for the getAiAnswerWithConfidence function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Defines the input schema for the getAiAnswerWithConfidence flow.
 */
const GetAiAnswerWithConfidenceInputSchema = z.object({
  question: z.string().describe('The user’s question about the document.'),
  docId: z.string().describe('The unique identifier of the uploaded document.'),
});
export type GetAiAnswerWithConfidenceInput = z.infer<typeof GetAiAnswerWithConfidenceInputSchema>;

/**
 * Defines the output schema for the getAiAnswerWithConfidence flow.
 */
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

/**
 * Defines a Genkit flow to ask a question about an uploaded document, 
 * retrieve an AI answer, and assess its confidence and hallucination risk 
 * by calling a backend service.
 */
const getAiAnswerWithConfidenceFlow = ai.defineFlow(
  {
    name: 'getAiAnswerWithConfidenceFlow',
    inputSchema: GetAiAnswerWithConfidenceInputSchema,
    outputSchema: GetAiAnswerWithConfidenceOutputSchema,
  },
  async (input) => {
    // Default to 127.0.0.1 to avoid IPv6 resolution issues with Node.js fetch
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const backendApiUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
    const askEndpoint = `${backendApiUrl}/ask`;
    
    try {
      const response = await fetch(askEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input.question, doc_id: input.docId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Backend API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Robust mapping to handle potential snake_case from FastAPI backend
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
      console.error('Error fetching AI answer from backend:', {
        message: error.message,
        url: askEndpoint,
        cause: error.cause,
        code: error.code
      });
      
      if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(`Connection failed to ${askEndpoint}. Please ensure your Python backend is running at that address.`);
      }
      
      throw new Error(`Failed to get AI answer from ${askEndpoint}: ${error.message}`);
    }
  }
);

export async function getAiAnswerWithConfidence(
  input: GetAiAnswerWithConfidenceInput
): Promise<GetAiAnswerWithConfidenceOutput> {
  return getAiAnswerWithConfidenceFlow(input);
}
