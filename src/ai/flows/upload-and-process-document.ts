
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
    // We explicitly use 127.0.0.1 to avoid IPv6 resolution issues in Node.js
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const uploadEndpoint = `${backendUrl.replace(/\/$/, '')}/upload`;

    console.log(`[SmartDoc AI] Connecting to backend at: ${uploadEndpoint}`);

    try {
      const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);
      const fileBuffer = Buffer.from(base64Data, 'base64');
      
      const formData = new FormData();
      // Using a standard Blob with type information
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, 'document.pdf');

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        // Increased timeout to 2.5 minutes for large PDFs
        signal: AbortSignal.timeout(150000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SmartDoc AI] Backend Error ${response.status}:`, errorText);
        throw new Error(`Backend reached but returned error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return {
        docId: result.doc_id || result.docId,
        chunks: result.chunks ?? result.chunk_count ?? 0
      };
    } catch (error: any) {
      console.error(`[SmartDoc AI] Connection failed to ${uploadEndpoint}:`, error.message);
      
      if (error.name === 'TimeoutError') {
        throw new Error('Upload timed out. The backend is taking too long to respond.');
      }
      
      if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(
          `COULD NOT REACH BACKEND: Please ensure your FastAPI server is running at ${backendUrl}. ` +
          `Verify it's started with 'python backend/main.py'.`
        );
      }
      
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
);
