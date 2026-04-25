/**
 * Split a raw job description into structured sections.
 *
 * Job feeds arrive in every shape imaginable: Adzuna returns a flat
 * paragraph, USAJobs sometimes sends bulleted MajorDuties, and recruiter
 * text mixes both. This parser does a best-effort normalization so the
 * detail page can render something readable either way.
 */

export interface DescriptionSection {
  heading?: string;
  /** Each block is either a paragraph of text or a bullet list. */
  blocks: Array<
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }
  >;
}

// Headings we treat as known section breaks. Anything that matches these
// case-insensitively, possibly followed by a colon, becomes a new section.
const KNOWN_HEADINGS = [
  'description',
  'overview',
  'summary',
  'about the role',
  'about the job',
  'about the position',
  'what you\'ll do',
  'responsibilities',
  'key job responsibilities',
  'duties',
  'major duties',
  'qualifications',
  'minimum qualifications',
  'requirements',
  'required skills',
  'preferred qualifications',
  'nice to have',
  'benefits',
  'compensation',
  'how to apply',
  'equal opportunity',
];

const HEADING_PATTERN = new RegExp(
  `^\\s*(${KNOWN_HEADINGS.map((h) => h.replace(/[^a-z ]/g, (c) => `\\${c}`)).join('|')})[:\\s]*$`,
  'i',
);

export function parseDescription(raw: string | null | undefined): DescriptionSection[] {
  if (!raw) return [];
  // Normalize line endings and strip any stray HTML tags USAJobs occasionally
  // leaves behind in its `UserArea.Details` fields.
  const clean = raw
    .replace(/\r\n/g, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const lines = clean.split('\n').map((l) => l.trimEnd());
  const sections: DescriptionSection[] = [];
  let current: DescriptionSection = { blocks: [] };
  let bulletBuffer: string[] = [];
  let paraBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      current.blocks.push({ type: 'list', items: bulletBuffer });
      bulletBuffer = [];
    }
  };
  const flushPara = () => {
    if (paraBuffer.length > 0) {
      current.blocks.push({ type: 'paragraph', text: paraBuffer.join(' ').trim() });
      paraBuffer = [];
    }
  };
  const flushAll = () => { flushBullets(); flushPara(); };

  for (const line of lines) {
    if (line.trim() === '') {
      flushAll();
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      flushAll();
      if (current.blocks.length > 0 || current.heading) sections.push(current);
      current = { heading: toTitleCase(headingMatch[1]), blocks: [] };
      continue;
    }

    // Bullet formats: "• x", "- x", "* x", "1. x", "1) x"
    const bulletMatch = line.match(/^[\s\u00a0]*(?:[-*•·]|\d+[.)])\s+(.+)$/);
    if (bulletMatch) {
      flushPara();
      bulletBuffer.push(bulletMatch[1].trim());
      continue;
    }

    flushBullets();
    paraBuffer.push(line.trim());
  }
  flushAll();
  if (current.blocks.length > 0 || current.heading) sections.push(current);

  // If the source had no recognized headings, return a single unlabeled
  // section — the renderer will just show the paragraphs without titles.
  return sections.length > 0 ? sections : [{ blocks: [] }];
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const cur = currency ?? 'USD';
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min ?? max!);
}
