import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface InvoiceDocumentViewerProps {
  documentUrl: string | null;
  isPdf: boolean;
  isImage: boolean;
  isText: boolean;
  documentText: string | null;
}

const MIN_SCALE = 0.75;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export const InvoiceDocumentViewer: React.FC<InvoiceDocumentViewerProps> = ({
  documentUrl,
  isPdf,
  isImage,
  isText,
  documentText,
}) => {
  const [scale, setScale] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [renderError, setRenderError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    if (!documentUrl || !isPdf) {
      setPdfDoc(null);
      setPageNumber(1);
      return;
    }

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    setRenderError(false);
    setPdfDoc(null);
    setPageNumber(1);

    loadingTask = pdfjsLib.getDocument({ url: documentUrl });
    loadingTask.promise
      .then((doc) => {
        if (!cancelled) {
          setPdfDoc(doc);
          setPageNumber(1);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Unable to open PDF document', error);
          setRenderError(true);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
    };
  }, [documentUrl, isPdf]);

  useEffect(() => {
    if (!isPdf || !pdfDoc) return;

    let cancelled = false;
    renderTaskRef.current?.cancel();

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        renderTaskRef.current = renderTask;

        renderTask.promise.catch((error) => {
          if (!cancelled && error?.name !== 'RenderingCancelledException') {
            console.error('Unable to render PDF page', error);
            setRenderError(true);
          }
        });
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Unable to load PDF page', error);
          setRenderError(true);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [isPdf, pdfDoc, pageNumber, scale]);

  const zoomIn = () => setScale((current) => Math.min(MAX_SCALE, Number((current + SCALE_STEP).toFixed(2))));
  const zoomOut = () => setScale((current) => Math.max(MIN_SCALE, Number((current - SCALE_STEP).toFixed(2))));
  const nextPage = () => {
    if (pdfDoc) setPageNumber((current) => Math.min(current + 1, pdfDoc.numPages));
  };

  return (
    <div className="document-canvas relative flex-1 min-h-0 overflow-auto bg-slate-100/70 dark:bg-[#08090F]">
      <div className="min-h-full w-full flex justify-center p-3">
        {isPdf && (
          <>
            {pdfDoc && !renderError ? (
              <canvas
                ref={canvasRef}
                className="h-fit w-fit max-w-none bg-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] dark:shadow-black/50"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-zinc-500 dark:text-zinc-400">
                {renderError ? 'Unable to display this PDF.' : 'Loading document...'}
              </div>
            )}
          </>
        )}

        {isImage && documentUrl && (
          <img
            src={documentUrl}
            alt="Uploaded invoice document"
            draggable={false}
            className="h-auto max-w-none select-none object-contain bg-white shadow-[0_8px_30px_rgba(0,0,0,0.14)] dark:shadow-black/50"
            style={{ width: `${scale * 100}%` }}
          />
        )}

        {isText && (
          <pre
            className="w-full max-w-none overflow-visible whitespace-pre-wrap p-4 font-mono leading-relaxed text-zinc-700 dark:text-zinc-300"
            style={{ fontSize: `${11 * scale}px` }}
          >
            {documentText || 'Reading text document...'}
          </pre>
        )}

        {!documentUrl && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
            <span className="text-xs font-medium">No document available</span>
          </div>
        )}
      </div>

      {/* Only allowed document controls: zoom out, zoom in, next page (PDF only). */}
      {documentUrl && (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0C0D18]/95 p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1 text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {isPdf && (
            <>
              <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-white/10" />
              <span className="px-1 text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                {pageNumber}/{pdfDoc?.numPages || 1}
              </span>
              <button
                type="button"
                onClick={nextPage}
                disabled={!pdfDoc || pageNumber >= pdfDoc.numPages}
                aria-label="Next page"
                title="Next page"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
