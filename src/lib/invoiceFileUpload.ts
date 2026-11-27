import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_INVOICE_FILE_BYTES, type InvoiceDocumentBlock } from './invoiceWorkflow';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Hard cap before we even try to decode a file in the browser. */
export const MAX_RAW_UPLOAD_BYTES = 25 * 1024 * 1024;

const MAX_IMAGE_DIMENSION = 2200;
const MAX_PDF_PAGES = 5;
const MIN_TEXT_CHARS = 80;
const MAX_TEXT_CHARS = 200_000;
const IMAGE_QUALITIES = [0.82, 0.7, 0.58, 0.45, 0.35];

export interface PreparedInvoiceUpload {
  documentBlocks: InvoiceDocumentBlock[];
  compressed: boolean;
}

type DrawableImage = ImageBitmap | HTMLImageElement;

function loadImage(file: File): Promise<DrawableImage> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read this image.'));
    };
    image.src = url;
  });
}

function releaseImage(image: DrawableImage): void {
  if (typeof (image as ImageBitmap).close === 'function') {
    (image as ImageBitmap).close();
  }
}

/**
 * Encodes a canvas as WebP (or JPEG where WebP is unsupported), stepping down
 * quality until the base64 payload fits the serverless request budget.
 */
function encodeWithinBudget(
  canvas: HTMLCanvasElement,
  budgetChars: number
): Extract<InvoiceDocumentBlock, { type: 'image' }> | null {
  for (const mediaType of ['image/webp', 'image/jpeg'] as const) {
    for (const quality of IMAGE_QUALITIES) {
      const dataUrl = canvas.toDataURL(mediaType, quality);
      if (!dataUrl.startsWith(`data:${mediaType};`)) continue;
      const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (data.length <= budgetChars) {
        return { type: 'image', mediaType, data };
      }
    }
  }
  return null;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) return null;
  // JPEG has no alpha channel; paint white first so transparent PNGs stay legible.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

async function prepareImage(file: File, budgetChars: number): Promise<PreparedInvoiceUpload> {
  const image = await loadImage(file);
  try {
    const longestEdge = Math.max(image.width, image.height);
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / longestEdge);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = createCanvas(image.width * scale, image.height * scale);
      if (!canvas) break;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const block = encodeWithinBudget(canvas, budgetChars);
      if (block) return { documentBlocks: [block], compressed: true };

      scale *= 0.75;
    }
  } finally {
    releaseImage(image);
  }

  throw new Error('This image is too detailed to compress below the upload limit. Try a smaller photo or a PDF.');
}

function pageText(items: Array<{ str?: string }>): string {
  return items
    .map((item) => (typeof item.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function preparePdf(
  file: File,
  budgetChars: number
): Promise<PreparedInvoiceUpload> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  try {
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const texts: string[] = [];
    const imagePages: number[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = pageText(content.items as Array<{ str?: string }>);
      texts.push(text);
      if (text.length < MIN_TEXT_CHARS) imagePages.push(pageNumber);
    }

    const textBlock: InvoiceDocumentBlock | null = texts.some(Boolean)
      ? {
          type: 'text',
          text: texts
            .map((text, index) => (text ? `--- Page ${index + 1} ---\n${text}` : ''))
            .filter(Boolean)
            .join('\n\n')
            .slice(0, MAX_TEXT_CHARS),
        }
      : null;

    // Text-based PDFs need no image at all — just a few KB of extracted text.
    if (!imagePages.length) {
      return {
        documentBlocks: textBlock ? [textBlock] : [],
        compressed: true,
      };
    }

    const imageBudget = Math.max(
      120_000,
      Math.floor((budgetChars - (textBlock?.text.length || 0)) / imagePages.length)
    );
    const blocks: InvoiceDocumentBlock[] = [];

    for (const pageNumber of imagePages) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = createCanvas(viewport.width, viewport.height);
      if (!canvas) continue;
      const context = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const block = encodeWithinBudget(canvas, imageBudget);
      if (block) blocks.push(block);
    }

    if (textBlock) blocks.unshift(textBlock);
    if (!blocks.length) {
      throw new Error('This PDF could not be compressed enough to upload. Try a smaller file.');
    }

    return { documentBlocks: blocks, compressed: true };
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Converts an uploaded invoice into small Anthropic-ready content blocks.
 * Images are downscaled/re-encoded and PDFs are either extracted as text or
 * rendered as compressed page images, keeping every request below the ~4.5 MB
 * serverless body limit without sending the original base64 file.
 */
export async function prepareInvoiceUpload(file: File): Promise<PreparedInvoiceUpload> {
  const type = file.type.toLowerCase();

  if (type.startsWith('image/')) {
    return prepareImage(file, MAX_INVOICE_FILE_BYTES);
  }

  if (type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return preparePdf(file, MAX_INVOICE_FILE_BYTES);
  }

  if (type.startsWith('text/') || /\.(csv|txt)$/i.test(file.name)) {
    const text = await file.slice(0, MAX_TEXT_CHARS * 2).text();
    return {
      documentBlocks: [{ type: 'text', text: text.slice(0, MAX_TEXT_CHARS) }],
      compressed: false,
    };
  }

  throw new Error('Unsupported file type. Use a PDF, image, CSV, or TXT invoice.');
}
