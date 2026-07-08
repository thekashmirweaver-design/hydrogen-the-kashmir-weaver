/** Editorial rich HTML for journal articles (Shopify blog body). */
export function JournalRichHtml({
  html,
  className = '',
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`journal-article-body ${className}`.trim()}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}
