/**
 * Allowlist-based HTML sanitizer for job descriptions.
 *
 * We deliberately do NOT pull in DOMPurify/jsdom — the description content
 * comes from curated job boards (not arbitrary user input), the allowlist
 * is tiny, and shipping an extra native dep just to render bullets is
 * overkill. The sanitizer is also applied *server-side before storage*, so
 * by the time the frontend renders it the content is already trusted.
 *
 * Accepts: tags below (with minimal attributes).
 * Rejects: <script>, <style>, event handlers, inline JS URLs, everything else.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a',
  'pre', 'code', 'blockquote',
  'hr',
]);

// Per-tag allowed attributes.
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href']),
};

export function sanitizeHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = input
    .replace(/<!--[\s\S]*?-->/g, '')                  // strip HTML comments
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')   // strip script/style blocks entirely
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // control chars

  return normalized.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,
    (_match, slash: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (slash === '/') return `</${tag}>`;                // closing tag — strip any attrs
      if (tag === 'br' || tag === 'hr') return `<${tag}>`;

      const allowed = ALLOWED_ATTRIBUTES[tag];
      if (!allowed) return `<${tag}>`;

      const attrs: string[] = [];
      const attrRe = /([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const name = m[1].toLowerCase();
        if (!allowed.has(name)) continue;
        const value = m[2] ?? m[3] ?? m[4] ?? '';
        if (name === 'href' && /^\s*(?:javascript|data|vbscript):/i.test(value)) continue;
        attrs.push(`${name}="${escapeAttr(value)}"`);
      }
      return attrs.length > 0 ? `<${tag} ${attrs.join(' ')}>` : `<${tag}>`;
    },
  );
}

function escapeAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Quick utility to turn a plain-text paragraph (with \n\n breaks) into HTML. */
export function plainTextToHtml(text: string | null | undefined): string | null {
  if (!text) return null;
  const paras = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return null;
  return paras.map((p) => `<p>${escapeHtmlText(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function escapeHtmlText(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
