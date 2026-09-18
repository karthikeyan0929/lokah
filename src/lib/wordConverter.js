import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { sanitizeFileName } from './fileUtils.js';

/**
 * Convert PDF Text Content or Extracted Elements into a Word (.docx) document
 */
export async function convertPdfToDocx(pdfData, options = {}) {
  const { fileName = 'document', pages = [] } = pdfData;

  const docChildren = [
    new Paragraph({
      text: fileName.replace(/\.pdf$/i, ''),
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 }
    })
  ];

  pages.forEach((page) => {
    // Add Page Heading
    docChildren.push(
      new Paragraph({
        text: `Page ${page.pageNum}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      })
    );

    // Split page text into lines/paragraphs
    const textLines = (page.textContent || '').split('\n').filter((l) => l.trim().length > 0);

    if (textLines.length > 0) {
      textLines.forEach((line) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24 // 12pt
              })
            ],
            spacing: { after: 120 }
          })
        );
      });
    } else {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Image / Vector Content Page]',
              italics: true,
              color: '888888',
              size: 22
            })
          ],
          spacing: { after: 120 }
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren
      }
    ]
  });

  const docxBlob = await Packer.toBlob(doc);
  const outFileName = `${sanitizeFileName(fileName.replace(/\.pdf$/i, ''))}.docx`;
  saveAs(docxBlob, outFileName);

  return { blob: docxBlob, fileName: outFileName };
}

/**
 * Convert Word (.docx) to HTML / Text Preview
 */
export async function convertDocxToHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    html: result.value,
    messages: result.messages
  };
}
