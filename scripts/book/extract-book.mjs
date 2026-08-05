/**
 * Extracts the "Kashmir Weaver Research Handbook" manuscript from the
 * WhatsApp chat export and emits one Markdown file per book section into
 * `app/content/book/`.
 *
 * Usage:
 *   node scripts/book/extract-book.mjs [path-to-chat.txt]
 *
 * The chat export is line-oriented: messages begin with
 * `DD/MM/YY, HH:MM - Name: <first line>` and continue until the next
 * timestamp. The manuscript itself starts at the message that opens with
 * "The Kashmir Weaver Research Handbook" and runs to the end of the file.
 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(ROOT, 'app', 'content', 'book');

const DEFAULT_CHAT =
  process.env.CHAT_FILE ??
  join(process.env.HOME ?? '', 'Downloads', 'WhatsApp Chat with Brother Ji.txt');

const MESSAGE_RE = /^\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2} - [^:]+: (.*)$/;
const MESSAGE_HEADER_RE = /^\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2} - [^:]+: /;

const SECTION_RE = new RegExp(
  [
    '^Preface$',
    '^Chapter (\\d+)$',
    '^Chapter (One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)(?::\\s*.*)?$',
    '^Part (IX|X)$',
    '^Appendix ([A-D])$',
    '^Acknowledgements$',
  ].join('|'),
);

/** Map the word-form chapter numbers (Part X) to positions 1-10. */
const SOUL_WORD_NUMBER = {
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
  Ten: 10,
};

/** Strip the `DD/MM/YY, HH:MM - Name: ` prefix from a message-start line so
 * the underlying content can be tested as book text. */
const stripMessageHeader = (line) => line.replace(MESSAGE_HEADER_RE, '');

const TIMELINE_RE = /^TIMELINE SUMMARY\s*$/;

/** Drafting meta-blocks. Everything from the heading line to the end of
 * its WhatsApp message is dropped. */
const META_HEADING_RE =
  /^(Editor'?s? Note|Editor'?s? Notes|Editorial Note|Editorial Vision|Notes for Expansion|Research Note|Manuscript Progress|A Note for You|A Personal Note|Editorial Expansion|End of Manuscript)(\s*\([^)]*\))?\s*$/;

const DIVIDER = '⸻';
const isBlankOrDivider = (s) => !s || s.trim() === '' || s.trim() === DIVIDER;

const APPENDIX_A_PERIODS = [
  'Before the Common Era',
  'First Millennium CE',
  '13th–15th Centuries',
  'The Mughal Era (16th–18th Centuries)',
  'The Afghan Period (1752–1819)',
  'The Sikh Period (1819–1846)',
  'The Dogra Period (1846–1947)',
  'Late 19th Century',
  'Early 20th Century',
  'Mid-20th Century',
  'Late 20th Century',
  '21st Century',
  'Looking Forward',
];

/** Map from section slug to the reading order it should occupy. Assigned
 * after extraction; chapters 1-40 keep their numbers. */
const ORDER = new Map([
  ['preface', 0],
  ['chapter-1', 1],
  ['chapter-3', 2],
  ['chapter-11', 3],
  ['chapter-21', 4],
  ['chapter-22', 5],
  ['chapter-2', 6],
  ['chapter-10', 7],
  ['chapter-19', 8],
  ['chapter-20', 9],
  ['chapter-31', 10],
  ['chapter-4', 11],
  ['chapter-5', 12],
  ['chapter-6', 13],
  ['chapter-7', 14],
  ['chapter-23', 15],
  ['chapter-27', 16],
  ['chapter-28', 17],
  ['chapter-14', 18],
  ['chapter-15', 19],
  ['chapter-24', 20],
  ['chapter-25', 21],
  ['chapter-16', 22],
  ['chapter-18', 23],
  ['chapter-30', 24],
  ['chapter-8', 25],
  ['chapter-9', 26],
  ['chapter-12', 27],
  ['chapter-13', 28],
  ['chapter-26', 29],
  ['chapter-29', 30],
  ['chapter-32', 31],
  ['chapter-33', 32],
  ['chapter-34', 33],
  ['chapter-35', 34],
  ['chapter-36', 35],
  ['chapter-17', 36],
  ['chapter-39', 37],
  ['chapter-40', 38],
  ['chapter-37', 39],
  ['chapter-38', 40],
  ['masters-of-kashmir', 41],
  ['soul-of-kashmir', 42],
  ['soul-1', 43],
  ['soul-2', 44],
  ['soul-3', 45],
  ['soul-4', 46],
  ['soul-5', 47],
  ['soul-6', 48],
  ['soul-7', 49],
  ['soul-8', 50],
  ['soul-9', 51],
  ['soul-10', 52],
  ['acknowledgements', 53],
  ['appendix-a', 54],
  ['appendix-b', 55],
  ['appendix-c', 56],
  ['appendix-d', 57],
]);

