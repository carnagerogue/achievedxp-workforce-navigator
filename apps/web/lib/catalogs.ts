/**
 * Curated, categorized catalogs for the onboarding skill / certification /
 * industry picker. The codes (snake_case) are what get persisted to the
 * profile and matched against job postings; labels are display-only.
 *
 * Adding to these lists is the only change needed to broaden the picker —
 * the persistence layer accepts arbitrary strings, and the matching engine
 * uses substring keyword matching against job text, so new entries
 * immediately participate in scoring without a DB migration.
 *
 * Naming convention: codes are lowercase + underscores. Labels are
 * Title Case where it reads naturally, lowercase otherwise.
 */

export interface CatalogItem {
  code: string;
  label: string;
  /** Optional alt-spellings used to score the item against a search query. */
  synonyms?: string[];
}

export interface CatalogCategory {
  key: string;
  label: string;
  items: CatalogItem[];
}

// ────────────────────────────────────────────────────────────────────
// SKILLS — ~80 entries across 7 categories
// ────────────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES: CatalogCategory[] = [
  {
    key: 'trades',
    label: 'Skilled trades',
    items: [
      { code: 'carpentry', label: 'Carpentry' },
      { code: 'plumbing', label: 'Plumbing' },
      { code: 'electrical', label: 'Electrical' },
      { code: 'welding', label: 'Welding', synonyms: ['mig', 'tig', 'stick'] },
      { code: 'hvac', label: 'HVAC' },
      { code: 'masonry', label: 'Masonry / brick' },
      { code: 'drywall', label: 'Drywall / sheetrock' },
      { code: 'painting', label: 'Painting' },
      { code: 'roofing', label: 'Roofing' },
      { code: 'flooring', label: 'Flooring' },
      { code: 'machining', label: 'Machining / CNC' },
      { code: 'sheet_metal', label: 'Sheet metal' },
      { code: 'concrete', label: 'Concrete / cement' },
      { code: 'tile_setting', label: 'Tile setting' },
      { code: 'glazing', label: 'Glazing / glass install' },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment operation',
    items: [
      { code: 'forklift_operation', label: 'Forklift operation' },
      { code: 'pallet_jack', label: 'Pallet jack' },
      { code: 'order_picker', label: 'Order picker / cherry picker' },
      { code: 'reach_truck', label: 'Reach truck' },
      { code: 'scissor_lift', label: 'Scissor lift' },
      { code: 'boom_lift', label: 'Boom lift' },
      { code: 'telehandler', label: 'Telehandler' },
      { code: 'excavator', label: 'Excavator' },
      { code: 'backhoe', label: 'Backhoe' },
      { code: 'bobcat_skid_steer', label: 'Bobcat / skid steer' },
      { code: 'bulldozer', label: 'Bulldozer' },
      { code: 'crane_operation', label: 'Crane operation' },
      { code: 'tractor_operation', label: 'Tractor operation' },
    ],
  },
  {
    key: 'driving',
    label: 'Driving + logistics',
    items: [
      { code: 'commercial_driving', label: 'Commercial driving (CDL)' },
      { code: 'box_truck_driving', label: 'Box truck driving' },
      { code: 'delivery_driving', label: 'Delivery driving' },
      { code: 'route_driving', label: 'Route driving' },
      { code: 'rideshare', label: 'Rideshare driving' },
      { code: 'shipping_receiving', label: 'Shipping + receiving' },
      { code: 'warehouse_operations', label: 'Warehouse operations' },
      { code: 'inventory_management', label: 'Inventory management' },
      { code: 'picking_packing', label: 'Picking + packing' },
      { code: 'route_planning', label: 'Route planning' },
    ],
  },
  {
    key: 'food_service',
    label: 'Food service + hospitality',
    items: [
      { code: 'cooking', label: 'Cooking / line cook' },
      { code: 'food_prep', label: 'Food prep' },
      { code: 'baking', label: 'Baking' },
      { code: 'grilling', label: 'Grilling' },
      { code: 'food_service', label: 'Food service' },
      { code: 'bartending', label: 'Bartending' },
      { code: 'serving', label: 'Serving / waitstaff' },
      { code: 'dishwashing', label: 'Dishwashing' },
      { code: 'barista', label: 'Barista / coffee' },
      { code: 'host_hostess', label: 'Host / hostess' },
      { code: 'housekeeping', label: 'Housekeeping' },
    ],
  },
  {
    key: 'customer',
    label: 'Customer-facing',
    items: [
      { code: 'customer_service', label: 'Customer service' },
      { code: 'retail_sales', label: 'Retail sales' },
      { code: 'cashiering', label: 'Cashiering' },
      { code: 'phone_support', label: 'Phone support' },
      { code: 'sales', label: 'Sales' },
      { code: 'merchandising', label: 'Merchandising' },
      { code: 'security', label: 'Security' },
    ],
  },
  {
    key: 'office_tech',
    label: 'Office + technology',
    items: [
      { code: 'computer_literacy', label: 'Basic computer literacy' },
      { code: 'data_entry', label: 'Data entry' },
      { code: 'microsoft_office', label: 'Microsoft Office' },
      { code: 'excel', label: 'Excel / spreadsheets' },
      { code: 'scheduling', label: 'Scheduling' },
      { code: 'recordkeeping', label: 'Recordkeeping' },
      { code: 'computer_repair', label: 'Computer repair' },
      { code: 'networking', label: 'Networking basics' },
      { code: 'pos_systems', label: 'POS systems' },
    ],
  },
  {
    key: 'general',
    label: 'General + facilities',
    items: [
      { code: 'general_labor', label: 'General labor' },
      { code: 'janitorial', label: 'Janitorial' },
      { code: 'cleaning', label: 'Cleaning' },
      { code: 'landscaping', label: 'Landscaping / grounds' },
      { code: 'maintenance', label: 'Building maintenance' },
      { code: 'painting_residential', label: 'Residential painting' },
      { code: 'moving', label: 'Moving / hauling' },
      { code: 'recycling_waste', label: 'Recycling / waste' },
      { code: 'farm_work', label: 'Farm work / agriculture' },
      { code: 'auto_repair', label: 'Auto repair' },
      { code: 'tire_install', label: 'Tire installation' },
      { code: 'small_engine', label: 'Small engine repair' },
    ],
  },
];

