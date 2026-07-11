import {xmlEscape} from '~/lib/xml';
import {toAtomDate} from '~/lib/feeds/dates';
import type {FeedChannel, FeedItem} from '~/lib/feeds/types';

function entryXml(item: FeedItem): string {
  const categories = item.categories
    .filter(Boolean)
    .map((cat) => `    <category term="${xmlEscape(cat)}" />`)
    .join('\n');

  const content = item.contentHtml
    ? `\n    <content type="html">${xmlEscape(item.contentHtml)}</content>`
    : '';

  const media = item.image
    ? `\n    <link rel="enclosure" type="image/jpeg" href="${xmlEscape(item.image.url)}" />`
    : '';

  return `  <entry>
    <title>${xmlEscape(item.title)}</title>
    <link rel="alternate" type="text/html" href="${xmlEscape(item.link)}" />
    <id>${xmlEscape(item.id)}</id>
    <published>${toAtomDate(item.publishedAt)}</published>
    <updated>${toAtomDate(item.publishedAt)}</updated>
    <summary>${xmlEscape(item.summary)}</summary>
    <author><name>${xmlEscape(item.author)}</name></author>${
      categories ? `\n${categories}` : ''
    }${content}${media}
  </entry>`;
}

export function buildAtomXml(channel: FeedChannel, items: FeedItem[]): string {
  const updated =
    items[0]?.publishedAt != null
      ? toAtomDate(items[0].publishedAt)
      : toAtomDate(new Date().toISOString());

  const entries = items.map(entryXml).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEscape(channel.title)}</title>
  <link rel="alternate" type="text/html" href="${xmlEscape(channel.link)}" />
  <link rel="self" type="application/atom+xml" href="${xmlEscape(channel.selfUrl)}" />
  <id>${xmlEscape(channel.selfUrl)}</id>
  <updated>${updated}</updated>
  <subtitle>${xmlEscape(channel.description)}</subtitle>
${entries}
</feed>
`;
}
