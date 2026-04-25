import type { RiasecCode } from './questions.data';

/**
 * Curated O*NET occupation set.
 *
 * Each entry follows the O*NET-SOC system:
 *   - hollandCode: 1–3 letters in priority order (e.g. "RC" or "RIE")
 *   - jobZone:     1 (no preparation needed) → 5 (extensive education)
 *
 * Scope is deliberate: we focus on Job Zones 1–3 because those map to roles
 * realistically reachable by justice-impacted candidates without first
 * needing a 4-year degree. A Job-Zone-5 attorney isn't a useful suggestion
 * for our user base — surfacing it would set expectations badly.
 *
 * Data is grounded in the public O*NET database (https://www.onetonline.org/);
 * Holland codes and Job Zones come from the official "Find Occupations"
 * lookup. Search keywords are the terms most likely to surface real
 * postings in our catalog (which is keyword-indexed via Adzuna + USAJobs).
 */

export interface Occupation {
  /** O*NET-SOC code, e.g. "53-3032.00" */
  onetCode: string;
  /** Pretty title */
  title: string;
  /** 1–3 letter Holland code, primary first */
  hollandCode: string;
  /** O*NET Job Zone (1–5) — typical preparation needed */
  jobZone: 1 | 2 | 3 | 4 | 5;
  /** Two-sentence description for candidates */
  description: string;
  /** Plain-English preparation level */
  preparation: string;
  /** Typical median wage. Strings to allow ranges + sourcing notes. */
  typicalWage: string;
  /**
   * Search keywords to find this occupation in our jobs catalog. Used to
   * deep-link to /jobs?q=<keyword>.
   */
  searchKeywords: string;
  /** Best-matching industry tag from our classifier vocabulary. */
  industry: string | null;
  /**
   * Whether this role typically passes a background check for someone
   * with a record. Surfaced in the UI as a fair-chance signal.
   */
  fairChanceFriendly: boolean;
}

