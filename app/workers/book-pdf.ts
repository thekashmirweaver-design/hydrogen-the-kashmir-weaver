/**
 * Book PDF builder — runs in a web worker. Receives the full book as
 * markdown, lays it out with pdf-lib, and returns a PDF ArrayBuffer.
 *
 * Design follows the repo's light theme (app/styles/theme.css): warm
 * aged-ivory paper, walnut ink, antique-gold accents. Every page carries
 * three diagonal "THE KASHMIR WEAVER" watermarks.
 *
 * Navigation is fully wired up: the contents pages show page numbers with
 * dotted leaders, every entry is a clickable link to its section, and the
 * PDF ships a real document outline (bookmarks) so readers can jump
 * straight to any part or chapter from their PDF software.
 */
/// <reference lib="webworker" />
import {
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';
import {
  inlineToPlain,
  parseBookMarkdown,
  type BookBlock,
} from '../lib/book/markdown';
import {
  contactMailtoHref,
  contactWhatsappHref,
  WHATSAPP_MESSAGE,
  type ContactInfo,
} from '../lib/contact';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 72;
const MARGIN_Y = 72;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BODY_FONT_SIZE = 10.5;
const BODY_LEADING = 16;

/** Light theme — warm aged-ivory paper, walnut ink, antique gold. */
const THEME = {
  paper: rgb(246 / 255, 241 / 255, 231 / 255), // #f6f1e7 aged-paper ivory
  sheet: rgb(239 / 255, 231 / 255, 214 / 255), // #efe7d6 cream page-sheet
  sand: rgb(230 / 255, 220 / 255, 197 / 255), // #e6dcc5 warm sand
  ink: rgb(42 / 255, 34 / 255, 26 / 255), // #2a221a walnut ink
  muted: rgb(122 / 255, 108 / 255, 86 / 255), // #7a6c56 dusty taupe
  gold: rgb(133 / 255, 101 / 255, 49 / 255), // #856531 antique gold
  goldSoft: rgb(176 / 255, 138 / 255, 82 / 255), // #b08a52 softened gold
};

function sanitize(text: string): string {
  return text.replace(/\u2212/g, '-').replace(/\u2e3b/g, '—');
}

export interface PdfBookSection {
  slug: string;
  kind: string;
  label: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface PdfBookPart {
  label: string;
  title: string;
  slugs: string[];
}

export interface PdfShopCollection {
  handle: string;
  name: string;
}

/** Lead-generation info for the final page: shop + contact the atelier. */
export interface PdfShopInfo {
  storeUrl: string;
  contact: ContactInfo;
  collections: PdfShopCollection[];
}

export interface PdfBookRequest {
  type: 'build';
  book: {title: string; subtitle: string; edition: string};
  sections: PdfBookSection[];
  parts?: PdfBookPart[];
  /** When present, draws a final "shop by collection / contact" page. */
  shop?: PdfShopInfo;
}

interface TocEntry {
  part: boolean;
  text: string;
  /** 1-based page number; 0 when the entry has no page of its own. */
  pageIndex: number;
}

interface TocLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pageIndex: number;
}

interface TocLinkPage {
  page: PDFPage;
  links: TocLink[];
}

/** External-link rectangle and destination URL for the lead page. */
interface UriLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  uri: string;
}

type PdfFonts = {
  body: PDFFont;
  bodyItalic: PDFFont;
  bold: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
};

class PdfLayout {
  private page!: PDFPage;
  private y = 0;
  private pageNumber = 0;
  /** 1-based start page of each section drawn, in draw order. */
  readonly sectionStartPages: number[] = [];

  constructor(
    private doc: PDFDocument,
    private fonts: PdfFonts,
  ) {}

  newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN_Y;
    this.drawPageBackground();
    this.drawWatermark();
    this.drawRunningHeader();
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN_Y) this.newPage();
  }

  private drawPageBackground() {
    const {page} = this;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: THEME.paper,
    });
  }

  /** Three diagonal "THE KASHMIR WEAVER" bands per page. */
  private drawWatermark() {
    const {page} = this;
    const text = 'THE KASHMIR WEAVER';
    const font = this.fonts.sansBold;
    const size = 38;
    const width = font.widthOfTextAtSize(text, size);
    for (const y of [
      PAGE_HEIGHT * 0.24,
      PAGE_HEIGHT * 0.5,
      PAGE_HEIGHT * 0.76,
    ]) {
      page.drawText(text, {
        x: (PAGE_WIDTH - width) / 2 - size * 0.8,
        y,
        size,
        font,
        color: THEME.goldSoft,
        opacity: 0.1,
        rotate: degrees(-30),
      });
    }
  }

  private drawRunningHeader() {
    const {page} = this;
    const title = 'THE KASHMIR WEAVER — RESEARCH HANDBOOK';
    const font = this.fonts.sans;
    const size = 7;
    const width = this.trackedWidth(title, font, size, 1.2);
    this.drawTracked(
      title,
      (PAGE_WIDTH - width) / 2,
      PAGE_HEIGHT - 46,
      size,
      font,
      1.2,
      THEME.muted,
    );
    page.drawLine({
      start: {x: MARGIN_X, y: PAGE_HEIGHT - 54},
      end: {x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 54},
      thickness: 0.5,
      color: THEME.goldSoft,
      opacity: 0.55,
    });
    const footer = `— ${this.pageNumber} —`;
    page.drawText(footer, {
      x: (PAGE_WIDTH - this.fonts.body.widthOfTextAtSize(footer, 9)) / 2,
      y: 42,
      size: 9,
      font: this.fonts.body,
      color: THEME.gold,
    });
  }

  private trackedWidth(
    text: string,
    font: PDFFont,
    size: number,
    spacing: number,
  ): number {
    return font.widthOfTextAtSize(text, size) + spacing * (text.length - 1);
  }

  private drawTracked(
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    spacing: number,
    color: ReturnType<typeof rgb>,
  ) {
    let cursor = x;
    for (const char of text) {
      this.page.drawText(char, {x: cursor, y, size, font, color});
      cursor += font.widthOfTextAtSize(char, size) + spacing;
    }
  }

  private wrap(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
  ): string[] {
    const words = sanitize(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private drawLines(
    lines: string[],
    x: number,
    font: PDFFont,
    size: number,
    leading: number,
    options: {indent?: number; color?: ReturnType<typeof rgb>} = {},
  ) {
    for (const line of lines) {
      this.ensureSpace(leading);
      this.page.drawText(line, {
        x: x + (options.indent ?? 0),
        y: this.y,
        size,
        font,
        color: options.color ?? THEME.ink,
      });
      this.y -= leading;
    }
  }

  private space(px: number) {
    this.y -= px;
  }

  private drawHr() {
    this.space(6);
    this.ensureSpace(16);
    const y = this.y;
    this.page.drawLine({
      start: {x: MARGIN_X, y},
      end: {x: PAGE_WIDTH - MARGIN_X, y},
      thickness: 0.6,
      color: THEME.gold,
      opacity: 0.5,
    });
    this.y = y - 14;
  }

  private drawHeading(text: string) {
    this.space(16);
    this.ensureSpace(30);
    const lines = this.wrap(text, this.fonts.bold, 13, BODY_WIDTH - 40);
    this.drawLines(lines, MARGIN_X, this.fonts.bold, 13, 19);
    this.y -= 4;
  }

  private drawParagraph(text: string) {
    const font = this.fonts.body;
    const lines = this.wrap(text, font, BODY_FONT_SIZE, BODY_WIDTH);
    this.drawLines(lines, MARGIN_X, font, BODY_FONT_SIZE, BODY_LEADING);
    this.space(8);
  }

  private drawList(ordered: boolean, items: string[]) {
    const font = this.fonts.body;
    const bulletWidth = font.widthOfTextAtSize('•  ', BODY_FONT_SIZE);
    const numberWidth = font.widthOfTextAtSize('00.  ', BODY_FONT_SIZE);
    const indent = ordered ? numberWidth : bulletWidth;
    for (let k = 0; k < items.length; k++) {
      const marker = ordered ? `${k + 1}.` : '•';
      const prefix = `${marker} `;
      const markerWidth = font.widthOfTextAtSize(prefix, BODY_FONT_SIZE);
      const lines = this.wrap(items[k], font, BODY_FONT_SIZE, BODY_WIDTH - indent);
      this.ensureSpace(BODY_LEADING);
      const first = lines[0] ?? '';
      this.page.drawText(prefix, {
        x: MARGIN_X,
        y: this.y,
        size: BODY_FONT_SIZE,
        font,
        color: THEME.ink,
      });
      this.page.drawText(first, {
        x: MARGIN_X + markerWidth,
        y: this.y,
        size: BODY_FONT_SIZE,
        font,
        color: THEME.ink,
      });
      this.y -= BODY_LEADING;
      for (let j = 1; j < lines.length; j++) {
        this.ensureSpace(BODY_LEADING);
        this.page.drawText(lines[j], {
          x: MARGIN_X + markerWidth,
          y: this.y,
          size: BODY_FONT_SIZE,
          font,
          color: THEME.ink,
        });
        this.y -= BODY_LEADING;
      }
    }
    this.space(8);
  }

  private drawQuote(text: string) {
    const font = this.fonts.bodyItalic;
    const lines = this.wrap(text, font, BODY_FONT_SIZE, BODY_WIDTH - 36);
    const yStart = this.y;
    this.drawLines(lines, MARGIN_X + 18, font, BODY_FONT_SIZE, BODY_LEADING, {
      color: THEME.muted,
    });
    this.page.drawLine({
      start: {x: MARGIN_X + 8, y: yStart + 2},
      end: {x: MARGIN_X + 8, y: this.y + 3},
      thickness: 1.5,
      color: THEME.goldSoft,
      opacity: 0.8,
    });
    this.space(8);
  }

  private drawTable(headers: string[], rows: string[][]) {
    const font = this.fonts.body;
    const size = 8.5;
    const leading = 12;
    const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
    const widths = new Array<number>(cols).fill(0);
    const cells = [...(headers.length ? [headers] : []), ...rows];
    for (const row of cells) {
      for (let c = 0; c < cols; c++) {
        const text = row[c] ?? '';
        widths[c] = Math.max(
          widths[c],
          Math.min(font.widthOfTextAtSize(text, size), BODY_WIDTH / 2),
        );
      }
    }
    const total = widths.reduce((n, w) => n + w, 0);
    const scale = Math.min(1, BODY_WIDTH / total);
    const colX: number[] = [];
    let x = MARGIN_X;
    for (const w of widths) {
      colX.push(x);
      x += w * scale + 18;
    }
    const tableWidth = colX[cols - 1] + widths[cols - 1] * scale - MARGIN_X;
    this.space(6);
    for (let r = 0; r < cells.length; r++) {
      this.ensureSpace(leading);
      const rowBottom = this.y - leading + 1;
      if (r === 0) {
        this.page.drawRectangle({
          x: MARGIN_X,
          y: rowBottom,
          width: tableWidth,
          height: leading + 1,
          color: THEME.sand,
          opacity: 0.55,
        });
      } else if (r % 2 === 0) {
        this.page.drawRectangle({
          x: MARGIN_X,
          y: rowBottom,
          width: tableWidth,
          height: leading,
          color: THEME.sheet,
          opacity: 0.5,
        });
      }
      cells[r].forEach((cell, c) => {
        if (c >= cols) return;
        this.page.drawText(sanitize(cell), {
          x: colX[c],
          y: this.y,
          size,
          font: r === 0 ? this.fonts.bold : font,
          color: THEME.ink,
        });
      });
      this.y -= leading;
      if (r === 0) {
        this.y -= 3;
        this.page.drawLine({
          start: {x: MARGIN_X, y: this.y + 1},
          end: {x: colX[cols - 1] + widths[cols - 1] * scale, y: this.y + 1},
          thickness: 0.7,
          color: THEME.gold,
          opacity: 0.7,
        });
      }
    }
    this.space(8);
  }

  renderBlock(block: BookBlock) {
    switch (block.type) {
      case 'hr':
        this.drawHr();
        break;
      case 'heading':
        this.drawHeading(inlineToPlain(block.text));
        break;
      case 'paragraph':
        this.drawParagraph(inlineToPlain(block.text));
        break;
      case 'list':
        this.drawList(block.ordered, block.items.map(inlineToPlain));
        break;
      case 'quote':
        this.drawQuote(inlineToPlain(block.text));
        break;
      case 'table':
        this.drawTable(
          block.headers.map(inlineToPlain),
          block.rows.map((r) => r.map(inlineToPlain)),
        );
        break;
    }
  }

  drawCover(book: PdfBookRequest['book'], sectionCount: number) {
    this.newPage();
    const {page} = this;
    page.drawRectangle({
      x: 26,
      y: 26,
      width: PAGE_WIDTH - 52,
      height: PAGE_HEIGHT - 52,
      borderColor: THEME.gold,
      borderWidth: 0.75,
    });
    page.drawRectangle({
      x: 32,
      y: 32,
      width: PAGE_WIDTH - 64,
      height: PAGE_HEIGHT - 64,
      borderColor: THEME.goldSoft,
      borderWidth: 0.4,
      opacity: 0.6,
    });

    let y = PAGE_HEIGHT * 0.66;
    const eyebrow = 'RESEARCH HANDBOOK';
    const sans = this.fonts.sans;
    const eyebrowWidth = this.trackedWidth(eyebrow, sans, 9.5, 3);
    this.drawTracked(
      eyebrow,
      (PAGE_WIDTH - eyebrowWidth) / 2,
      y,
      9.5,
      sans,
      3,
      THEME.muted,
    );
    y -= 18;
    page.drawLine({
      start: {x: PAGE_WIDTH / 2 - 120, y},
      end: {x: PAGE_WIDTH / 2 + 120, y},
      thickness: 0.6,
      color: THEME.gold,
      opacity: 0.7,
    });
    y -= 22;

    const font = this.fonts.bold;
    const title = book.title.toUpperCase();
    const titleSize = 32;
    const titleLines: string[] = [];
    let current = '';
    for (const word of title.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, titleSize) > BODY_WIDTH) {
        titleLines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) titleLines.push(current);
    for (const line of titleLines) {
      const w = font.widthOfTextAtSize(line, titleSize);
      page.drawText(line, {
        x: (PAGE_WIDTH - w) / 2,
        y,
        size: titleSize,
        font,
        color: THEME.ink,
      });
      y -= 42;
    }
    y -= 10;
    page.drawLine({
      start: {x: PAGE_WIDTH / 2 - 120, y},
      end: {x: PAGE_WIDTH / 2 + 120, y},
      thickness: 0.6,
      color: THEME.gold,
      opacity: 0.7,
    });
    y -= 24;

    const subtitle = book.subtitle;
    const subFont = this.fonts.bodyItalic;
    const subWidth = subFont.widthOfTextAtSize(subtitle, 13);
    page.drawText(subtitle, {
      x: (PAGE_WIDTH - subWidth) / 2,
      y,
      size: 13,
      font: subFont,
      color: THEME.muted,
    });
    y -= 30;

    const edition = `${book.edition.toUpperCase()}  ·  ${sectionCount} SECTIONS`;
    const edFont = this.fonts.sans;
    const edWidth = this.trackedWidth(edition, edFont, 8.5, 1.2);
    this.drawTracked(
      edition,
      (PAGE_WIDTH - edWidth) / 2,
      y,
      8.5,
      edFont,
      1.2,
      THEME.gold,
    );
  }

  drawToc(entries: TocEntry[], showNumbers: boolean): TocLinkPage[] {
    this.newPage();
    this.drawHeading('Contents');
    this.space(10);
    const font = this.fonts.body;
    const numberX = PAGE_WIDTH - MARGIN_X;
    const linkPages: TocLinkPage[] = [];
    let currentLinks: TocLink[] = [];
    let currentPage = this.page;
    const flushIfNeeded = () => {
      if (this.page !== currentPage) {
        if (currentLinks.length) {
          linkPages.push({page: currentPage, links: currentLinks});
        }
        currentLinks = [];
        currentPage = this.page;
      }
    };

    for (const entry of entries) {
      const size = entry.part ? 11 : 10;
      const entryFont = entry.part ? this.fonts.bold : font;
      const color = entry.part ? THEME.gold : THEME.ink;
      const lines = this.wrap(entry.text, entryFont, size, BODY_WIDTH - 60);
      this.space(entry.part ? 10 : 0);
      this.ensureSpace(16);
      flushIfNeeded();
      const x = entry.part ? MARGIN_X : MARGIN_X + 18;
      const y = this.y;
      if (entry.part) {
        this.drawTracked(lines[0], x, y, size, entryFont, 0.6, color);
      } else {
        this.page.drawText(lines[0], {x, y, size, font: entryFont, color});
      }
      if (showNumbers && entry.pageIndex > 0) {
        const titleWidth = entryFont.widthOfTextAtSize(lines[0], size);
        const number = String(entry.pageIndex);
        const numberWidth = font.widthOfTextAtSize(number, 9);
        const numberX0 = numberX - numberWidth;
        let dx = x + titleWidth + 10;
        while (dx < numberX0 - 10) {
          this.page.drawText('.', {
            x: dx,
            y: y + 1,
            size: 8.5,
            font: this.fonts.body,
            color: THEME.muted,
          });
          dx += 6.5;
        }
        this.page.drawText(number, {
          x: numberX0,
          y: y + 1,
          size: 9,
          font: this.fonts.body,
          color: THEME.gold,
        });
        currentLinks.push({
          x1: x,
          y1: y - 5,
          x2: numberX,
          y2: y + 10,
          pageIndex: entry.pageIndex,
        });
      }
      this.y -= 15;
      for (let j = 1; j < lines.length; j++) {
        this.ensureSpace(15);
        flushIfNeeded();
        this.page.drawText(lines[j], {
          x: x + 16,
          y: this.y,
          size,
          font: entryFont,
          color,
        });
        this.y -= 15;
      }
    }
    if (currentLinks.length) {
      linkPages.push({page: currentPage, links: currentLinks});
    }
    return linkPages;
  }

  drawSection(section: PdfBookSection) {
    // Book convention: each section begins on its own page.
    this.newPage();
    this.sectionStartPages.push(this.pageNumber);
    this.space(26);
    const {page} = this;
    const label = section.label.toUpperCase();
    this.drawTracked(
      label,
      MARGIN_X,
      this.y,
      8.5,
      this.fonts.sans,
      2,
      THEME.gold,
    );
    this.y -= 16;
    this.drawLines(
      this.wrap(section.title, this.fonts.bold, 19, BODY_WIDTH),
      MARGIN_X,
      this.fonts.bold,
      19,
      25,
    );
    const lastBaseline = this.y + 25;
    page.drawLine({
      start: {x: MARGIN_X, y: lastBaseline - 5},
      end: {x: PAGE_WIDTH - MARGIN_X, y: lastBaseline - 5},
      thickness: 0.6,
      color: THEME.gold,
      opacity: 0.65,
    });
    this.y = lastBaseline - 14;
    if (section.subtitle) {
      const subLines = this.wrap(
        section.subtitle,
        this.fonts.bodyItalic,
        12,
        BODY_WIDTH,
      );
      this.drawLines(subLines, MARGIN_X, this.fonts.bodyItalic, 12, 18);
    }
    this.space(12);
    const blocks = parseBookMarkdown(section.body);
    for (const block of blocks) this.renderBlock(block);
  }

  /**
   * Final page — the lead generator. Invites the reader to shop the
   * collections and contact the atelier directly. Every collection and
   * contact line carries a clickable link to the store.
   */
  drawLeadPage(shop: PdfShopInfo): {
    page: PDFPage;
    links: UriLink[];
    pageIndex: number;
  } {
    this.newPage();
    const links: UriLink[] = [];
    this.space(30);

    this.drawTracked(
      'SHOP THE BOOK',
      MARGIN_X,
      this.y,
      8.5,
      this.fonts.sans,
      2,
      THEME.gold,
    );
    this.y -= 16;

    this.drawLines(
      this.wrap('Bring the Story Home', this.fonts.bold, 19, BODY_WIDTH),
      MARGIN_X,
      this.fonts.bold,
      19,
      25,
    );
    const lastBaseline = this.y + 25;
    this.page.drawLine({
      start: {x: MARGIN_X, y: lastBaseline - 5},
      end: {x: PAGE_WIDTH - MARGIN_X, y: lastBaseline - 5},
      thickness: 0.6,
      color: THEME.gold,
      opacity: 0.65,
    });
    this.y = lastBaseline - 14;

    this.drawParagraph(
      'The story you have just read is not history — it is lived by the artisans who weave for The Kashmir Weaver. Continue the journey: choose a collection, commission a piece, or write to the atelier.',
    );

    this.y -= 6;
    this.drawTracked(
      'SHOP BY COLLECTION',
      MARGIN_X,
      this.y,
      8,
      this.fonts.sans,
      1.6,
      THEME.muted,
    );
    this.y -= 16;

    for (const collection of shop.collections) {
      this.ensureSpace(32);
      const blockTop = this.y;
      this.page.drawText('•', {
        x: MARGIN_X,
        y: this.y + 2,
        size: BODY_FONT_SIZE,
        font: this.fonts.body,
        color: THEME.gold,
      });
      const nameLines = this.wrap(
        collection.name,
        this.fonts.bold,
        11,
        BODY_WIDTH - 22,
      );
      this.drawLines(nameLines, MARGIN_X + 14, this.fonts.bold, 11, 15);
      const url = `${shop.storeUrl}/collections/${collection.handle}`;
      const urlLines = this.wrap(url, this.fonts.body, 8.5, BODY_WIDTH - 22);
      this.drawLines(urlLines, MARGIN_X + 14, this.fonts.body, 8.5, 11.5, {
        color: THEME.muted,
      });
      links.push({
        x1: MARGIN_X,
        y1: this.y - 4,
        x2: MARGIN_X + BODY_WIDTH - 22,
        y2: blockTop + 9,
        uri: url,
      });
      this.y -= 8;
    }

    this.drawHr();

    this.drawTracked(
      'CONTACT THE ATELIER',
      MARGIN_X,
      this.y,
      8,
      this.fonts.sans,
      1.6,
      THEME.muted,
    );
    this.y -= 16;

    const rows: Array<[string, string, string | undefined]> = [
      ['EMAIL', shop.contact.email, contactMailtoHref(shop.contact.email)],
      [
        'PHONE / WHATSAPP',
        shop.contact.whatsapp,
        contactWhatsappHref(shop.contact.whatsapp, WHATSAPP_MESSAGE),
      ],
      ['WEBSITE', shop.storeUrl, shop.storeUrl],
    ];
    for (const [label, value, uri] of rows) {
      this.ensureSpace(24);
      this.drawTracked(
        label,
        MARGIN_X,
        this.y,
        7.5,
        this.fonts.sans,
        1.2,
        THEME.gold,
      );
      const valueLines = this.wrap(
        value,
        this.fonts.body,
        10.5,
        BODY_WIDTH - 140,
      );
      const valueTop = this.y;
      this.drawLines(valueLines, MARGIN_X + 140, this.fonts.body, 10.5, 15);
      if (uri) {
        links.push({
          x1: MARGIN_X + 140,
          y1: this.y - 4,
          x2: MARGIN_X + 140 + this.fonts.body.widthOfTextAtSize(valueLines[0], 10.5),
          y2: valueTop + 9,
          uri,
        });
      }
      this.y -= 6;
    }

    this.y -= 10;
    const closing = [
      'Bespoke commissions, wedding trousseaus, and wholesale inquiries are welcome.',
      'Write to us — a weaver answers within a day.',
    ];
    for (const line of closing) {
      this.ensureSpace(17);
      const lines = this.wrap(line, this.fonts.bodyItalic, 11, BODY_WIDTH);
      this.drawLines(lines, MARGIN_X, this.fonts.bodyItalic, 11, 16, {
        color: THEME.muted,
      });
      this.y -= 2;
    }
    return {page: this.page, links, pageIndex: this.pageNumber};
  }
}

