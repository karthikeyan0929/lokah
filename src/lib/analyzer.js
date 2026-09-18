import * as pdfjsLib from 'pdfjs-dist';
import { formatFileSize } from './fileUtils.js';

/**
 * Deep Analysis of PDF Structure, Text, Images, Scanned status, Dimensions, and Metadata
 */
export async function analyzePdfDocument(file, pdfDoc = null) {
  const activeDoc = pdfDoc || (await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise);
  const numPages = activeDoc.numPages;

  let metadata = {};
  try {
    const metaObj = await activeDoc.getMetadata();
    metadata = {
      title: metaObj?.info?.Title || 'N/A',
      author: metaObj?.info?.Author || 'N/A',
      creator: metaObj?.info?.Creator || 'N/A',
      producer: metaObj?.info?.Producer || 'N/A',
      creationDate: metaObj?.info?.CreationDate || 'N/A',
      pdfFormatVersion: metaObj?.info?.PDFFormatVersion || '1.7'
    };
  } catch {
    metadata = { title: 'N/A', author: 'N/A', creator: 'N/A', pdfFormatVersion: '1.7' };
  }

  let totalChars = 0;
  let totalImages = 0;
  let orientations = new Set();
  let sampleWidth = 0;
  let sampleHeight = 0;
  let scannedPagesCount = 0;
  let blankPages = [];
  const pageDetails = [];

  // Sample up to first 15 pages for rapid in-depth client-side analysis
  const sampleLimit = Math.min(numPages, 15);

  for (let i = 1; i <= sampleLimit; i++) {
    const page = await activeDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    if (i === 1) {
      sampleWidth = Math.round(viewport.width);
      sampleHeight = Math.round(viewport.height);
    }

    const isLandscape = viewport.width > viewport.height;
    orientations.add(isLandscape ? 'Landscape' : 'Portrait');

    // Extract text items
    const textContent = await page.getTextContent();
    const pageChars = textContent.items.reduce((acc, it) => acc + (it.str ? it.str.length : 0), 0);
    totalChars += pageChars;

    // Detect Operator list for Image XObjects
    let pageImageCount = 0;
    try {
      const ops = await page.getOperatorList();
      for (let j = 0; j < ops.fnArray.length; j++) {
        if (
          ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
          ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject ||
          ops.fnArray[j] === pdfjsLib.OPS.paintImageMaskXObject
        ) {
          pageImageCount++;
        }
      }
    } catch {
      // Fallback
    }

    totalImages += pageImageCount;

    // Check if blank (low text + no image)
    const isBlank = pageChars === 0 && pageImageCount === 0;
    if (isBlank) blankPages.push(i);

    // Scanned page detection heuristic: has image operator but zero selectable text
    const isScanned = pageChars < 10 && pageImageCount > 0;
    if (isScanned) scannedPagesCount++;

    pageDetails.push({
      pageNum: i,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      isLandscape,
      charCount: pageChars,
      imageCount: pageImageCount,
      isBlank,
      isScanned
    });
  }

  const orientationSummary = orientations.size > 1 ? 'Mixed' : Array.from(orientations)[0] || 'Portrait';
  const hasText = totalChars > 5;
  const estimatedTotalImages = Math.round((totalImages / sampleLimit) * numPages);

  // Smart Optimization Recommendation Engine
  let recommendedDpi = 150;
  let recommendedQuality = 0.85;
  let reason = 'Balanced for documents with mixed text & images.';

  if (scannedPagesCount > 0) {
    recommendedDpi = 300;
    recommendedQuality = 0.88;
    reason = 'Scanned elements detected. High 300 DPI ensures crisp image clarity.';
  } else if (!hasText && totalImages > 5) {
    recommendedDpi = 200;
    recommendedQuality = 0.90;
    reason = 'Image-heavy document. Enhanced quality preserves visual fidelity.';
  } else if (file.size > 20 * 1024 * 1024) {
    recommendedDpi = 150;
    recommendedQuality = 0.80;
    reason = 'Large PDF. Optimized 150 DPI balanced for reduced file footprint.';
  }

  // Estimated size calculation (approximate uncompressed canvas * quality)
  const estJpegSizePerMb = ((sampleWidth * sampleHeight * 3 * (recommendedDpi / 72) ** 2) / (1024 * 1024)) * (recommendedQuality * 0.12);
  const estimatedOutputSizeMb = (estJpegSizePerMb * numPages).toFixed(1);

  return {
    numPages,
    fileSizeFormatted: formatFileSize(file.size),
    fileSizeBytes: file.size,
    sampleWidth,
    sampleHeight,
    orientationSummary,
    hasText,
    totalImages: estimatedTotalImages,
    scannedPagesCount,
    blankPages,
    metadata,
    pageDetails,
    recommendation: {
      dpi: recommendedDpi,
      quality: Math.round(recommendedQuality * 100),
      reason,
      estimatedOutputSize: `${estimatedOutputSizeMb} MB`
    }
  };
}
