/** Shared prose styling for Shopify policy and legal page HTML bodies. */
export const LEGAL_RICH_HTML_CLASS =
  'prose prose-invert max-w-none text-muted-foreground leading-relaxed [&_a]:text-accent [&_h2]:font-display [&_h2]:mt-12 [&_h2]:text-foreground [&_h2]:text-2xl [&_h3]:font-display [&_h3]:text-foreground [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto';

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
