const FEED_CACHE = `public, max-age=${60 * 60}`;

export function rssResponse(xml: string, init?: {status?: number}): Response {
  return new Response(xml, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': FEED_CACHE,
    },
  });
}

export function atomResponse(xml: string, init?: {status?: number}): Response {
  return new Response(xml, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': FEED_CACHE,
    },
  });
}
