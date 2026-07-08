/** Shared rich HTML styling for policies, legal pages, and product descriptions. */
export const LEGAL_RICH_HTML_CLASS = [
  'max-w-none text-muted-foreground leading-relaxed',
  // Paragraphs — reset.css zeroes margins globally
  '[&_p+p]:mt-4',
  // Headings
  '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-foreground',
  '[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-display [&_h3]:text-base [&_h3]:text-foreground',
  // Lists — reset.css strips bullets and padding
  '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
  '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_li]:marker:text-muted-foreground',
  // Inline emphasis and links
  '[&_strong]:font-medium [&_strong]:text-foreground',
  '[&_em]:italic',
  '[&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline',
  // Media and tables
  '[&_img]:max-w-full',
  '[&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto',
].join(' ');

export function LegalRichHtml({
  html,
  className = '',
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`${LEGAL_RICH_HTML_CLASS} ${className}`.trim()}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}
