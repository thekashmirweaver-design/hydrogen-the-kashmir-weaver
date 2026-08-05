/**
 * Minimal markdown parser for the book sections. Covers exactly what the
 * extraction script emits: `##`/`###` headings, paragraphs, `-`/`*`/ordered
 * lists, blockquotes, thematic breaks (`---`), and pipe tables. Pure
 * functions with no DOM, so the PDF web worker can share this module.
 */

export type BookBlock =
  | {type: 'hr'}
  | {type: 'heading'; text: string}
  | {type: 'paragraph'; text: string}
  | {type: 'list'; ordered: boolean; items: string[]}
  | {type: 'quote'; text: string}
  | {type: 'table'; headers: string[]; rows: string[][]};

const BOLD_ITALIC = /\*\*\*([^*]+)\*\*\*/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /\*([^*]+)\*/g;

/** Convert `**bold**` / `*italic*` inline markup to HTML. */
export function inlineToHtml(text: string): string {
  return text
    .replace(BOLD_ITALIC, '<strong><em>$1</em></strong>')
    .replace(BOLD, '<strong>$1</strong>')
    .replace(ITALIC, '<em>$1</em>');
}

/** Strip inline markup (for plain-text rendering, e.g. the PDF). */
export function inlineToPlain(text: string): string {
  return text.replace(BOLD_ITALIC, '$1').replace(BOLD, '$1').replace(ITALIC, '$1');
}

function isTableRow(t: string): boolean {
  return t.startsWith('|') && t.endsWith('|');
}

function splitCells(row: string): string[] {
  return row
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
}

export function parseBookMarkdown(md: string): BookBlock[] {
  const lines = md.split('\n');
  const blocks: BookBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({type: 'paragraph', text: paragraph.join('\n')});
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (!t) {
      flushParagraph();
      continue;
    }

    if (/^-{3,}$/.test(t)) {
      flushParagraph();
      blocks.push({type: 'hr'});
      continue;
    }

    const heading = t.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push({type: 'heading', text: heading[2]});
      continue;
    }

    const quote = t.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({type: 'quote', text: quote[1]});
      continue;
    }

    const ordered = t.match(/^(\d+)[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      const items: string[] = [ordered[2]];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+[.)]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({type: 'list', ordered: true, items});
      i--;
      continue;
    }

    const bullet = t.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      const items: string[] = [bullet[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*•]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({type: 'list', ordered: false, items});
      i--;
      continue;
    }

    if (isTableRow(t)) {
      flushParagraph();
      const rows = [splitCells(t)];
      i++;
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const cells = splitCells(lines[i].trim());
        if (cells.some((c) => /^[-:]+$/.test(c))) {
          i++;
          continue;
        }
        rows.push(cells);
        i++;
      }
      blocks.push({
        type: 'table',
        headers: rows[0] ?? [],
        rows: rows.slice(1),
      });
      i--;
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * Render blocks as HTML. When `skipFirstHeading` matches the very first
 * heading block (the extraction leaves the chapter title inline), it is
 * dropped so the view's own <h1> isn't duplicated.
 */
export function blocksToHtml(
  blocks: BookBlock[],
  skipFirstHeading?: string,
): string {
  let skipped = false;
  const out: string[] = [];

  for (const block of blocks) {
    if (
      !skipped &&
      block.type === 'heading' &&
      skipFirstHeading &&
      block.text.trim() === skipFirstHeading.trim()
    ) {
      skipped = true;
      continue;
    }

    switch (block.type) {
      case 'hr':
        out.push('<hr />');
        break;
      case 'heading':
        out.push(`<h2>${inlineToHtml(block.text)}</h2>`);
        break;
      case 'paragraph':
        out.push(`<p>${inlineToHtml(block.text)}</p>`);
        break;
      case 'quote':
        out.push(`<blockquote><p>${inlineToHtml(block.text)}</p></blockquote>`);
        break;
      case 'list':
        if (block.ordered) {
          out.push(
            `<ol>${block.items.map((it) => `<li>${inlineToHtml(it)}</li>`).join('')}</ol>`,
          );
        } else {
          out.push(
            `<ul>${block.items.map((it) => `<li>${inlineToHtml(it)}</li>`).join('')}</ul>`,
          );
        }
        break;
      case 'table':
        if (block.headers.length === 0 && block.rows.length === 0) break;
        out.push('<table>');
        if (block.headers.length > 0) {
          out.push(
            `<thead><tr>${block.headers
              .map((h) => `<th>${inlineToHtml(h)}</th>`)
              .join('')}</tr></thead>`,
          );
        }
        out.push(
          `<tbody>${block.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((c) => `<td>${inlineToHtml(c)}</td>`)
                  .join('')}</tr>`,
            )
            .join('')}</tbody>`,
        );
        out.push('</table>');
        break;
    }
  }

  return out.join('\n');
}
