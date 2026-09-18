import { createWorker } from 'tesseract.js';

let ocrWorker = null;

/**
 * Initialize or get Tesseract OCR Worker
 */
async function getWorker(onProgress = null) {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
  }
  return ocrWorker;
}

/**
 * Perform actual OCR on an Image Canvas / Blob
 */
export async function performOcrOnImage(imageBlobOrDataUrl, onProgress = null) {
  try {
    const worker = await getWorker(onProgress);
    const ret = await worker.recognize(imageBlobOrDataUrl);
    return {
      text: ret.data.text || '',
      confidence: Math.round(ret.data.confidence || 0)
    };
  } catch (err) {
    console.error('Tesseract OCR error:', err);
    return {
      text: '',
      confidence: 0,
      error: 'OCR recognition failed.'
    };
  }
}

/**
 * Terminate worker when done to free memory
 */
export async function terminateOcrWorker() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}