async function embedFonts(doc: PDFDocument): Promise<PdfFonts> {
  return {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bodyItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

function buildTocEntries(
  sections: PdfBookSection[],
  parts: PdfBookPart[] | undefined,
  pageIndexBySlug: Map<string, number>,
): TocEntry[] {
  if (!parts?.length) {
    return sections.map((section) => ({
      part: section.kind === 'part',
      text: sanitize(
        section.kind === 'part'
          ? section.title
          : `${section.label} — ${section.title}`,
      ),
      pageIndex: pageIndexBySlug.get(section.slug) ?? 1,
    }));
  }
  const sectionsBySlug = new Map(sections.map((s) => [s.slug, s]));
  const entries: TocEntry[] = [];
  for (const part of parts) {
    const partSlug =
      part.slugs.find((slug) => sectionsBySlug.get(slug)?.kind === 'part') ??
      part.slugs[0];
    entries.push({
      part: true,
      text: sanitize(`${part.label} — ${part.title}`),
      pageIndex: partSlug ? (pageIndexBySlug.get(partSlug) ?? 0) : 0,
    });
    for (const slug of part.slugs) {
      const section = sectionsBySlug.get(slug);
      if (!section || section.kind === 'part') continue;
      entries.push({
        part: false,
        text: sanitize(`${section.label} — ${section.title}`),
        pageIndex: pageIndexBySlug.get(slug) ?? 1,
      });
    }
  }
  return entries;
}

function attachTocLinks(doc: PDFDocument, linkPages: TocLinkPage[]) {
  const context = doc.context;
  const pages = doc.getPages();
  for (const {page, links} of linkPages) {
    const annots = links.map((link) =>
      context.register(
        context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          P: page.ref,
          Rect: [link.x1, link.y1, link.x2, link.y2],
          Border: [0, 0, 0],
          A: {S: 'GoTo', D: [pages[link.pageIndex - 1].ref, 'Fit']},
        }),
      ),
    );
    page.node.set(PDFName.of('Annots'), context.obj(annots));
  }
}

