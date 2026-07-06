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

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

export function formatJournalDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function journalEyebrow(cat: string, minutes: number, date?: string): string {
  const parts = [`${cat} · ${minutes} min read`];
  if (date) parts.push(formatJournalDate(date));
  return parts.join(' · ');
}
