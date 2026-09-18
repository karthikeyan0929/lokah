import * as pdfjsLib from 'pdfjs-dist';
import { parsePageRange, sanitizeFileName } from './fileUtils.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const RESOLUTION_PRESETS = {
  72: { label: '72 DPI (Standard Web / 1.0x)', scale: 1.0 },
  150: { label: '150 DPI (High Definition / 2.08x)', scale: 2.083 },
  300: { label: '300 DPI (Ultra / Print Ready / 4.16x)', scale: 4.166 },
  600: { label: '600 DPI (Maximum Archival / 8.33x)', scale: 8.333 }
};

export const QUALITY_PRESETS = {
  low: 0.60,
  balanced: 0.82,
  high: 0.92,
  maximum: 0.98
};

/**
 * Render single page with custom DPI, Grayscale, Background Color, Dimensions, and Watermarks
 */
export async function renderPageToJpeg(pdfDoc, pageNum, options = {}) {
  const {
    scale = 2.083,
    quality = 0.92,
    grayscale = false,
    backgroundColor = '#FFFFFF',
    customWidth = null,
    customHeight = null,
    rotation = 0,
    watermark = null
  } = options;

  const page = await pdfDoc.getPage(pageNum);
  let viewport = page.getViewport({ scale, rotation });

  // Custom dimensions if specified
  if (customWidth && customHeight) {
    const scaleX = customWidth / viewport.width;
    const scaleY = customHeight / viewport.height;
    viewport = page.getViewport({ scale: scale * Math.min(scaleX, scaleY), rotation });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // Background Color
  ctx.fillStyle = backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render PDF
  await page.render({
    canvasContext: ctx,
    viewport,
    intent: 'print'
  }).promise;

  // Apply Grayscale if selected
  if (grayscale) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Apply Watermark if selected
  if (watermark && watermark.text) {
    drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, watermark);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

  // Extract structured text content
  let textContent = '';
  try {
    const textObj = await page.getTextContent();
    textContent = textObj.items.map((it) => it.str).join(' ');
  } catch {
    //
  }

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

function drawWatermarkOnCanvas(ctx, width, height, wm) {
  ctx.save();
  const fontSize = Math.max(16, Math.round(width * (wm.size || 0.04)));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = wm.color || '#000000';
  ctx.globalAlpha = wm.opacity !== undefined ? wm.opacity : 0.35;

  let x = width / 2;
  let y = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (wm.position === 'top-left') {
    x = 40; y = 40; ctx.textAlign = 'left';
  } else if (wm.position === 'top-center') {
    x = width / 2; y = 40;
  } else if (wm.position === 'top-right') {
    x = width - 40; y = 40; ctx.textAlign = 'right';
  } else if (wm.position === 'bottom-left') {
    x = 40; y = height - 40; ctx.textAlign = 'left';
  } else if (wm.position === 'bottom-center') {
    x = width / 2; y = height - 40;
  } else if (wm.position === 'bottom-right') {
    x = width - 40; y = height - 40; ctx.textAlign = 'right';
  }

  ctx.translate(x, y);
  if (wm.rotation) {
    ctx.rotate((wm.rotation * Math.PI) / 180);
  }
  ctx.fillText(wm.text, 0, 0);
  ctx.restore();
}

/**
 * Convert PDF pages with full advanced settings & naming patterns
 */
export async function convertPdfToJpegs(fileItem, settings, onProgress = null) {
  const { file, pdfDoc } = fileItem;
  const activeDoc = pdfDoc || (await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise);

  const totalDocPages = activeDoc.numPages;
  const targetPages = parsePageRange(settings.pageRange, totalDocPages);
  const results = [];
  const baseName = sanitizeFileName(file.name);

  // Compute scale from DPI
  const dpi = settings.dpi || 150;
  const scale = (dpi / 72);
  const quality = settings.quality || 0.92;

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

    const pageResult = await renderPageToJpeg(activeDoc, pageNum, {
      scale,
      quality,
      grayscale: settings.grayscale,
      backgroundColor: settings.backgroundColor,
      watermark: settings.watermark
    });

    // Filename pattern formatting (e.g. {filename}_page_{page})
    const pattern = settings.namingPattern || '{filename}_page_{page}';
    const formattedPageNum = String(pageNum).padStart(settings.zeroPadding ? 3 : 2, '0');
    let customFilename = pattern
      .replace('{filename}', baseName)
      .replace('{page}', formattedPageNum);

    if (!customFilename.toLowerCase().endsWith('.jpg') && !customFilename.toLowerCase().endsWith('.jpeg')) {
      customFilename += '.jpg';
    }

    results.push({
      ...pageResult,
      filename: customFilename,
      sourceFileName: file.name,
      dpi,
      id: `${file.name}-${pageNum}-${Date.now()}`
    });
  }

  return results;
}

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
