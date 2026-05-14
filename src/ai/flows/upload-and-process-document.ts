
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
    throw new Error('Invalid data URI format. Expected "data:<mimetype>;base64,<data>"');
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
    // Explicitly target 127.0.0.1 for local FastAPI connection reliability
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const uploadEndpoint = `${backendUrl.replace(/\/$/, '')}/upload`;

    console.log(`[SmartDoc AI] Attempting upload to: ${uploadEndpoint}`);

    try {
      const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);
      const fileBuffer = Buffer.from(base64Data, 'base64');
      
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, 'document.pdf');

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        // 5-minute timeout for large documents (10MB+)
        signal: AbortSignal.timeout(300000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return {
        docId: result.doc_id || result.docId,
        chunks: result.chunks ?? result.chunk_count ?? 0
      };
    } catch (error: any) {
      console.error(`[SmartDoc AI] Upload Connection Error:`, error.message);
      
      if (error.name === 'TimeoutError') {
        throw new Error('Upload timed out. Large files may require a faster connection or more backend resources.');
      }
      
      if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(
          `CONNECTION REFUSED: The FastAPI server at ${uploadEndpoint} is not responding. ` +
          `Please run 'npm run backend' in a separate terminal tab.`
        );
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
);
