
'use server';
/**
 * @fileOverview This file defines a Genkit flow for uploading and processing a PDF document.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UploadAndProcessDocumentInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type UploadAndProcessDocumentInput = z.infer<typeof UploadAndProcessDocumentInputSchema>;

const UploadAndProcessDocumentOutputSchema = z.object({
  docId: z.string().describe('The ID of the document after processing.'),
  chunks: z.number().describe('The number of chunks indexed from the document.'),
});
export type UploadAndProcessDocumentOutput = z.infer<typeof UploadAndProcessDocumentOutputSchema>;

function parseDataUri(dataUri: string): { mimeType: string, base64Data: string } {
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URI format.');
  }
  return { mimeType: matches[1], base64Data: matches[2] };
}

export async function uploadAndProcessDocument(
  input: UploadAndProcessDocumentInput
): Promise<UploadAndProcessDocumentOutput> {
  return uploadAndProcessDocumentFlow(input);
}

const uploadAndProcessDocumentFlow = ai.defineFlow(
  {
    name: 'uploadAndProcessDocumentFlow',
    inputSchema: UploadAndProcessDocumentInputSchema,
    outputSchema: UploadAndProcessDocumentOutputSchema,
  },
  async (input) => {
    // Ensure we use the exact IPv4 address to avoid resolution issues
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const uploadEndpoint = `${backendUrl.replace(/\/$/, '')}/upload`;

    console.log(`[SmartDoc AI] Sending PDF to backend: ${uploadEndpoint}`);

    const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'document.pdf');

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120000), // 2 min timeout for heavy PDF processing
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`Backend Error (${response.status}): ${errorDetail}`);
      }

      const result = await response.json();
      return {
        docId: result.doc_id || result.docId,
        chunks: result.chunks ?? result.chunk_count ?? 0
      };
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        throw new Error('The backend took too long to process the document.');
      }
      if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(`CONNECTION FAILED: Ensure your FastAPI server is running at ${backendUrl}.`);
      }
      throw error;
    }
  }
);
