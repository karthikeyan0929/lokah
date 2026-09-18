import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { sanitizeFileName } from './fileUtils.js';

/**
 * Download a single JPEG image blob
 */
export function downloadSingleJpeg(imageItem) {
  const fileName = imageItem.filename || `page_${imageItem.pageNum}.jpg`;
  saveAs(imageItem.blob, fileName);
}

/**
 * Bundle multiple JPEG images into a ZIP archive and trigger download
 */
export async function downloadImagesZip(imageItems, zipName = 'converted-images.zip', onProgress = null) {
  if (!imageItems || imageItems.length === 0) return;

  const zip = new JSZip();
  const folderName = sanitizeFileName(zipName.replace(/\.zip$/i, ''));
  const folder = zip.folder(folderName) || zip;

  imageItems.forEach((img, idx) => {
    const filename = img.filename || `image_${String(idx + 1).padStart(3, '0')}.jpg`;
    folder.file(filename, img.blob);
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress && metadata) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  saveAs(zipBlob, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
}
