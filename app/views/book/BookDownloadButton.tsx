import {useState} from 'react';
import {useRouteLoaderData} from 'react-router';
import {Download, Loader2} from 'lucide-react';
import {downloadBookPdf} from '~/lib/book/pdf-download';
import {resolveContact} from '~/lib/contact';
import type {RootLoader} from '~/root';
import type {PdfShopCollection, PdfShopInfo} from '~/workers/book-pdf';

export function BookDownloadButton({
  className = '',
  compact = false,
  collections = [],
}: {
  className?: string;
  compact?: boolean;
  collections?: PdfShopCollection[];
}) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');
  const [percent, setPercent] = useState(0);

  const shop: PdfShopInfo | undefined = rootData
    ? {
        storeUrl: rootData.publicStoreUrl,
        contact: resolveContact(rootData.shopSettings?.contact),
        collections,
      }
    : undefined;

  const handleClick = () => {
    if (state === 'working') return;
    setState('working');
    setPercent(0);
    downloadBookPdf(({done, total}) => {
      setPercent(total > 0 ? Math.round((done / total) * 100) : 0);
    }, shop)
      .then(() => {
        setState('idle');
        setPercent(0);
      })
      .catch(() => setState('error'));
  };

  const label =
    state === 'working'
      ? percent > 0
        ? `Preparing PDF… ${percent}%`
        : 'Preparing PDF…'
      : state === 'error'
        ? 'PDF failed — try again'
        : 'Download the PDF';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'working'}
      className={`tracked inline-flex items-center justify-center gap-3 font-medium transition hover:opacity-90 disabled:cursor-wait disabled:opacity-80 ${
        compact ? 'px-6 py-3 text-sm' : 'px-10 py-4'
      } ${className}`}
      style={{background: 'var(--accent)', color: 'var(--background)'}}
    >
      {state === 'working' ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
      ) : (
        <Download className="h-4 w-4" strokeWidth={1.5} />
      )}
      {label}
    </button>
  );
}
