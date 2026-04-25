/**
 * ZIP → { city, state, lat, lng } seed data.
 *
 * Phase-4 scope: covers the mock provider's 7 cities with ~5-7 real ZIPs
 * each, plus a few nearby ones so radius search returns sensible results.
 * Coordinates are approximate centroids from public USPS data.
 *
 * When we onboard a real provider (USAJobs, Adzuna) in Phase 4 proper,
 * swap this for a full US ZIP dataset (SimpleMaps' free 41k-row CSV).
 * The LocationService API won't change.
 */

export interface ZipRecord {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const ZIPCODES: ZipRecord[] = [
  // Cleveland, OH
  { zip: '44101', city: 'Cleveland',  state: 'OH', lat: 41.4993, lng: -81.6944 },
  { zip: '44102', city: 'Cleveland',  state: 'OH', lat: 41.4853, lng: -81.7244 },
  { zip: '44103', city: 'Cleveland',  state: 'OH', lat: 41.5177, lng: -81.6578 },
  { zip: '44113', city: 'Cleveland',  state: 'OH', lat: 41.4826, lng: -81.7006 },
  { zip: '44114', city: 'Cleveland',  state: 'OH', lat: 41.5103, lng: -81.6829 },
  { zip: '44120', city: 'Shaker Hts', state: 'OH', lat: 41.4731, lng: -81.5729 },
  { zip: '44125', city: 'Cleveland',  state: 'OH', lat: 41.4191, lng: -81.6160 },

  // Toledo, OH
  { zip: '43601', city: 'Toledo',     state: 'OH', lat: 41.6528, lng: -83.5379 },
  { zip: '43604', city: 'Toledo',     state: 'OH', lat: 41.6534, lng: -83.5355 },
  { zip: '43606', city: 'Toledo',     state: 'OH', lat: 41.6816, lng: -83.5944 },
  { zip: '43607', city: 'Toledo',     state: 'OH', lat: 41.6535, lng: -83.6103 },
  { zip: '43609', city: 'Toledo',     state: 'OH', lat: 41.6234, lng: -83.5602 },

  // Detroit, MI
  { zip: '48201', city: 'Detroit',    state: 'MI', lat: 42.3460, lng: -83.0586 },
  { zip: '48202', city: 'Detroit',    state: 'MI', lat: 42.3798, lng: -83.0749 },
  { zip: '48205', city: 'Detroit',    state: 'MI', lat: 42.4340, lng: -82.9769 },
  { zip: '48208', city: 'Detroit',    state: 'MI', lat: 42.3492, lng: -83.0927 },
  { zip: '48226', city: 'Detroit',    state: 'MI', lat: 42.3299, lng: -83.0466 },
  { zip: '48075', city: 'Southfield', state: 'MI', lat: 42.4612, lng: -83.2285 },

  // Gary, IN
  { zip: '46402', city: 'Gary',       state: 'IN', lat: 41.5960, lng: -87.3453 },
  { zip: '46403', city: 'Gary',       state: 'IN', lat: 41.6111, lng: -87.2630 },
  { zip: '46404', city: 'Gary',       state: 'IN', lat: 41.5895, lng: -87.3880 },
  { zip: '46407', city: 'Gary',       state: 'IN', lat: 41.5620, lng: -87.3389 },

  // Chicago, IL
  { zip: '60601', city: 'Chicago',    state: 'IL', lat: 41.8858, lng: -87.6181 },
  { zip: '60607', city: 'Chicago',    state: 'IL', lat: 41.8763, lng: -87.6543 },
  { zip: '60610', city: 'Chicago',    state: 'IL', lat: 41.9029, lng: -87.6367 },
  { zip: '60614', city: 'Chicago',    state: 'IL', lat: 41.9213, lng: -87.6517 },
  { zip: '60618', city: 'Chicago',    state: 'IL', lat: 41.9468, lng: -87.7020 },
  { zip: '60624', city: 'Chicago',    state: 'IL', lat: 41.8801, lng: -87.7247 },
  { zip: '60638', city: 'Chicago',    state: 'IL', lat: 41.7830, lng: -87.7738 },
  { zip: '60629', city: 'Chicago',    state: 'IL', lat: 41.7757, lng: -87.7129 },

  // Milwaukee, WI
  { zip: '53202', city: 'Milwaukee',  state: 'WI', lat: 43.0409, lng: -87.9005 },
  { zip: '53204', city: 'Milwaukee',  state: 'WI', lat: 43.0151, lng: -87.9303 },
  { zip: '53207', city: 'Milwaukee',  state: 'WI', lat: 42.9781, lng: -87.8917 },
  { zip: '53208', city: 'Milwaukee',  state: 'WI', lat: 43.0506, lng: -87.9567 },
  { zip: '53215', city: 'Milwaukee',  state: 'WI', lat: 42.9953, lng: -87.9414 },

  // Pittsburgh, PA
  { zip: '15201', city: 'Pittsburgh', state: 'PA', lat: 40.4705, lng: -79.9546 },
  { zip: '15203', city: 'Pittsburgh', state: 'PA', lat: 40.4293, lng: -79.9789 },
  { zip: '15207', city: 'Pittsburgh', state: 'PA', lat: 40.4177, lng: -79.9389 },
  { zip: '15213', city: 'Pittsburgh', state: 'PA', lat: 40.4441, lng: -79.9530 },
  { zip: '15219', city: 'Pittsburgh', state: 'PA', lat: 40.4454, lng: -79.9899 },

  // ─── Every remaining US state / DC / major territory, one major city each ───
  // Coordinates from public USPS / Census data. Used by LocationService
  // radius lookups and the Adzuna state-fill ingestion pass.
  { zip: '35203', city: 'Birmingham',    state: 'AL', lat: 33.5186, lng:  -86.8104 },
  { zip: '99501', city: 'Anchorage',     state: 'AK', lat: 61.2181, lng: -149.9003 },
  { zip: '85001', city: 'Phoenix',       state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { zip: '72201', city: 'Little Rock',   state: 'AR', lat: 34.7465, lng:  -92.2896 },
  { zip: '90001', city: 'Los Angeles',   state: 'CA', lat: 34.0522, lng: -118.2437 },
  { zip: '94102', city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { zip: '95814', city: 'Sacramento',    state: 'CA', lat: 38.5816, lng: -121.4944 },
  { zip: '80202', city: 'Denver',        state: 'CO', lat: 39.7392, lng: -104.9903 },
  { zip: '06103', city: 'Hartford',      state: 'CT', lat: 41.7637, lng:  -72.6851 },
  { zip: '19801', city: 'Wilmington',    state: 'DE', lat: 39.7447, lng:  -75.5484 },
  { zip: '20001', city: 'Washington',    state: 'DC', lat: 38.9072, lng:  -77.0369 },
  { zip: '33101', city: 'Miami',         state: 'FL', lat: 25.7617, lng:  -80.1918 },
  { zip: '32202', city: 'Jacksonville',  state: 'FL', lat: 30.3322, lng:  -81.6557 },
  { zip: '33602', city: 'Tampa',         state: 'FL', lat: 27.9506, lng:  -82.4572 },
  { zip: '30303', city: 'Atlanta',       state: 'GA', lat: 33.7490, lng:  -84.3880 },
  { zip: '96813', city: 'Honolulu',      state: 'HI', lat: 21.3069, lng: -157.8583 },
  { zip: '83702', city: 'Boise',         state: 'ID', lat: 43.6150, lng: -116.2023 },
  { zip: '50309', city: 'Des Moines',    state: 'IA', lat: 41.5868, lng:  -93.6250 },
  { zip: '67202', city: 'Wichita',       state: 'KS', lat: 37.6872, lng:  -97.3301 },
  { zip: '66603', city: 'Topeka',        state: 'KS', lat: 39.0473, lng:  -95.6752 },
  { zip: '40202', city: 'Louisville',    state: 'KY', lat: 38.2527, lng:  -85.7585 },
  { zip: '70112', city: 'New Orleans',   state: 'LA', lat: 29.9511, lng:  -90.0715 },
  { zip: '70801', city: 'Baton Rouge',   state: 'LA', lat: 30.4515, lng:  -91.1871 },
  { zip: '04101', city: 'Portland',      state: 'ME', lat: 43.6591, lng:  -70.2568 },
  { zip: '21201', city: 'Baltimore',     state: 'MD', lat: 39.2904, lng:  -76.6122 },
  { zip: '02108', city: 'Boston',        state: 'MA', lat: 42.3601, lng:  -71.0589 },
  { zip: '02139', city: 'Cambridge',     state: 'MA', lat: 42.3736, lng:  -71.1097 },
  { zip: '55401', city: 'Minneapolis',   state: 'MN', lat: 44.9778, lng:  -93.2650 },
  { zip: '55101', city: 'Saint Paul',    state: 'MN', lat: 44.9537, lng:  -93.0900 },
  { zip: '39201', city: 'Jackson',       state: 'MS', lat: 32.2988, lng:  -90.1848 },
  { zip: '64101', city: 'Kansas City',   state: 'MO', lat: 39.0997, lng:  -94.5786 },
  { zip: '63101', city: 'Saint Louis',   state: 'MO', lat: 38.6270, lng:  -90.1994 },
  { zip: '59101', city: 'Billings',      state: 'MT', lat: 45.7833, lng: -108.5007 },
  { zip: '68102', city: 'Omaha',         state: 'NE', lat: 41.2565, lng:  -95.9345 },
  { zip: '68508', city: 'Lincoln',       state: 'NE', lat: 40.8136, lng:  -96.7026 },
  { zip: '89101', city: 'Las Vegas',     state: 'NV', lat: 36.1699, lng: -115.1398 },
  { zip: '89501', city: 'Reno',          state: 'NV', lat: 39.5296, lng: -119.8138 },
  { zip: '03101', city: 'Manchester',    state: 'NH', lat: 42.9956, lng:  -71.4548 },
  { zip: '07102', city: 'Newark',        state: 'NJ', lat: 40.7357, lng:  -74.1724 },
  { zip: '08608', city: 'Trenton',       state: 'NJ', lat: 40.2206, lng:  -74.7597 },
  { zip: '87102', city: 'Albuquerque',   state: 'NM', lat: 35.0844, lng: -106.6504 },
  { zip: '10001', city: 'New York',      state: 'NY', lat: 40.7128, lng:  -74.0060 },
  { zip: '10007', city: 'New York',      state: 'NY', lat: 40.7131, lng:  -74.0055 },
  { zip: '11201', city: 'Brooklyn',      state: 'NY', lat: 40.6944, lng:  -73.9906 },
  { zip: '14202', city: 'Buffalo',       state: 'NY', lat: 42.8864, lng:  -78.8784 },
  { zip: '28202', city: 'Charlotte',     state: 'NC', lat: 35.2271, lng:  -80.8431 },
  { zip: '27601', city: 'Raleigh',       state: 'NC', lat: 35.7796, lng:  -78.6382 },
  { zip: '58102', city: 'Fargo',         state: 'ND', lat: 46.8772, lng:  -96.7898 },
  { zip: '58501', city: 'Bismarck',      state: 'ND', lat: 46.8083, lng: -100.7837 },
  { zip: '73102', city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng:  -97.5164 },
  { zip: '74103', city: 'Tulsa',         state: 'OK', lat: 36.1540, lng:  -95.9928 },
  { zip: '97201', city: 'Portland',      state: 'OR', lat: 45.5152, lng: -122.6784 },
  { zip: '02903', city: 'Providence',    state: 'RI', lat: 41.8240, lng:  -71.4128 },
  { zip: '29201', city: 'Columbia',      state: 'SC', lat: 34.0007, lng:  -81.0348 },
  { zip: '29401', city: 'Charleston',    state: 'SC', lat: 32.7765, lng:  -79.9311 },
  { zip: '57104', city: 'Sioux Falls',   state: 'SD', lat: 43.5460, lng:  -96.7313 },
  { zip: '37203', city: 'Nashville',     state: 'TN', lat: 36.1627, lng:  -86.7816 },
  { zip: '38103', city: 'Memphis',       state: 'TN', lat: 35.1495, lng:  -90.0490 },
  { zip: '77002', city: 'Houston',       state: 'TX', lat: 29.7604, lng:  -95.3698 },
  { zip: '75201', city: 'Dallas',        state: 'TX', lat: 32.7767, lng:  -96.7970 },
  { zip: '78701', city: 'Austin',        state: 'TX', lat: 30.2672, lng:  -97.7431 },
  { zip: '78205', city: 'San Antonio',   state: 'TX', lat: 29.4241, lng:  -98.4936 },
  { zip: '84101', city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
  { zip: '05401', city: 'Burlington',    state: 'VT', lat: 44.4759, lng:  -73.2121 },
  { zip: '23219', city: 'Richmond',      state: 'VA', lat: 37.5407, lng:  -77.4360 },
  { zip: '23510', city: 'Norfolk',       state: 'VA', lat: 36.8508, lng:  -76.2859 },
  { zip: '98101', city: 'Seattle',       state: 'WA', lat: 47.6062, lng: -122.3321 },
  { zip: '99201', city: 'Spokane',       state: 'WA', lat: 47.6588, lng: -117.4260 },
  { zip: '25301', city: 'Charleston',    state: 'WV', lat: 38.3498, lng:  -81.6326 },
  { zip: '82001', city: 'Cheyenne',      state: 'WY', lat: 41.1400, lng: -104.8202 },
  // Territories
  { zip: '00901', city: 'San Juan',         state: 'PR', lat: 18.4655, lng:  -66.1057 },
  { zip: '96910', city: 'Hagatna',          state: 'GU', lat: 13.4443, lng:  144.7937 },
  { zip: '00802', city: 'Charlotte Amalie', state: 'VI', lat: 18.3419, lng:  -64.9307 },
];

export const ZIP_LOOKUP: ReadonlyMap<string, ZipRecord> = new Map(
  ZIPCODES.map((z) => [z.zip, z] as const),
);

/** City+state → representative ZIP (first match). Used to backfill mock jobs. */
export const CITY_STATE_TO_ZIP: ReadonlyMap<string, string> = new Map(
  ZIPCODES.map((z) => [`${z.city.toLowerCase()}|${z.state}`, z.zip] as const),
);