export const OCCUPATIONS: ReadonlyArray<Occupation> = [
  // ─────────── Job Zone 1: little or no preparation ───────────
  {
    onetCode: '37-2011.00', title: 'Janitor / Cleaner', hollandCode: 'RC', jobZone: 1,
    description: 'Keep buildings clean and orderly. Often hires immediately and is widely fair-chance friendly.',
    preparation: 'Little or no preparation', typicalWage: '$30,000 – $40,000',
    searchKeywords: 'janitor custodian cleaner', industry: 'cleaning', fairChanceFriendly: true,
  },
  {
    onetCode: '35-9021.00', title: 'Dishwasher', hollandCode: 'RC', jobZone: 1,
    description: 'Wash dishes in restaurants and institutional kitchens. Steady-hours roles, low barrier to entry.',
    preparation: 'Little or no preparation', typicalWage: '$25,000 – $35,000',
    searchKeywords: 'dishwasher kitchen', industry: 'food_service', fairChanceFriendly: true,
  },
  {
    onetCode: '53-7064.00', title: 'Stock / Material Handler', hollandCode: 'RC', jobZone: 1,
    description: 'Move stock and supplies in warehouses and stores. Strong demand, often a path into forklift and shipping roles.',
    preparation: 'Little or no preparation', typicalWage: '$30,000 – $40,000',
    searchKeywords: 'stock material handler warehouse', industry: 'warehousing', fairChanceFriendly: true,
  },
  {
    onetCode: '37-3011.00', title: 'Landscaping / Groundskeeper', hollandCode: 'RC', jobZone: 1,
    description: 'Maintain lawns, gardens, and outdoor grounds. Outdoor work, seasonal demand, often fair-chance.',
    preparation: 'Little or no preparation', typicalWage: '$30,000 – $40,000',
    searchKeywords: 'landscaper groundskeeper grounds', industry: 'cleaning', fairChanceFriendly: true,
  },
  {
    onetCode: '53-7062.00', title: 'Production Helper / Laborer', hollandCode: 'RC', jobZone: 1,
    description: 'Move materials in factories and on construction sites. Entry into trades and manufacturing.',
    preparation: 'Little or no preparation', typicalWage: '$30,000 – $42,000',
    searchKeywords: 'laborer helper production', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '35-2021.00', title: 'Food Preparation Worker', hollandCode: 'RC', jobZone: 1,
    description: 'Prep ingredients, set up workstations, assist cooks. Common entry into the restaurant industry.',
    preparation: 'Little or no preparation', typicalWage: '$28,000 – $38,000',
    searchKeywords: 'food prep prep cook', industry: 'food_service', fairChanceFriendly: true,
  },

  // ─────────── Job Zone 2: some preparation (a license, short cert) ───────────
  {
    onetCode: '53-7051.00', title: 'Forklift / Industrial Truck Operator', hollandCode: 'RC', jobZone: 2,
    description: 'Operate forklifts and pallet jacks in warehouses and yards. OSHA-certifiable in days; reliable demand.',
    preparation: 'OSHA forklift cert (1–2 weeks)', typicalWage: '$36,000 – $50,000',
    searchKeywords: 'forklift operator', industry: 'warehousing', fairChanceFriendly: true,
  },
  {
    onetCode: '53-3032.00', title: 'Heavy / Tractor-Trailer Truck Driver', hollandCode: 'RE', jobZone: 2,
    description: 'Long-haul or regional trucking. Strong-demand, fair-chance-friendly career with union options.',
    preparation: 'CDL-A (3–7 weeks)', typicalWage: '$50,000 – $80,000',
    searchKeywords: 'cdl truck driver', industry: 'transportation', fairChanceFriendly: true,
  },
  {
    onetCode: '53-3033.00', title: 'Light Truck / Delivery Driver', hollandCode: 'RC', jobZone: 2,
    description: 'Local deliveries, route work. CDL-B opens larger vehicles; many fair-chance employers.',
    preparation: 'CDL-B or clean license', typicalWage: '$36,000 – $55,000',
    searchKeywords: 'delivery driver', industry: 'transportation', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2061.00', title: 'Construction Laborer', hollandCode: 'RC', jobZone: 2,
    description: 'Site cleanup, scaffolding, hauling — entry into the building trades and apprenticeships.',
    preparation: 'OSHA 10', typicalWage: '$36,000 – $52,000',
    searchKeywords: 'construction laborer', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2141.00', title: 'Painter (Construction)', hollandCode: 'RC', jobZone: 2,
    description: 'Surface prep and painting on residential and commercial sites. Often union, often fair-chance.',
    preparation: 'On-the-job training, optional apprenticeship', typicalWage: '$36,000 – $55,000',
    searchKeywords: 'painter painting', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2181.00', title: 'Roofer', hollandCode: 'RC', jobZone: 2,
    description: 'Install and repair roof systems. Apprenticeship pathways available.',
    preparation: 'OSHA 10, on-the-job training', typicalWage: '$38,000 – $58,000',
    searchKeywords: 'roofer roofing', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '35-2014.00', title: 'Restaurant Cook', hollandCode: 'RE', jobZone: 2,
    description: 'Prepare meals in a kitchen line. Many restaurants are openly fair-chance.',
    preparation: 'Short-term on-the-job training, ServSafe', typicalWage: '$30,000 – $45,000',
    searchKeywords: 'cook line cook', industry: 'food_service', fairChanceFriendly: true,
  },
  {
    onetCode: '43-4051.00', title: 'Customer Service Representative', hollandCode: 'SE', jobZone: 2,
    description: 'Handle customer inquiries by phone, email, or chat. Office or remote.',
    preparation: 'High school + computer literacy', typicalWage: '$32,000 – $50,000',
    searchKeywords: 'customer service representative', industry: 'services', fairChanceFriendly: true,
  },
  {
    onetCode: '43-9061.00', title: 'Office Clerk', hollandCode: 'CR', jobZone: 2,
    description: 'Filing, data entry, light reception, and routine office tasks.',
    preparation: 'High school + computer literacy', typicalWage: '$30,000 – $45,000',
    searchKeywords: 'office clerk administrative assistant', industry: 'services', fairChanceFriendly: true,
  },
  {
    onetCode: '49-9071.00', title: 'Maintenance & Repair Worker (General)', hollandCode: 'RC', jobZone: 2,
    description: 'Building upkeep, light electrical / plumbing / HVAC work. Strong demand in property mgmt + facilities.',
    preparation: 'On-the-job training, optional vocational cert', typicalWage: '$38,000 – $55,000',
    searchKeywords: 'maintenance technician', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '53-7065.00', title: 'Shipping & Receiving Clerk', hollandCode: 'RC', jobZone: 2,
    description: 'Track inbound and outbound shipments, document inventory.',
    preparation: 'High school + computer literacy', typicalWage: '$32,000 – $45,000',
    searchKeywords: 'shipping receiving clerk', industry: 'warehousing', fairChanceFriendly: true,
  },
  {
    onetCode: '37-1011.00', title: 'Cleaning Supervisor', hollandCode: 'ES', jobZone: 2,
    description: 'Lead a small cleaning crew, schedule shifts, train staff. Path into facility-management roles.',
    preparation: 'Experience as cleaner', typicalWage: '$38,000 – $55,000',
    searchKeywords: 'cleaning supervisor', industry: 'cleaning', fairChanceFriendly: true,
  },
  {
    onetCode: '51-9111.00', title: 'Packaging / Filling Machine Operator', hollandCode: 'RC', jobZone: 2,
    description: 'Run automated packaging lines in food, consumer-goods, and pharma plants.',
    preparation: 'On-the-job training', typicalWage: '$34,000 – $48,000',
    searchKeywords: 'machine operator packaging', industry: 'manufacturing', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2073.00', title: 'Operating Engineer / Heavy Equipment Operator', hollandCode: 'RC', jobZone: 2,
    description: 'Run bulldozers, backhoes, cranes, and graders on construction sites.',
    preparation: 'Apprenticeship (often 3-year)', typicalWage: '$48,000 – $80,000',
    searchKeywords: 'heavy equipment operator', industry: 'construction', fairChanceFriendly: true,
  },

  // ─────────── Job Zone 3: medium preparation (cert / 1–2 yr program) ───────────
  {
    onetCode: '47-2111.00', title: 'Electrician', hollandCode: 'RIE', jobZone: 3,
    description: 'Install and maintain electrical systems. Most enter via 4–5-year registered apprenticeship.',
    preparation: 'Apprenticeship + state license', typicalWage: '$55,000 – $90,000',
    searchKeywords: 'electrician', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2152.00', title: 'Plumber, Pipefitter, Steamfitter', hollandCode: 'RC', jobZone: 3,
    description: 'Install water, gas, and process piping systems. Union apprenticeships are open to fair-chance candidates.',
    preparation: 'Apprenticeship + state license', typicalWage: '$55,000 – $95,000',
    searchKeywords: 'plumber pipefitter', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '49-9021.00', title: 'HVAC / Refrigeration Mechanic', hollandCode: 'RIC', jobZone: 3,
    description: 'Install and repair heating, A/C, and refrigeration systems. EPA Section 608 cert opens most roles.',
    preparation: 'EPA 608 + 6-12 month program', typicalWage: '$50,000 – $80,000',
    searchKeywords: 'hvac', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '51-4121.00', title: 'Welder, Cutter, Solderer', hollandCode: 'RIE', jobZone: 3,
    description: 'Fabricate and join metal in shops, shipyards, and on construction sites.',
    preparation: 'Welding cert (6–12 months)', typicalWage: '$45,000 – $75,000',
    searchKeywords: 'welder welding', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2031.00', title: 'Carpenter', hollandCode: 'RC', jobZone: 3,
    description: 'Frame, finish, and build wooden structures. Union and non-union pathways available.',
    preparation: 'Apprenticeship (3–4 years)', typicalWage: '$48,000 – $75,000',
    searchKeywords: 'carpenter carpentry', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '49-3023.00', title: 'Automotive Service Technician', hollandCode: 'RIC', jobZone: 3,
    description: 'Diagnose and repair cars and light trucks. ASE certs strongly recommended.',
    preparation: 'Vocational program + ASE certs', typicalWage: '$42,000 – $70,000',
    searchKeywords: 'auto mechanic automotive technician', industry: 'transportation', fairChanceFriendly: true,
  },
  {
    onetCode: '49-3031.00', title: 'Bus & Truck Mechanic / Diesel Technician', hollandCode: 'RIC', jobZone: 3,
    description: 'Repair heavy-duty engines and chassis on commercial vehicles. Strong wage growth.',
    preparation: 'Diesel program + manufacturer training', typicalWage: '$50,000 – $80,000',
    searchKeywords: 'diesel mechanic truck mechanic', industry: 'transportation', fairChanceFriendly: true,
  },
  {
    onetCode: '51-4011.00', title: 'CNC / Machine Tool Operator', hollandCode: 'RC', jobZone: 3,
    description: 'Set up and run computer-controlled metal-cutting machines. High-precision manufacturing.',
    preparation: '6–18 month program', typicalWage: '$42,000 – $65,000',
    searchKeywords: 'cnc machinist machine operator', industry: 'manufacturing', fairChanceFriendly: true,
  },
  {
    onetCode: '49-9041.00', title: 'Industrial Mechanic / Millwright', hollandCode: 'RIC', jobZone: 3,
    description: 'Maintain and repair production equipment in factories and plants.',
    preparation: 'Apprenticeship or 2-year program', typicalWage: '$50,000 – $78,000',
    searchKeywords: 'industrial mechanic millwright maintenance technician', industry: 'manufacturing', fairChanceFriendly: true,
  },
  {
    onetCode: '47-2073.01', title: 'Crane / Tower Operator', hollandCode: 'RC', jobZone: 3,
    description: 'Operate cranes on construction sites and ports. NCCCO certification opens most roles.',
    preparation: 'NCCCO cert + on-the-job training', typicalWage: '$55,000 – $95,000',
    searchKeywords: 'crane operator', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '47-4011.00', title: 'Solar Photovoltaic Installer', hollandCode: 'RC', jobZone: 3,
    description: 'Install solar panels on homes and commercial roofs. Fast-growing field.',
    preparation: 'NABCEP-aligned program (3–6 months)', typicalWage: '$42,000 – $65,000',
    searchKeywords: 'solar photovoltaic pv installer', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '49-9081.00', title: 'Wind Turbine Service Technician', hollandCode: 'RIC', jobZone: 3,
    description: 'Maintain wind farm turbines. Among the fastest-growing skilled-trade roles.',
    preparation: '1-year technical program', typicalWage: '$48,000 – $75,000',
    searchKeywords: 'wind turbine technician', industry: 'construction', fairChanceFriendly: true,
  },
  {
    onetCode: '31-9092.00', title: 'Medical Assistant', hollandCode: 'SC', jobZone: 3,
    description: 'Assist clinicians with administrative and basic clinical tasks in outpatient settings.',
    preparation: 'Medical assistant program (~9 months)', typicalWage: '$36,000 – $50,000',
    searchKeywords: 'medical assistant', industry: 'healthcare', fairChanceFriendly: false,
  },
  {
    onetCode: '29-2052.00', title: 'Pharmacy Technician', hollandCode: 'CRI', jobZone: 3,
    description: 'Assist pharmacists with prescriptions and inventory. PTCB certification required in most states.',
    preparation: 'PTCB cert + state license', typicalWage: '$32,000 – $45,000',
    searchKeywords: 'pharmacy technician', industry: 'healthcare', fairChanceFriendly: false,
  },
  {
    onetCode: '31-9097.00', title: 'Phlebotomist', hollandCode: 'RIC', jobZone: 3,
    description: 'Draw blood samples for medical testing in labs and clinics.',
    preparation: 'Phlebotomy program (4–8 weeks)', typicalWage: '$32,000 – $45,000',
    searchKeywords: 'phlebotomist', industry: 'healthcare', fairChanceFriendly: false,
  },
  {
    onetCode: '43-3031.00', title: 'Bookkeeping / Accounting Clerk', hollandCode: 'CR', jobZone: 3,
    description: 'Track financial records for small businesses. QuickBooks fluency opens many remote-friendly roles.',
    preparation: 'Bookkeeping cert + QuickBooks', typicalWage: '$36,000 – $55,000',
    searchKeywords: 'bookkeeper accounting clerk', industry: 'services', fairChanceFriendly: false,
  },
  {
    onetCode: '11-9051.00', title: 'Food Service Manager', hollandCode: 'ES', jobZone: 3,
    description: 'Run a restaurant or food-service operation: hiring, scheduling, P&L.',
    preparation: 'Often promoted from cook/server with experience', typicalWage: '$48,000 – $70,000',
    searchKeywords: 'food service manager restaurant manager', industry: 'food_service', fairChanceFriendly: true,
  },
  {
    onetCode: '11-3071.00', title: 'Transportation / Storage / Distribution Manager', hollandCode: 'ES', jobZone: 4,
    description: 'Run logistics and warehouse operations. Typically a supervisor-track role from forklift / driver.',
    preparation: 'Experience + sometimes 2–4-yr degree', typicalWage: '$60,000 – $100,000',
    searchKeywords: 'logistics manager warehouse supervisor', industry: 'warehousing', fairChanceFriendly: true,
  },
  {
    onetCode: '39-5012.00', title: 'Hairdresser / Cosmetologist', hollandCode: 'AS', jobZone: 3,
    description: 'Cut, style, and color hair. Self-employed or salon-based.',
    preparation: 'Cosmetology school + state license', typicalWage: '$30,000 – $55,000',
    searchKeywords: 'hairdresser cosmetologist hair stylist', industry: 'services', fairChanceFriendly: true,
  },
  {
    onetCode: '39-5011.00', title: 'Barber', hollandCode: 'AS', jobZone: 3,
    description: 'Cut and style hair, primarily for men and children.',
    preparation: 'Barber school + state license', typicalWage: '$28,000 – $50,000',
    searchKeywords: 'barber', industry: 'services', fairChanceFriendly: true,
  },
];

/** Holland-letter weights when matching: primary > secondary > tertiary. */
const POSITION_WEIGHTS = [1.0, 0.6, 0.3];
const MAX_POSSIBLE_RAW = POSITION_WEIGHTS.reduce((a, b) => a + b, 0); // 1.9

/**
 * Compute fit between a user's RIASEC scores and an occupation.
 * Returns 0–100 (percent).
 *
 *   for each dimension d in occupation.hollandCode (up to 3 letters):
 *     fit += (user_score[d] / 25) * weight[position]
 *   fit_pct = (fit / 1.9) * 100
 */
export function occupationFit(
  userScores: Record<RiasecCode, number>,
  occupation: Pick<Occupation, 'hollandCode'>,
): number {
  const dims = occupation.hollandCode.toUpperCase().split('') as RiasecCode[];
  let raw = 0;
  for (let i = 0; i < dims.length && i < POSITION_WEIGHTS.length; i++) {
    const d = dims[i];
    if (d in userScores) {
      raw += (userScores[d] / 25) * POSITION_WEIGHTS[i];
    }
  }
  return Math.round((raw / MAX_POSSIBLE_RAW) * 100);
}