function attachUriLinks(doc: PDFDocument, page: PDFPage, links: UriLink[]) {
  if (links.length === 0) return;
  const context = doc.context;
  const annots = links.map((link) =>
    context.register(
      context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        P: page.ref,
        Rect: [link.x1, link.y1, link.x2, link.y2],
        Border: [0, 0, 0],
        A: {S: 'URI', URI: link.uri},
      }),
    ),
  );
  page.node.set(PDFName.of('Annots'), context.obj(annots));
}

function buildOutline(
  doc: PDFDocument,
  parts: PdfBookPart[] | undefined,
  sections: PdfBookSection[],
  pageIndexBySlug: Map<string, number>,
  leadPageIndex = 0,
) {
  const context = doc.context;
  const pages = doc.getPages();
  const create = (title: string, pageIndex: number) => {
    const dict = context.obj({
      Title: PDFString.of(sanitize(title)),
      Dest: [pages[pageIndex - 1].ref, 'Fit'],
    });
    const ref = context.register(dict);
    return {dict, ref};
  };

  const sectionsBySlug = new Map(sections.map((s) => [s.slug, s]));
  const groups: PdfBookPart[] = parts?.length
    ? parts
    : [{label: '', title: 'The Book', slugs: sections.map((s) => s.slug)}];

  const topNodes: Array<{dict: PDFDict; ref: PDFRef}> = [
    create('Cover', 1),
    create('Contents', 2),
  ];
  for (const part of groups) {
    const partSlug = part.slugs.find(
      (slug) => sectionsBySlug.get(slug)?.kind === 'part',
    );
    const partTitle = part.label ? `${part.label} — ${part.title}` : part.title;
    const partNode = create(
      partTitle,
      pageIndexBySlug.get(partSlug ?? part.slugs[0] ?? '') ?? 1,
    );
    const childNodes = part.slugs.flatMap((slug) => {
      const section = sectionsBySlug.get(slug);
      if (!section || section.kind === 'part') return [];
      return [create(`${section.label} — ${section.title}`, pageIndexBySlug.get(slug) ?? 1)];
    });
    for (const child of childNodes) {
      child.dict.set(PDFName.of('Parent'), partNode.ref);
    }
    childNodes.forEach((child, i) => {
      if (i > 0) child.dict.set(PDFName.of('Prev'), childNodes[i - 1].ref);
      if (i < childNodes.length - 1) {
        child.dict.set(PDFName.of('Next'), childNodes[i + 1].ref);
      }
    });
    partNode.dict.set(PDFName.of('Count'), context.obj(childNodes.length));
    if (childNodes.length > 0) {
      partNode.dict.set(PDFName.of('First'), childNodes[0].ref);
      partNode.dict.set(
        PDFName.of('Last'),
        childNodes[childNodes.length - 1].ref,
      );
    }
    topNodes.push(partNode);
  }
  if (leadPageIndex > 0) {
    topNodes.push(create('Shop the Book', leadPageIndex));
  }
  topNodes.forEach((node, i) => {
    if (i > 0) node.dict.set(PDFName.of('Prev'), topNodes[i - 1].ref);
    if (i < topNodes.length - 1) {
      node.dict.set(PDFName.of('Next'), topNodes[i + 1].ref);
    }
  });

  const root = context.obj({
    Type: 'Outlines',
    First: topNodes[0].ref,
    Last: topNodes[topNodes.length - 1].ref,
    Count: topNodes.length,
  });
  doc.catalog.set(PDFName.of('Outlines'), context.register(root));
}

