/**
 * Parse a single "Location" input box into structured filter params.
 *
 * One input accepts any of:
 *   "44113"              → { postalCode: "44113" }
 *   "OH"                 → { region:     "OH" }
 *   "Ohio"               → { region:     "OH" }
 *   "Cleveland"          → { city:       "Cleveland" }
 *   "Cleveland, OH"      → { city:       "Cleveland", region: "OH" }
 *   "Cleveland, Ohio"    → { city:       "Cleveland", region: "OH" }
 *   ""                   → {}
 *
 * Decisions over ambiguity:
 *   - 5 digits → ZIP, never city
 *   - "AK","OH","CA" etc. are uppercase-only state codes; lowercase "ca" or
 *     "oh" gets treated as city text so we don't hijack partial typing.
 *   - Free text that matches a known state name → state
 *   - Everything else → city
 */

const FULL_STATE_NAMES: ReadonlyMap<string, string> = new Map(
  Object.entries({
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
    california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
    'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI',
    idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
    kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME',
    maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
    mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE',
    nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
    'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
    oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
    'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
    utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
    'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
    'puerto rico': 'PR', guam: 'GU', 'virgin islands': 'VI',
  }),
);

const VALID_STATE_CODES = new Set([...FULL_STATE_NAMES.values()]);

export interface LocationFilter {
  postalCode?: string;
  region?: string;
  city?: string;
}

export function parseLocationInput(raw: string): LocationFilter {
  const text = raw.trim();
  if (!text) return {};

  // ZIP — strict 5 digits, optional +4 ignored.
  if (/^\d{5}(-\d{4})?$/.test(text)) {
    return { postalCode: text.slice(0, 5) };
  }

  // "City, State" — common "Cleveland, OH" / "Cleveland, Ohio" pattern.
  if (text.includes(',')) {
    const [cityPart, regionPart] = text.split(',', 2).map((p) => p.trim());
    const region = toStateCode(regionPart);
    if (region && cityPart) return { city: cityPart, region };
    // fall through if we couldn't resolve the state
  }

  // 2-letter uppercase like "OH" or "CA" — treat as state code. Lowercase
  // left alone so partial words ("ca" → starting to type "canton") go to
  // city matching.
  if (/^[A-Z]{2}$/.test(text) && VALID_STATE_CODES.has(text)) {
    return { region: text };
  }

  // Full state name ("Ohio", "new jersey").
  const asState = toStateCode(text);
  if (asState) return { region: asState };

  // Everything else → city (ILIKE contains on server).
  return { city: text };
}

function toStateCode(input: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 2 && VALID_STATE_CODES.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return FULL_STATE_NAMES.get(trimmed.toLowerCase());
}
