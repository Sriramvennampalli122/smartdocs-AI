'use server';
/**
 * @fileOverview This file defines a Genkit flow for uploading and processing a PDF document.
 * The flow takes a PDF as a data URI, sends it to a backend FastAPI service for RAG processing,
 * and returns the document ID and the number of chunks indexed.
 *
 * - uploadAndProcessDocument - A function that handles the PDF upload and processing.
 * - UploadAndProcessDocumentInput - The input type for the uploadAndProcessDocument function.
 * - UploadAndProcessDocumentOutput - The return type for the uploadAndProcessDocument function.
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

/**
 * Helper function to parse a data URI into its MIME type and base64 encoded data.
 */
function parseDataUri(dataUri: string): { mimeType: string, base64Data: string } {
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URI format. Expected "data:<mime>;base64,<data>"');
  }
  return { mimeType: matches[1], base64Data: matches[2] };
}

/**
 * Uploads a PDF document to the backend FastAPI service for processing and indexing.
 */
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
    // Default to 127.0.0.1 to avoid IPv6 resolution issues with Node.js fetch
    const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const backendApiUrl = rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl;
    const uploadEndpoint = `${backendApiUrl}/upload`;

    const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);

    // Use Buffer for cleaner base64 processing in Node.js server context
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    // The backend expects a file named 'file'
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'document.pdf');

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        // Body size limit is handled by next.config.ts
      });

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

      if (result.status === 'error' || result.error) {
        throw new Error(result.message || result.error || 'Backend reported an error');
      }

      const docId = result.doc_id || result.docId;
      const chunks = result.chunks ?? result.num_chunks ?? result.chunk_count ?? 0;

      if (!docId) {
        throw new Error('Backend successfully processed but failed to return a document ID');
      }

      return { docId, chunks };
    } catch (error: any) {
      console.error('Document Processing Flow Error:', {
        message: error.message,
        url: uploadEndpoint,
        cause: error.cause
      });
      throw new Error(`Failed to connect to backend at ${uploadEndpoint}. Ensure your backend API is running and reachable.`);
    }
  }
);