import * as pdfjsLib from 'pdfjs-dist';
import { parsePageRange, sanitizeFileName } from './fileUtils.js';

// Setup official PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const RESOLUTION_PRESETS = {
  standard: { label: 'Standard (72-96 DPI / 1.25x)', scale: 1.25 },
  high: { label: 'High (150 DPI / 2.0x)', scale: 2.0 },
  ultra: { label: 'Very High (300 DPI / 3.0x)', scale: 3.0 }
};

export const QUALITY_PRESETS = {
  low: 0.65,
  medium: 0.82,
  high: 0.95
};

/**
 * Load PDF Document metadata without rendering
 */
export async function loadPdfMetadata(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
    cMapPacked: true
  });

  const pdfDoc = await loadingTask.promise;
  return {
    pdfDoc,
    numPages: pdfDoc.numPages
  };
}

/**
 * Render a single PDF page to JPEG Blob & DataURL and extract clean text
 */
export async function renderPageToJpeg(pdfDoc, pageNum, { scale = 2.0, quality = 0.92 }) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  // Create canvas in memory
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // Clean solid white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render PDF content onto canvas
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    intent: 'print'
  };

  await page.render(renderContext).promise;

  // Convert canvas to JPEG blob and preview URL
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });

  // Extract structured text content for Word (.docx) & Search
  let textContent = '';
  try {
    const textObj = await page.getTextContent();
    textContent = textObj.items.map((it) => it.str).join(' ');
  } catch (err) {
    console.warn('Text extraction note for page ' + pageNum, err);
  }

  // Cleanup canvas reference
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = 0;
  canvas.height = 0;

  return {
    pageNum,
    width,
    height,
    dataUrl,
    blob,
    sizeBytes: blob ? blob.size : 0,
    textContent
  };
}

/**
 * Process an entire PDF file and convert specified pages to JPEGs + Text
 */
export async function convertPdfToJpegs(fileItem, settings, onProgress = null) {
  const { file, pdfDoc } = fileItem;
  const activeDoc = pdfDoc || (await loadPdfMetadata(file)).pdfDoc;

  const totalDocPages = activeDoc.numPages;
  const targetPages = parsePageRange(settings.pageRange, totalDocPages);
  const results = [];
  const baseName = sanitizeFileName(file.name);

  const scale = RESOLUTION_PRESETS[settings.resolution]?.scale || settings.customScale || 2.0;
  const quality = QUALITY_PRESETS[settings.quality] || settings.customQuality || 0.92;

  const totalToRender = targetPages.length;

  for (let i = 0; i < totalToRender; i++) {
    const pageNum = targetPages[i];
    if (onProgress) {
      onProgress({
        currentFile: file.name,
        currentPage: i + 1,
        totalInFile: totalToRender,
        pageNumber: pageNum,
        percent: Math.round(((i + 1) / totalToRender) * 100)
      });
    }

    const pageResult = await renderPageToJpeg(activeDoc, pageNum, { scale, quality });
    const formattedPageNum = String(pageNum).padStart(2, '0');
    const filename = `${baseName}_page_${formattedPageNum}.jpg`;

    results.push({
      ...pageResult,
      filename,
      sourceFileName: file.name,
      id: `${file.name}-${pageNum}-${Date.now()}`
    });
  }

  return results;
}
