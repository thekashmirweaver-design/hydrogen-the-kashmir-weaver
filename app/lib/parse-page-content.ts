/**
 * Extract JSON payload from a Shopify page body (raw JSON or embedded in HTML).
 */
export function parsePageJson<T>(body: string | null | undefined): T | null {
  if (!body?.trim()) return null;

  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }

  const scriptMatch = trimmed.match(
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (scriptMatch?.[1]) {
    try {
      return JSON.parse(scriptMatch[1].trim()) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export function htmlToParagraphs(html: string): string[] {
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (paragraphs?.length) {
    return paragraphs
      .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? [text] : [];
}

export function estimateReadMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
