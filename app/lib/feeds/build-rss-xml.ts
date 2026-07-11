import {xmlEscape} from '~/lib/xml';
import {toRfc822} from '~/lib/feeds/dates';
import type {FeedChannel, FeedItem} from '~/lib/feeds/types';

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function itemXml(item: FeedItem): string {
  const categories = item.categories
    .filter(Boolean)
    .map((cat) => `      <category>${xmlEscape(cat)}</category>`)
    .join('\n');

  const media = item.image
    ? `\n      <media:content url="${xmlEscape(item.image.url)}" medium="image" />`
    : '';

  const content = item.contentHtml
    ? `\n      <content:encoded>${cdata(item.contentHtml)}</content:encoded>`
    : '';

  return `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(item.link)}</link>
      <guid isPermaLink="true">${xmlEscape(item.id)}</guid>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <description>${cdata(item.summary)}</description>
      <dc:creator>${xmlEscape(item.author)}</dc:creator>${
        categories ? `\n${categories}` : ''
      }${content}${media}
    </item>`;
}

export function buildRssXml(channel: FeedChannel, items: FeedItem[]): string {
  const lastBuild =
    items[0]?.publishedAt != null
      ? toRfc822(items[0].publishedAt)
      : toRfc822(new Date().toISOString());

  const itemBlocks = items.map(itemXml).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xmlEscape(channel.title)}</title>
    <link>${xmlEscape(channel.link)}</link>
    <description>${xmlEscape(channel.description)}</description>
    <language>${xmlEscape(channel.language ?? 'en')}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${xmlEscape(channel.selfUrl)}" rel="self" type="application/rss+xml" />
${itemBlocks}
  </channel>
</rss>
`;
}
