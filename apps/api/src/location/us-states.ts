/**
 * Full US state name → USPS 2-letter code. Used to normalize region fields
 * from sources (like USAJobs) that return names instead of codes. Includes
 * territories so Puerto Rico / Guam postings surface correctly too.
 */
const STATE_NAME_TO_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries({
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
    'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
    'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
    'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
    'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
    'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
    'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX',
    'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
    'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    // Territories
    'puerto rico': 'PR', 'guam': 'GU', 'american samoa': 'AS',
    'virgin islands': 'VI', 'northern mariana islands': 'MP',
  }),
);

/**
 * Normalize any region input to the 2-letter USPS code.
 *  - "Ohio" → "OH"
 *  - "OH"   → "OH"
 *  - "oh"   → "OH"
 *  - "Japan" / "United Kingdom" → null (non-US)
 */
export function normalizeUsRegion(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    // Accept if it's a known code (avoid returning "XX" as if valid).
    for (const code of STATE_NAME_TO_CODE.values()) if (code === upper) return upper;
    return null;
  }
  return STATE_NAME_TO_CODE.get(trimmed.toLowerCase()) ?? null;
}