function slugFor(kind, number, label) {
  if (kind === 'preface') return 'preface';
  if (kind === 'chapter') return `chapter-${number}`;
  if (kind === 'soul') return `soul-${number}`;
  if (kind === 'part') return label === 'IX' ? 'masters-of-kashmir' : 'soul-of-kashmir';
  if (kind === 'appendix') return `appendix-${label.toLowerCase()}`;
  if (kind === 'acknowledgements') return 'acknowledgements';
  return label.toLowerCase().replace(/\s+/g, '-');
}

function parseMessages(text) {
  const lines = text.split('\n');
  const messages = [];
  let current = null;
  lines.forEach((line, i) => {
    const m = line.match(MESSAGE_RE);
    if (m) {
      current = {start: i, end: i, first: m[1]};
      messages.push(current);
    } else if (current) {
      current.end = i;
      if (current.first === '') current.first = line;
    }
  });
  return {lines, messages};
}

/**
 * Scan the manuscript and build raw sections. A section begins when a
 * line matches SECTION_RE and is either the first line of a message or is
 * flanked by blank/divider lines.
 */
function buildSections({lines, messages}) {
  const messageStartAt = new Set(messages.map((m) => m.start));
  const messageEndAt = new Map(messages.map((m) => [m.start, m.end]));
  const messageStartOfLine = new Map();
  for (const m of messages) {
    for (let i = m.start; i <= m.end; i++) messageStartOfLine.set(i, m.start);
  }

  const isSectionStart = (i, line) => {
    const t = stripMessageHeader(line).trim();
    if (!SECTION_RE.test(t)) return false;
    if (messageStartAt.has(i)) return true;
    const prev = i > 0 ? lines[i - 1] : '';
    const next = i < lines.length - 1 ? lines[i + 1] : '';
    return isBlankOrDivider(prev) && isBlankOrDivider(next);
  };

  const sections = [];
  let current = null;
  let bookStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!bookStarted) {
      if (line.match(MESSAGE_RE)?.[1] === 'The Kashmir Weaver Research Handbook') {
        bookStarted = true;
        current = {
          slug: '__title__',
          kind: 'title',
          number: null,
          label: null,
          lines: ['The Kashmir Weaver Research Handbook'],
          lineIndexes: [],
          messageStarts: [],
        };
        sections.push(current);
      }
      continue;
    }

    if (isSectionStart(i, line)) {
      const m = stripMessageHeader(line).trim();
      const section = parseSectionHeader(m);
        current = {
          slug: slugFor(section.kind, section.number, section.label),
          kind: section.kind,
          number: section.number,
          label: section.label,
          lines: [m],
          lineIndexes: [i],
          messageStarts: [i],
        };
        sections.push(current);
    } else if (TIMELINE_RE.test(stripMessageHeader(line).trim())) {
      // Timeline summary belongs to Appendix A.
      current = sections.find((s) => s.kind === 'appendix') ?? current;
      if (current) {
        current.lines.push(stripMessageHeader(line).trim());
        current.lineIndexes.push(i);
        current.messageStarts.push(i);
      }
    } else if (current) {
      current.lines.push(stripMessageHeader(line));
      current.lineIndexes.push(i);
      if (messageStartAt.has(i)) current.messageStarts.push(i);
    }
  }

  return sections;
}

function parseSectionHeader(line) {
  const trimmed = line.trim();
  const preface = trimmed.match(/^Preface$/);
  if (preface) return {kind: 'preface', number: null, label: null};

  const chapter = trimmed.match(/^Chapter (\d+)$/);
  if (chapter) return {kind: 'chapter', number: Number(chapter[1]), label: null};

  const soul = trimmed.match(/^Chapter (One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)(?::\s*.*)?$/);
  if (soul) return {kind: 'soul', number: SOUL_WORD_NUMBER[soul[1]], label: soul[1]};

  const part = trimmed.match(/^Part (IX|X)$/);
  if (part) return {kind: 'part', number: null, label: part[1]};

  const appendix = trimmed.match(/^Appendix ([A-D])$/);
  if (appendix) return {kind: 'appendix', number: null, label: appendix[1]};

  if (/^Acknowledgements$/.test(trimmed)) {
    return {kind: 'acknowledgements', number: null, label: null};
  }

  throw new Error(`Unknown section header: ${line}`);
}

/** Extract the chapter/appendix/preface title block (lines between the
 * header line and the first blank line). */
