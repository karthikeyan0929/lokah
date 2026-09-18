import * as pdfjsLib from 'pdfjs-dist';

/**
 * Render visual thumbnail for PDF page into a canvas
 */
export async function renderPageThumbnail(pdfDoc, pageNum, targetWidth = 140) {
  const page = await pdfDoc.getPage(pageNum);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return {
    pageNum,
    dataUrl,
    width: canvas.width,
    height: canvas.height
  };
}
