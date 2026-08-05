import {
  bookMeta,
  bookSectionBody,
  bookSectionLabel,
  bookSections,
  BOOK_PARTS,
} from './registry';
import type {PdfBookRequest, PdfShopInfo} from '../../workers/book-pdf';

export type BookPdfProgress = {done: number; total: number};

/**
 * Builds the full book PDF in a web worker and downloads it.
 * `onProgress` receives {done, total} block counts as the layout runs.
 * `shop` drives an optional final lead page (collections + contact).
 */
export function downloadBookPdf(
  onProgress?: (progress: BookPdfProgress) => void,
  shop?: PdfShopInfo,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Inline `new URL()` so Vite compiles the worker instead of emitting
    // the raw source as an asset.
    const worker = new Worker(
      new URL('../../workers/book-pdf.ts', import.meta.url),
      {type: 'module'},
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('PDF generation timed out.'));
    }, 120_000);

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'progress') {
        onProgress?.({done: message.done, total: message.total});
        return;
      }
      if (message?.type === 'error') {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(message.message ?? 'PDF generation failed.'));
        return;
      }
      if (message?.type === 'result' && message.bytes) {
        clearTimeout(timeout);
        worker.terminate();
        const blob = new Blob([message.bytes], {type: 'application/pdf'});
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'the-kashmir-weaver-research-handbook.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        resolve();
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(error.message ?? 'PDF generation failed.'));
    };

    const groupedSlugs = new Set(BOOK_PARTS.flatMap((part) => part.sectionSlugs));
    const ungrouped = bookSections.filter((section) => !groupedSlugs.has(section.slug));
    const parts = [
      ...(ungrouped.length > 0
        ? [{label: 'Front Matter', title: 'Preface', slugs: ungrouped.map((s) => s.slug)}]
        : []),
      ...BOOK_PARTS.map((part) => ({
        label: part.label,
        title: part.title,
        slugs: part.sectionSlugs,
      })),
    ];
    const request: PdfBookRequest = {
      type: 'build',
      book: bookMeta(),
      sections: bookSections.map((section) => ({
        slug: section.slug,
        kind: section.kind,
        label: bookSectionLabel(section),
        title: section.title,
        subtitle: section.subtitle,
        body: bookSectionBody(section.slug),
      })),
      parts,
    };
    worker.postMessage(request);
  });
}