function extractTitleBlock(section) {
  const {lines} = section;
  const [header, ...rest] = lines;
  const titleLines = [];
  let started = false;
  for (const line of rest) {
    if (!started && line.trim() === '') continue;
    started = true;
    if (line.trim() === '') break;
    titleLines.push(line.trim());
  }
  // Sections whose title lives in the header line (soul chapters,
  // preface, acknowledgements) keep their first paragraph in the body.
  // Regular chapters use [header, blank, title] as the title block.
  const bodyStart =
    section.kind === 'soul' ||
    section.kind === 'preface' ||
    section.kind === 'acknowledgements'
      ? 1
      : 1 + titleLines.length + (titleLines.length > 0 ? 1 : 0);
  return {
    header: header.trim(),
    main: titleLines[0] ?? '',
    subtitle: titleLines[1] ?? '',
    bodyStart,
  };
}

/** Convert a standalone ⸻ line to a markdown thematic break. */
function dividerToHr(line) {
  return line.trim() === DIVIDER ? '---' : line;
}

function isHeadingCandidate(line) {
  const t = line.trim();
  if (t.length < 2 || t.length > 72) return false;
  if (/^[*\-\d'’"“(\[{]/.test(t)) return false;
  if (/[.!:;!]$/.test(t)) return false;
  if (/^\d+(\.|\)|:)/.test(t)) return false;
  return true;
}

/** Post-process a section body into book markdown. */
function transformSection(section, lines, messageStartOfLine, messageEndAt) {
  const titleBlock = extractTitleBlock(section);
  const lineIndexes = section.lineIndexes;
  let body = [];
  let i = titleBlock.bodyStart;

  const pushLine = (s) => body.push(s);

  // Special case: chapter 1's drafting tail.
  const cutTailAt = lines.findIndex((l, idx) =>
    idx > titleBlock.bodyStart && /^This is the first 3.{0,3}4 pages of the manuscript/.test(l),
  );
  // Editor's "next chapter" previews: `Chapter N – <title>` preview lines
  // (never real headers, since SECTION_RE only accepts bare `Chapter N`).
  const cutPreviewAt = lines.findIndex((l, idx) =>
    idx > titleBlock.bodyStart &&
    (/^Chapter \d+\s*[—–-]/.test(l.trim()) || /^Next chapter I.'ll write/.test(l.trim())),
  );

  const isMetaHeading = (idx) => {
    if (!META_HEADING_RE.test(lines[idx].trim())) return false;
    // "Author's Reflection" is only stripped when it addresses Umar
    // directly (chapter 35).
    if (/^Author'?s? Reflection$/.test(lines[idx].trim())) return false;
    return true;
  };

  const metaEndIndex = (() => {
    // Drop from the first meta heading (e.g. "Editorial Note") to the end
    // of the section. Cutting at the heading line itself is safe both when
    // the heading opens its own message and when it is a continuation line
    // at the tail of a content message.
    for (let j = titleBlock.bodyStart; j < lines.length; j++) {
      if (isMetaHeading(j)) return j;
    }
    return lines.length;
  })();

  const endIndex = Math.min(
    cutTailAt === -1 ? lines.length : cutTailAt,
    cutPreviewAt === -1 ? lines.length : cutPreviewAt,
    metaEndIndex,
  );

  let sawBody = false;
  for (; i < endIndex; i++) {
    const line = lines[i];
    if (line === undefined) break;
    const trimmed = line.trim();

    // Chapter 35's author's reflection addresses Umar — strip.
    if (
      section.kind === 'chapter' &&
      section.number === 35 &&
      /^Author'?s? Reflection$/.test(trimmed)
    ) {
      continue;
    }

    if (trimmed === '') {
      pushLine('');
      continue;
    }

    if (trimmed === DIVIDER) {
      pushLine('---');
      sawBody = true;
      continue;
    }

    // Timeline summary table for Appendix A.
    if (TIMELINE_RE.test(trimmed)) {
      pushLine('## Timeline Summary');
      const rows = [];
      let j = i + 1;
      while (j < endIndex) {
        const t = lines[j]?.trim();
        if (t === DIVIDER) break;
        if (t) rows.push(t);
        j++;
      }
      if (rows.length >= 2) {
        pushLine('');
        pushLine('| Period | Milestone |');
        pushLine('| --- | --- |');
        const headers = rows.slice(0, 2);
        const data = rows.slice(2);
        for (let k = 0; k + 1 < data.length; k += 2) {
          pushLine(`| ${data[k]} | ${data[k + 1]} |`);
        }
        void headers;
      }
      i = j - 1;
      continue;
    }

    // Structure headings.
    if (
      /^Step \d+\s*[—–-]\s*/.test(trimmed) ||
      /^Chapter (One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten):/.test(trimmed) ||
      APPENDIX_A_PERIODS.includes(trimmed) ||
      /^[A-Z]$/.test(trimmed) ||
      /^(Closing Reflection|Epilogue)$/.test(trimmed) ||
      /^Author'?s? Reflection$/.test(trimmed)
    ) {
      pushLine(`## ${trimmed}`);
      sawBody = true;
      continue;
    }

    // Glossary entries: short standalone lines become bold terms.
    if (
      section.kind === 'chapter' &&
      section.number === 37 &&
      trimmed.length <= 40 &&
      isHeadingCandidate(trimmed)
    ) {
      pushLine(`**${trimmed}**`);
      sawBody = true;
      continue;
    }

    // Generic short standalone heading lines (luxury editorial style).
    const prev = i > 0 ? lines[i - 1] : '';
    const next = i < lines.length - 1 ? lines[i + 1] : '';
    if (
      isHeadingCandidate(trimmed) &&
      isBlankOrDivider(prev) &&
      isBlankOrDivider(next) &&
      sawBody
    ) {
      // Merge consecutive short lines (title + subtitle) into one heading.
      if (/^## /.test(body.at(-1) ?? '')) {
        body[body.length - 1] = `${body[body.length - 1]} — ${trimmed}`;
      } else {
        pushLine(`## ${trimmed}`);
      }
      sawBody = true;
      continue;
    }

    pushLine(dividerToHr(line));
    if (trimmed.length > 0) sawBody = true;
  }

  // Normalise: collapse consecutive blank lines & trailing dividers.
  let text = body.join('\n').replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\s*\n/, '');
  text = text.replace(/(?:^|\n)---(\n---)+/g, '\n---');
  text = text.replace(/(---\n)+$/g, '').trim();
  text = text.replace(/(^|\n)---(\n)*$/g, '\n');
  text = text.trim();

  return {titleBlock, body: text};
}

function main() {
  const chatPath = process.argv[2] ?? DEFAULT_CHAT;
  console.log(`Reading ${chatPath}`);
  const text = readFileSync(chatPath, 'utf8');

  const {lines, messages} = parseMessages(text);
  const messageStartOfLine = new Map();
  for (const m of messages) {
    for (let i = m.start; i <= m.end; i++) messageStartOfLine.set(i, m.start);
  }
  const messageEndAt = new Map(messages.map((m) => [m.start, m.end]));

  const sections = buildSections({lines, messages});
  const titleSection = sections.shift();

  // Book title block.
  const titleLines = titleSection.lines.map((l) => l.trim()).filter(Boolean);
  const book = {
    title: titleLines[0] ?? 'The Kashmir Weaver Research Handbook',
    subtitle: titleLines[1] ?? '',
    edition: titleLines[2] ?? '',
  };

  mkdirSync(OUT_DIR, {recursive: true});
  const manifestSections = [];

  for (const section of sections) {
    const {titleBlock, body} = transformSection(
      section,
      section.lines,
      messageStartOfLine,
      messageEndAt,
    );
    if (!body) {
      console.warn(`  ! empty section: ${section.slug}`);
      continue;
    }
    const chapterTitle =
      section.kind === 'soul'
        ? titleBlock.header.replace(/^Chapter \w+:\s*/, '').trim()
        : section.kind === 'preface' || section.kind === 'acknowledgements'
          ? titleBlock.header
          : titleBlock.main || titleBlock.header;
    const meta = {
      slug: section.slug,
      kind: section.kind,
      number: section.number ?? null,
      title: chapterTitle,
      subtitle: titleBlock.subtitle,
    };
    const order = ORDER.get(section.slug);
    if (order === undefined) {
      throw new Error(`Missing reading order for ${section.slug}`);
    }
    manifestSections.push({...meta, order});
    const frontmatter = [
      '---',
      `slug: ${meta.slug}`,
      `kind: ${meta.kind}`,
      `number: ${meta.number ?? ''}`,
      `title: ${meta.title.replace(/"/g, '\\"')}`,
      `subtitle: ${meta.subtitle.replace(/"/g, '\\"')}`,
      `order: ${order}`,
      '---',
      '',
    ].join('\n');
    const file = join(OUT_DIR, `${section.slug}.md`);
    writeFileSync(file, frontmatter + body + '\n');
    console.log(`  ${section.slug} (${body.split(/\s+/).filter(Boolean).length} words)`);
  }

  manifestSections.sort((a, b) => a.order - b.order);
  const manifest = {...book, sections: manifestSections};
  writeFileSync(
    join(OUT_DIR, 'book-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(`\nWrote ${manifestSections.length} sections to ${OUT_DIR}`);
  console.log(`Total words: ${manifestSections.reduce((n, s) => n + 0, 0)}`);
}

main();