// Flat lookup, useful for the typeahead and to render selected chips that
// reference items not currently in the open category list.
export const SKILL_INDEX: Record<string, CatalogItem> = Object.fromEntries(
  SKILL_CATEGORIES.flatMap((c) => c.items).map((i) => [i.code, i]),
);

// ────────────────────────────────────────────────────────────────────
// CERTIFICATIONS — ~40 entries across 6 categories
// ────────────────────────────────────────────────────────────────────

export const CERT_CATEGORIES: CatalogCategory[] = [
  {
    key: 'safety',
    label: 'Safety',
    items: [
      { code: 'osha_10', label: 'OSHA 10' },
      { code: 'osha_30', label: 'OSHA 30' },
      { code: 'osha_forklift', label: 'OSHA forklift operator' },
      { code: 'hazwoper', label: 'HAZWOPER' },
      { code: 'first_aid', label: 'First Aid' },
      { code: 'cpr', label: 'CPR' },
      { code: 'bls', label: 'BLS (Basic Life Support)' },
      { code: 'aed', label: 'AED' },
      { code: 'flagger', label: 'Traffic flagger' },
    ],
  },
  {
    key: 'driving',
    label: 'Driving',
    items: [
      { code: 'cdl_a', label: 'CDL Class A' },
      { code: 'cdl_b', label: 'CDL Class B' },
      { code: 'cdl_c', label: 'CDL Class C' },
      { code: 'hazmat_endorsement', label: 'CDL Hazmat endorsement' },
      { code: 'passenger_endorsement', label: 'CDL Passenger endorsement' },
      { code: 'school_bus_endorsement', label: 'CDL School bus endorsement' },
      { code: 'tanker_endorsement', label: 'CDL Tanker endorsement' },
      { code: 'doubles_triples_endorsement', label: 'Doubles / Triples endorsement' },
      { code: 'motorcycle_license', label: 'Motorcycle license' },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment + lift',
    items: [
      { code: 'forklift', label: 'Forklift operator' },
      { code: 'scissor_lift_cert', label: 'Scissor lift' },
      { code: 'boom_lift_cert', label: 'Boom lift / aerial' },
      { code: 'telehandler_cert', label: 'Telehandler' },
      { code: 'crane_nccco', label: 'Crane operator (NCCCO)' },
      { code: 'rigging', label: 'Rigging / signaling' },
    ],
  },
  {
    key: 'trade',
    label: 'Skilled trades',
    items: [
      { code: 'nccer_core', label: 'NCCER Core' },
      { code: 'aws_certified_welder', label: 'AWS Certified Welder' },
      { code: 'epa_608', label: 'EPA 608 (HVAC refrigerant)' },
      { code: 'electrician_journey', label: 'Electrician journeyman' },
      { code: 'plumber_journey', label: 'Plumber journeyman' },
      { code: 'lead_renovator', label: 'EPA Lead Renovator' },
      { code: 'asbestos_worker', label: 'Asbestos worker' },
    ],
  },
  {
    key: 'food_health',
    label: 'Food + health',
    items: [
      { code: 'servsafe_manager', label: 'ServSafe Manager' },
      { code: 'servsafe', label: 'ServSafe Food Handler' },
      { code: 'food_handler_card', label: 'State food handler card' },
      { code: 'tabc_alcohol_server', label: 'Alcohol server (TABC / TIPS)' },
      { code: 'cna', label: 'CNA' },
      { code: 'phlebotomy', label: 'Phlebotomy' },
      { code: 'ekg_tech', label: 'EKG Technician' },
      { code: 'medical_assistant', label: 'Medical Assistant' },
    ],
  },
  {
    key: 'tech',
    label: 'Technology',
    items: [
      { code: 'comptia_a_plus', label: 'CompTIA A+' },
      { code: 'comptia_network_plus', label: 'CompTIA Network+' },
      { code: 'comptia_security_plus', label: 'CompTIA Security+' },
      { code: 'google_it_support', label: 'Google IT Support' },
      { code: 'aws_cloud_practitioner', label: 'AWS Cloud Practitioner' },
    ],
  },
];

export const CERT_INDEX: Record<string, CatalogItem> = Object.fromEntries(
  CERT_CATEGORIES.flatMap((c) => c.items).map((i) => [i.code, i]),
);

// ────────────────────────────────────────────────────────────────────
// INDUSTRIES — ~22 entries
// ────────────────────────────────────────────────────────────────────

export const INDUSTRY_CATEGORIES: CatalogCategory[] = [
  {
    key: 'industries',
    label: 'Industries',
    items: [
      { code: 'construction', label: 'Construction' },
      { code: 'manufacturing', label: 'Manufacturing' },
      { code: 'warehousing', label: 'Warehousing' },
      { code: 'transportation', label: 'Transportation' },
      { code: 'logistics', label: 'Logistics' },
      { code: 'food_service', label: 'Food service' },
      { code: 'hospitality', label: 'Hospitality' },
      { code: 'retail', label: 'Retail' },
      { code: 'cleaning', label: 'Cleaning + janitorial' },
      { code: 'landscaping', label: 'Landscaping + grounds' },
      { code: 'agriculture', label: 'Agriculture + farming' },
      { code: 'services', label: 'Services' },
      { code: 'sanitation', label: 'Sanitation' },
      { code: 'energy_utilities', label: 'Energy + utilities' },
      { code: 'automotive', label: 'Automotive' },
      { code: 'healthcare', label: 'Healthcare' },
      { code: 'education', label: 'Education' },
      { code: 'government', label: 'Government' },
      { code: 'it_general', label: 'IT / technology' },
      { code: 'finance', label: 'Finance' },
      { code: 'insurance', label: 'Insurance' },
      { code: 'real_estate', label: 'Real estate + property mgmt' },
    ],
  },
];

export const INDUSTRY_INDEX: Record<string, CatalogItem> = Object.fromEntries(
  INDUSTRY_CATEGORIES.flatMap((c) => c.items).map((i) => [i.code, i]),
);

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Resolve a possibly-custom code to a display label. Falls back to
 * Title Case of the code so user-added entries always render cleanly.
 */
export function labelFor(code: string, index: Record<string, CatalogItem>): string {
  const known = index[code];
  if (known) return known.label;
  return code
    .split(/[_\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/**
 * Search a catalog (across all categories) and return matching items.
 * Matches against label, code, and synonyms — case-insensitive,
 * substring-friendly. Empty query returns everything.
 */
export function searchCatalog(
  query: string,
  categories: CatalogCategory[],
): CatalogItem[] {
  const q = query.trim().toLowerCase();
  const all = categories.flatMap((c) => c.items);
  if (!q) return all;
  return all.filter((i) =>
    i.label.toLowerCase().includes(q) ||
    i.code.toLowerCase().includes(q) ||
    (i.synonyms ?? []).some((s) => s.toLowerCase().includes(q)),
  );
}

/** Slug a free-text custom entry into a stable code. */
export function customCode(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
