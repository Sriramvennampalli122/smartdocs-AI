
'use server';
/**
 * @fileOverview This file defines a Genkit flow for uploading and processing a PDF document.
 * The flow takes a PDF as a data URI, sends it to a backend FastAPI service for RAG processing,
 * and returns the document ID and the number of chunks indexed.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UploadAndProcessDocumentInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
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
    throw new Error('Invalid data URI format. Expected "data:<mime>;base64,<data>"');
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
    // Force IPv4 loopback to avoid Node.js localhost resolution issues
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const baseUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
    const uploadEndpoint = `${baseUrl}/upload`;

    console.log(`[SmartDoc AI] Attempting upload to: ${uploadEndpoint}`);

    const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    // The backend expects a file field named 'file'
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'document.pdf');

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        // Increase timeout for slow processing environments
        signal: AbortSignal.timeout(120000), 
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text();
        }
        throw new Error(`Backend Response Error (${response.status}): ${errorDetail}`);
      }

      const result = await response.json();
      const docId = result.doc_id || result.docId;
      const chunks = result.chunks ?? result.num_chunks ?? result.chunk_count ?? 0;

      if (!docId) {
        throw new Error('Document processed but backend failed to return an ID.');
      }

      return { docId, chunks };
    } catch (error: any) {
      console.error(`[SmartDoc AI] Upload Error:`, error);

      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error(`The backend at ${baseUrl} took too long to respond (timeout after 120s).`);
      }

      if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new Error(
          `CONNECTION REFUSED: Could not reach the backend at ${uploadEndpoint}. ` +
          `Please ensure your FastAPI server is running and listening on 127.0.0.1:8000.`
        );
      }
      
      throw new Error(`Failed to upload: ${error.message}`);
    }
  }
);
