
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
    // Prefer IPv4 explicitly to avoid DNS resolution issues with 'localhost' in Node.js
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const backendApiUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
    const uploadEndpoint = `${backendApiUrl}/upload`;

    const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    // The backend expects a file field named 'file'
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'document.pdf');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for large uploads

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text();
        }
        throw new Error(`Backend Error (${response.status}): ${errorDetail}`);
      }

      const result = await response.json();

      const docId = result.doc_id || result.docId;
      const chunks = result.chunks ?? result.num_chunks ?? result.chunk_count ?? 0;

      if (!docId) {
        throw new Error('Document processed but backend failed to return an ID.');
      }

      return { docId, chunks };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Upload timed out. The document might be too large for the current backend processing time.`);
      }
      
      // Map common networking errors to helpful advice
      if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new Error(
          `Connection refused: Could not reach the backend at ${uploadEndpoint}. ` +
          `Please ensure your Python FastAPI server is running (e.g., 'python main.py' or 'uvicorn main:app') and bound to 127.0.0.1:8000.`
        );
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
);