export async function buildBookPdf(
  book: PdfBookRequest['book'],
  sections: PdfBookSection[],
  onProgress: (done: number, total: number) => void,
  parts?: PdfBookPart[],
  shop?: PdfShopInfo,
): Promise<ArrayBuffer> {
  const pageIndexBySlug = new Map<string, number>();

  // Pass 1 — layout once to learn where each section starts. Section pages
  // are deterministic (every section begins on a fresh page), so pass 2
  // reproduces them exactly.
  {
    const doc = await PDFDocument.create();
    const fonts = await embedFonts(doc);
    const layout = new PdfLayout(doc, fonts);
    layout.drawCover(book, sections.length);
    layout.drawToc(buildTocEntries(sections, parts, pageIndexBySlug), false);
    let total = 0;
    for (const section of sections) {
      total += parseBookMarkdown(section.body).length;
    }
    let done = 0;
    for (let i = 0; i < sections.length; i++) {
      layout.drawSection(sections[i]);
      pageIndexBySlug.set(sections[i].slug, layout.sectionStartPages[i]);
      done += parseBookMarkdown(sections[i].body).length;
      onProgress(done, total);
    }
  }

  // Pass 2 — the real document: contents with page numbers, clickable
  // entries, and a full document outline.
  const doc = await PDFDocument.create();
  const fonts = await embedFonts(doc);
  const layout = new PdfLayout(doc, fonts);
  layout.drawCover(book, sections.length);
  const tocLinks = layout.drawToc(
    buildTocEntries(sections, parts, pageIndexBySlug),
    true,
  );
  for (const section of sections) {
    layout.drawSection(section);
  }

  let leadPage: PDFPage | undefined;
  let leadLinks: UriLink[] = [];
  let leadPageIndex = 0;
  if (shop) {
    const result = layout.drawLeadPage(shop);
    leadPage = result.page;
    leadLinks = result.links;
    leadPageIndex = result.pageIndex;
  }

  attachTocLinks(doc, tocLinks);
  if (leadPage) attachUriLinks(doc, leadPage, leadLinks);
  buildOutline(doc, parts, sections, pageIndexBySlug, leadPageIndex);

  const bytes = await doc.save();
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

self.onmessage = async (event: MessageEvent<PdfBookRequest>) => {
  const data = event.data;
  if (data?.type !== 'build') return;
  try {
    const bytes = await buildBookPdf(
      data.book,
      data.sections,
      (done, total) => {
        self.postMessage({type: 'progress', done, total});
      },
      data.parts,
      data.shop,
    );
    self.postMessage({type: 'result', bytes}, [bytes]);
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
