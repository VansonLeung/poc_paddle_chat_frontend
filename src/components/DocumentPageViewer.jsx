import React from 'react';
import { loadPdfModule } from '@/lib/pdfLoader';

const DocumentPageViewer = ({
  pageInfos = [],
  fallbackImage,
  showOverlay = false,
  maxHeight = '480px',
  pdfSource,
  isPdfDocument = false,
}) => {
  const pages = pageInfos.length
    ? pageInfos
    : (fallbackImage
        ? [{ pageIndex: 0, boxes: [], pageWidth: 1, pageHeight: 1, imageSrc: fallbackImage }]
        : []);

  const [activePage, setActivePage] = React.useState(0);
  const [imageMetrics, setImageMetrics] = React.useState({
    naturalWidth: null,
    naturalHeight: null,
    renderedWidth: null,
    renderedHeight: null,
  });
  const [renderedPdfPages, setRenderedPdfPages] = React.useState({});
  const imgRef = React.useRef(null);
  const pdfDocRef = React.useRef(null);
  const pdfSrcRef = React.useRef(null);
  const pageCount = pages.length;

  React.useEffect(() => {
    setActivePage(0);
  }, [pageCount]);

  React.useEffect(() => {
    setRenderedPdfPages({});
    if (pdfDocRef.current) {
      pdfDocRef.current.destroy();
      pdfDocRef.current = null;
      pdfSrcRef.current = null;
    }
  }, [pdfSource]);

  const handleImageLoad = (event) => {
    const target = event.currentTarget;
    setImageMetrics({
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight,
      renderedWidth: target.getBoundingClientRect().width,
      renderedHeight: target.getBoundingClientRect().height,
    });
  };

  const updateRenderedMetrics = React.useCallback(() => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setImageMetrics((prev) => ({
      ...prev,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
    }));
  }, []);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !imgRef.current) return;
    const observer = new ResizeObserver(() => updateRenderedMetrics());
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [updateRenderedMetrics]);

  const ensurePdfDocument = React.useCallback(async () => {
    if (!pdfSource || !isPdfDocument) return null;
    if (pdfDocRef.current && pdfSrcRef.current === pdfSource) {
      return pdfDocRef.current;
    }
    if (pdfDocRef.current) {
      pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }

    const { getDocument } = await loadPdfModule();
    const loadingTask = getDocument(pdfSource);
    const pdf = await loadingTask.promise;
    pdfDocRef.current = pdf;
    pdfSrcRef.current = pdfSource;
    return pdf;
  }, [pdfSource, isPdfDocument]);

  if (!pageCount) {
    return <p className="text-sm text-muted-foreground">No images are available for this document.</p>;
  }

  const safeActivePage = Math.min(activePage, pageCount - 1);
  const currentPage = pages[safeActivePage];
  const pageKey = currentPage?.pageIndex ?? safeActivePage;
  const renderedPdfImage = renderedPdfPages[pageKey];
  const imageSrc = currentPage?.imageSrc || renderedPdfImage || fallbackImage;

  if (!imageSrc) {
    return <p className="text-sm text-muted-foreground">No image found for the selected page.</p>;
  }

  const hasBoxes = Array.isArray(currentPage?.boxes) && currentPage.boxes.length > 0;
  const widthRef = imageMetrics.naturalWidth;
  const heightRef = imageMetrics.naturalHeight;

  console.log("XXX", currentPage?.pageWidth, imageMetrics.naturalWidth, imageMetrics.renderedWidth, widthRef);
  console.log("ZZZ", widthRef, heightRef);

  const pdfNeedsRender = isPdfDocument && pdfSource && !currentPage?.imageSrc && !renderedPdfImage;

  React.useEffect(() => {
    if (!pdfNeedsRender) return;
    let cancelled = false;

    (async () => {
      try {
        const pdf = await ensurePdfDocument();
        if (!pdf) return;
        const desiredPageIndex = typeof currentPage?.pageIndex === 'number'
          ? currentPage.pageIndex
          : safeActivePage;
        const pageNumber = Math.min(Math.max(desiredPageIndex + 1, 1), pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) {
          const dataUrl = canvas.toDataURL('image/png');
          setRenderedPdfPages((prev) => ({ ...prev, [pageKey]: dataUrl }));
        }
      } catch (error) {
        console.error('Failed to render PDF page', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfNeedsRender, ensurePdfDocument, currentPage?.pageIndex, safeActivePage, pageKey]);

  return (
    <div className="w-full space-y-4">
      {pageCount > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Page</span>
          <select
            className="border rounded-md px-2 py-1 text-sm bg-background"
            value={safeActivePage}
            onChange={(event) => setActivePage(Number(event.target.value))}
          >
            {pages.map((page, idx) => (
              <option key={`${page.pageIndex ?? idx}`} value={idx}>
                {(page.pageIndex ?? idx) + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-auto rounded-lg border bg-muted" style={{ maxHeight }}>
        <div className="relative w-full">
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Document page"
            className="block w-full h-auto object-contain"
            onLoad={handleImageLoad}
          />
          {showOverlay && hasBoxes && (
            <div className="absolute inset-0 pointer-events-none">
              {currentPage.boxes.map((block, idx) => {
                const bbox = block?.block_bbox;
                if (!Array.isArray(bbox) || bbox.length !== 4) return null;
                const [x1, y1, x2, y2] = bbox;
                const left = (x1 / widthRef) * 100;
                const top = (y1 / heightRef) * 100;
                const width = ((x2 - x1) / widthRef) * 100;
                const height = ((y2 - y1) / heightRef) * 100;

                console.log("YYY", widthRef, heightRef, x1, y1, x2, y2, left, top, width, height);

                return (
                  <div
                    key={`${block.block_id ?? idx}-${idx}`}
                    className="absolute border-2 border-primary/80 bg-transparent"
                    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                  >
                    <span className="absolute -top-4 left-0 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                      {block.block_label || 'block'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showOverlay && !hasBoxes && (
        <p className="text-xs text-muted-foreground">No annotations available for this page.</p>
      )}
    </div>
  );
};

export default DocumentPageViewer;
