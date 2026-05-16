
'use server';
/**
 * @fileOverview Server action for uploading and processing a PDF document.
 * Sends the PDF to the Python FastAPI backend for text extraction and indexing.
 */

export type UploadAndProcessDocumentInput = {
  pdfDataUri: string;
};

export type UploadAndProcessDocumentOutput = {
  docId: string;
  chunks: number;
};

function parseDataUri(dataUri: string): { mimeType: string; base64Data: string } {
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URI format. Expected "data:<mimetype>;base64,<data>"');
  }
  return { mimeType: matches[1], base64Data: matches[2] };
}

export async function uploadAndProcessDocument(
  input: UploadAndProcessDocumentInput
): Promise<UploadAndProcessDocumentOutput> {
  // Default to port 8001 — must match main.py and BACKEND_API_URL in .env
  const rawBackendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8001';
  const uploadEndpoint = `${rawBackendUrl.replace(/\/$/, '')}/upload`;

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
      chunks: result.chunks ?? result.chunk_count ?? 0,
    };
  } catch (error: any) {
    console.error(`[SmartDoc AI] Upload Connection Error:`, error.message);

    if (error.name === 'TimeoutError') {
      throw new Error(
        'Upload timed out. Large files may require a faster connection or more backend resources.'
      );
    }

    if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
      throw new Error(
        `CONNECTION REFUSED: The FastAPI server at ${uploadEndpoint} is not responding. ` +
          `Please run 'npm run backend' in a separate terminal tab.`
      );
    }

    throw new Error(`Upload failed: ${error.message}`);
  }
}
