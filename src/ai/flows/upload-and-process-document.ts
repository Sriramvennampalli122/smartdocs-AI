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
import { Buffer } from 'buffer'; // Explicit import for Buffer

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
 * @param dataUri The data URI string.
 * @returns An object containing the MIME type and base64 data.
 * @throws Error if the data URI format is invalid.
 */
function parseDataUri(dataUri: string): { mimeType: string, base64Data: string } {
  const parts = dataUri.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid data URI format');
  }
  const meta = parts[0];
  const base64Data = parts[1];
  const mimeMatch = meta.match(/data:(.*?);base64/);
  if (!mimeMatch || mimeMatch.length < 2) {
    throw new Error('Invalid data URI: MIME type not found');
  }
  const mimeType = mimeMatch[1];
  return { mimeType, base64Data };
}

/**
 * Uploads a PDF document to the backend FastAPI service for processing and indexing.
 * @param input Contains the PDF document as a data URI.
 * @returns The document ID and the number of chunks indexed.
 * @throws Error if the upload or processing fails.
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
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const uploadEndpoint = `${backendApiUrl}/upload`;

    const { mimeType, base64Data } = parseDataUri(input.pdfDataUri);

    // Convert base64 string to Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a FormData object to send the file as multipart/form-data.
    // In a Next.js server action/Genkit server environment, FormData and Blob are typically available globally.
    const formData = new FormData();
    // The backend expects a file named 'file' as per FastAPI specification for file uploads.
    formData.append('file', new Blob([buffer], { type: mimeType }), 'document.pdf'); // 'document.pdf' is a placeholder filename

    try {
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        // When using FormData, fetch automatically sets the 'Content-Type': 'multipart/form-data'
        // header with the correct boundary. Do not set it manually.
      });

      if (!response.ok) {
        let errorText = `Backend API error: ${response.status} - ${response.statusText}`;
        try {
          // Attempt to parse JSON error message if available
          const errorJson = await response.json();
          errorText = errorJson.detail || JSON.stringify(errorJson);
        } catch (jsonError) {
          // Fallback to plain text if JSON parsing fails
          errorText = await response.text();
        }
        throw new Error(`Failed to upload and process document: ${errorText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(`Backend returned non-success status: ${JSON.stringify(result)}`);
      }

      return {
        docId: result.doc_id,
        chunks: result.chunks,
      };
    } catch (error: any) {
      console.error('Error uploading document to backend:', error);
      throw new Error(`Failed to upload and process document: ${error.message}`);
    }
  }
);
