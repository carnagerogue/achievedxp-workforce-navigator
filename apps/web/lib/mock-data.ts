/**
 * Bundled mock dataset used by the in-app API route handlers under
 * /api/v1/*. Lets the web frontend stand on its own when the NestJS
 * backend isn't deployed — useful for portfolio demos and PR previews.
 *
 * The handlers under app/api/v1 read from these helpers; nothing else
 * in the app should import this file directly.
 */

import type {
  JobDto,
  PaginatedJobsDto,
  JobsStatsDto,
  MatchesResponseDto,
  InsightsResponseDto,
  ScoredJobDto,
  PublicJobSummaryDto,
  AvoidJobDto,
  RiskTier,
  CandidateProfile,
  CompatibilityRating,
  JobInput,
} from '@dxp/shared';
import { scoreJobCompatibility, isOffenseHardBlocked, convictionForOffenseType } from '@dxp/shared';
import {
  getProfile,
  candidateProfilesFromStored,
  convictionTypesFor,
  type StoredProfile,
} from './profile-store';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(NOW + n * DAY).toISOString();

type SeedJob = {
  title: string;
  company: string;
  city: string;
  region: string;
  postal: string;
  industry: string;
  salaryMin: number;
  salaryMax: number;
  riskTier: RiskTier;
  excludesFelons: boolean;
  backgroundCheckLikely: boolean;
  remote?: boolean;
  isApprenticeship?: boolean;
  employmentType?: JobDto['employmentType'];
  skills: string[];
  certs: string[];
  minYears: number;
  postedDaysAgo: number;
  description: string;
  source: { code: string; name: string };
};

const SOURCES = {
  usajobs:   { code: 'usajobs',   name: 'USAJobs' },
  adzuna:    { code: 'adzuna',    name: 'Adzuna' },
  remotive:  { code: 'remotive',  name: 'Remotive' },
  jooble:    { code: 'jooble',    name: 'Jooble' },
  serpapi:   { code: 'serpapi',   name: 'Google Jobs' },
  direct:    { code: 'direct',    name: 'Employer direct' },
};

const SEED_JOBS: SeedJob[] = [
  {
    title: 'Warehouse Associate — Night Shift',
    company: 'NorthStar Logistics',
    city: 'Renton', region: 'WA', postal: '98057', industry: 'warehousing',
    salaryMin: 42000, salaryMax: 52000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['warehouse_operations', 'forklift_operation', 'picking_packing'],
    certs: ['osha_forklift'], minYears: 0, postedDaysAgo: 2,
    description:
      'Pick, pack, and stage outbound orders on the overnight shift. ' +
      'Reach truck and stand-up forklift training provided. Steel-toe ' +
      'boots required; full benefits after 60 days. No background ' +
      'check for warehouse roles.',
    source: SOURCES.direct,
  },
  {
    title: 'CDL-A Regional Driver',
    company: 'Cascade Freight Co.',
    city: 'Tacoma', region: 'WA', postal: '98402', industry: 'transportation',
    salaryMin: 68000, salaryMax: 92000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['commercial_driving', 'route_driving'],
    certs: ['cdl_a'], minYears: 1, postedDaysAgo: 4,
    description:
      'Home weekends. Dedicated lanes across WA / OR / ID. Newer ' +
      'Freightliner Cascadia fleet. Past felonies considered ' +
      'individually — non-violent records welcome.',
    source: SOURCES.jooble,
  },
  {
    title: 'Building Maintenance Tech',
    company: 'Pacific Property Group',
    city: 'Seattle', region: 'WA', postal: '98101', industry: 'services',
    salaryMin: 52000, salaryMax: 64000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['maintenance', 'plumbing', 'electrical', 'hvac'],
    certs: ['epa_608'], minYears: 2, postedDaysAgo: 6,
    description:
      'Multi-site maintenance covering 14 buildings in downtown ' +
      'Seattle. Independent route. Fair-chance employer; reviews ' +
      'background individually with chance to respond.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Line Cook',
    company: 'Harbor Grill',
    city: 'Bellingham', region: 'WA', postal: '98225', industry: 'food_service',
    salaryMin: 36000, salaryMax: 46000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['cooking', 'food_prep', 'grilling'],
    certs: ['servsafe', 'food_handler_card'], minYears: 0, postedDaysAgo: 1,
    description:
      'Busy waterfront grill, evening service. Will train candidates ' +
      'with prior kitchen experience. Tip share included. No ' +
      'background check.',
    source: SOURCES.remotive,
  },
  {
    title: 'Electrical Apprentice (Year 1)',
    company: 'IBEW Local 46',
    city: 'Kent', region: 'WA', postal: '98032', industry: 'construction',
    salaryMin: 44000, salaryMax: 58000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    isApprenticeship: true,
    skills: ['electrical', 'general_labor'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 9,
    description:
      'Paid apprenticeship. Earn while you learn — wages step up ' +
      'each year. Indentures begin quarterly. Open to candidates ' +
      'with records; the program does not run background checks on ' +
      'apprentices.',
    source: SOURCES.direct,
  },
  {
    title: 'Janitorial Lead — Office Buildings',
    company: 'Evergreen Facility Services',
    city: 'Bellevue', region: 'WA', postal: '98004', industry: 'cleaning',
    salaryMin: 38000, salaryMax: 47000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['janitorial', 'cleaning', 'maintenance'],
    certs: [], minYears: 1, postedDaysAgo: 3,
    description:
      'Lead a 4-person crew, 6pm–2am, three Class-A office towers. ' +
      'Reliable transportation required. Fair-chance friendly.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Welder — Structural Steel',
    company: 'Kitsap Iron Works',
    city: 'Bremerton', region: 'WA', postal: '98337', industry: 'manufacturing',
    salaryMin: 58000, salaryMax: 78000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['welding', 'machining', 'sheet_metal'],
    certs: ['aws_certified_welder', 'osha_10'], minYears: 2, postedDaysAgo: 5,
    description:
      'Day-shift MIG/flux-core on heavy structural plate. Weld test ' +
      'on day one. No background check. OT routinely available.',
    source: SOURCES.direct,
  },
  {
    title: 'Forklift Operator — Distribution Center',
    company: 'BlueRiver Distribution',
    city: 'Auburn', region: 'WA', postal: '98001', industry: 'warehousing',
    salaryMin: 44000, salaryMax: 54000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['forklift_operation', 'reach_truck', 'warehouse_operations'],
    certs: ['osha_forklift'], minYears: 1, postedDaysAgo: 7,
    description:
      'Sit-down and reach truck. 4-on / 4-off schedule. Boot and ' +
      'safety glasses provided. Fair-chance employer.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Auto Service Tech (Tires + Brakes)',
    company: 'PitStop Auto',
    city: 'Lakewood', region: 'WA', postal: '98499', industry: 'automotive',
    salaryMin: 42000, salaryMax: 58000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['auto_repair', 'tire_install', 'small_engine'],
    certs: [], minYears: 0, postedDaysAgo: 11,
    description:
      'Hourly + commission. Will train motivated candidates. Past ' +
      'records considered on a case-by-case basis; non-driving ' +
      'positions available.',
    source: SOURCES.serpapi,
  },
  {
    title: 'Landscape Crew Member',
    company: 'Greenline Landscapes',
    city: 'Olympia', region: 'WA', postal: '98501', industry: 'landscaping',
    salaryMin: 34000, salaryMax: 44000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['landscaping', 'general_labor', 'tractor_operation'],
    certs: [], minYears: 0, postedDaysAgo: 1,
    description:
      'Residential and small commercial properties. Crew lead trains ' +
      'on equipment. Year-round work — snow removal in winter.',
    source: SOURCES.jooble,
  },
  {
    title: 'Manufacturing Production Operator',
    company: 'Cascade Polymers',
    city: 'Vancouver', region: 'WA', postal: '98660', industry: 'manufacturing',
    salaryMin: 46000, salaryMax: 58000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['general_labor', 'machining', 'maintenance'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 8,
    description:
      'Run extrusion and pelletizing lines. Rotating 12-hour shifts. ' +
      'Step raises every 6 months. No background check.',
    source: SOURCES.direct,
  },
  {
    title: 'HVAC Apprentice',
    company: 'NW Mechanical',
    city: 'Spokane', region: 'WA', postal: '99201', industry: 'construction',
    salaryMin: 42000, salaryMax: 55000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    isApprenticeship: true,
    skills: ['hvac', 'general_labor'],
    certs: [], minYears: 0, postedDaysAgo: 12,
    description:
      'Paid 4-year apprenticeship leading to journey-level wages. ' +
      'High school diploma or equivalent. Open to applicants with ' +
      'records.',
    source: SOURCES.direct,
  },
  {
    title: 'Concrete Finisher',
    company: 'Foundation Builders LLC',
    city: 'Spokane Valley', region: 'WA', postal: '99216', industry: 'construction',
    salaryMin: 48000, salaryMax: 64000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['concrete', 'masonry', 'general_labor'],
    certs: ['osha_10'], minYears: 1, postedDaysAgo: 3,
    description:
      'Commercial flatwork and tilt-ups. Crew of 6. Truck allowance. ' +
      'Fair-chance employer.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Custodian — Public Schools',
    company: 'Spokane Public Schools',
    city: 'Spokane', region: 'WA', postal: '99202', industry: 'cleaning',
    salaryMin: 36000, salaryMax: 44000, riskTier: 'HIGH',
    excludesFelons: true, backgroundCheckLikely: true,
    skills: ['janitorial', 'cleaning', 'maintenance'],
    certs: [], minYears: 0, postedDaysAgo: 10,
    description:
      'Note: state law requires a clean background check for any ' +
      'role with student contact. Specific disqualifying offenses ' +
      'listed in RCW 28A.400.303.',
    source: SOURCES.usajobs,
  },
  {
    title: 'Carpenter Helper',
    company: 'Sound Construction',
    city: 'Everett', region: 'WA', postal: '98201', industry: 'construction',
    salaryMin: 40000, salaryMax: 52000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['carpentry', 'general_labor', 'drywall'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 6,
    description:
      'Residential framing and finish work. Will train. Steel-toe ' +
      'boots required. Fair-chance employer.',
    source: SOURCES.jooble,
  },
  {
    title: 'Customer Service Rep — Inbound (Remote)',
    company: 'Northbound Support',
    city: 'Remote', region: 'WA', postal: '00000', industry: 'services',
    salaryMin: 38000, salaryMax: 46000, riskTier: 'LOW', remote: true,
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['customer_service', 'phone_support', 'computer_literacy'],
    certs: [], minYears: 0, postedDaysAgo: 2,
    description:
      'Fully remote. Inbound only — no cold calls. Equipment ' +
      'provided. Fair-chance hiring.',
    source: SOURCES.remotive,
  },
  {
    title: 'Delivery Driver — Local Routes',
    company: 'Coastal Delivery Co.',
    city: 'Portland', region: 'OR', postal: '97201', industry: 'transportation',
    salaryMin: 42000, salaryMax: 55000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['delivery_driving', 'box_truck_driving', 'route_planning'],
    certs: [], minYears: 0, postedDaysAgo: 5,
    description:
      'Local routes, home daily. Class C; CDL not required. Clean ' +
      'driving record needed. Fair-chance employer — past records ' +
      'considered individually.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Production Line Worker',
    company: 'Willamette Foods',
    city: 'Salem', region: 'OR', postal: '97301', industry: 'manufacturing',
    salaryMin: 38000, salaryMax: 46000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['general_labor', 'food_prep'],
    certs: ['food_handler_card'], minYears: 0, postedDaysAgo: 4,
    description:
      'Bottling and packaging line. Multiple shifts. No background ' +
      'check.',
    source: SOURCES.direct,
  },
  {
    title: 'CNA — Long Term Care',
    company: 'Riverstone Care Center',
    city: 'Boise', region: 'ID', postal: '83702', industry: 'healthcare',
    salaryMin: 38000, salaryMax: 48000, riskTier: 'HIGH',
    excludesFelons: true, backgroundCheckLikely: true,
    skills: ['customer_service'],
    certs: ['cna', 'cpr'], minYears: 0, postedDaysAgo: 14,
    description:
      'Long-term care facility. State licensing rules disqualify ' +
      'most felonies for direct-patient roles.',
    source: SOURCES.serpapi,
  },
  {
    title: 'Logistics Coordinator',
    company: 'Pacific Crossing Logistics',
    city: 'Boise', region: 'ID', postal: '83704', industry: 'logistics',
    salaryMin: 48000, salaryMax: 62000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['shipping_receiving', 'inventory_management', 'computer_literacy', 'excel'],
    certs: [], minYears: 1, postedDaysAgo: 7,
    description:
      'Coordinate inbound + outbound shipments. Heavy spreadsheet ' +
      'use. Will train on TMS. Fair-chance employer.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Roofing Crew Member',
    company: 'Summit Roofing',
    city: 'Sacramento', region: 'CA', postal: '95814', industry: 'construction',
    salaryMin: 44000, salaryMax: 58000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['roofing', 'general_labor'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 2,
    description:
      'Residential reroofs. Will train candidates not afraid of ' +
      'heights. Fall protection provided. Open to people with ' +
      'records.',
    source: SOURCES.jooble,
  },
  {
    title: 'Cook II — Hotel Restaurant',
    company: 'Cypress Hotel Group',
    city: 'San Diego', region: 'CA', postal: '92101', industry: 'food_service',
    salaryMin: 40000, salaryMax: 52000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['cooking', 'grilling', 'food_prep'],
    certs: ['servsafe'], minYears: 1, postedDaysAgo: 8,
    description:
      'AAA Four Diamond property. Mediterranean menu. Tip pool. ' +
      'Fair-chance hiring policy.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Plumber Apprentice',
    company: 'UA Local 290',
    city: 'Portland', region: 'OR', postal: '97214', industry: 'construction',
    salaryMin: 42000, salaryMax: 56000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    isApprenticeship: true,
    skills: ['plumbing', 'general_labor'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 13,
    description:
      'Paid 5-year apprenticeship. Drug test on intake. Open to ' +
      'candidates with records.',
    source: SOURCES.direct,
  },
  {
    title: 'Sanitation Worker',
    company: 'Metro Waste Services',
    city: 'Minneapolis', region: 'MN', postal: '55401', industry: 'sanitation',
    salaryMin: 44000, salaryMax: 56000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['general_labor', 'recycling_waste'],
    certs: [], minYears: 0, postedDaysAgo: 4,
    description:
      'Curb-side residential routes. 4-day workweek. Strong ' +
      'fair-chance hiring track record — over 30% of our team has ' +
      'past records.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Forklift Operator',
    company: 'Twin Cities Cold Storage',
    city: 'St. Paul', region: 'MN', postal: '55101', industry: 'warehousing',
    salaryMin: 42000, salaryMax: 52000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['forklift_operation', 'warehouse_operations', 'reach_truck'],
    certs: ['osha_forklift'], minYears: 1, postedDaysAgo: 6,
    description:
      'Freezer (-10°F) environment. Cold-weather gear provided. No ' +
      'background check.',
    source: SOURCES.direct,
  },
  {
    title: 'Heavy Equipment Operator (Bobcat)',
    company: 'Northland Excavating',
    city: 'Duluth', region: 'MN', postal: '55802', industry: 'construction',
    salaryMin: 50000, salaryMax: 66000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['bobcat_skid_steer', 'excavator', 'backhoe'],
    certs: ['osha_10'], minYears: 2, postedDaysAgo: 5,
    description:
      'Site prep and excavation. Seasonal layoffs in deep winter; ' +
      'crews come back in March. Open to records.',
    source: SOURCES.jooble,
  },
  {
    title: 'Retail Associate — Garden Center',
    company: 'Heartland Home Supply',
    city: 'Des Moines', region: 'IA', postal: '50309', industry: 'retail',
    salaryMin: 32000, salaryMax: 40000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['retail_sales', 'cashiering', 'customer_service'],
    certs: [], minYears: 0, postedDaysAgo: 3,
    description:
      'Seasonal hire with year-round potential. Background check ' +
      'standard but applied individually under Iowa fair-chance ' +
      'guidance.',
    source: SOURCES.serpapi,
  },
  {
    title: 'CDL-B Local Driver',
    company: 'Prairie State Beverage',
    city: 'Chicago', region: 'IL', postal: '60601', industry: 'transportation',
    salaryMin: 54000, salaryMax: 68000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['commercial_driving', 'delivery_driving', 'route_driving'],
    certs: ['cdl_b'], minYears: 1, postedDaysAgo: 9,
    description:
      'Beverage distribution, home daily. Touch freight; will train ' +
      'on pallet jack. Past records reviewed individually.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Mechanic — Diesel Truck',
    company: 'Midwest Fleet Services',
    city: 'Indianapolis', region: 'IN', postal: '46225', industry: 'automotive',
    salaryMin: 56000, salaryMax: 78000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['auto_repair', 'small_engine', 'maintenance'],
    certs: [], minYears: 2, postedDaysAgo: 4,
    description:
      'Heavy-duty truck repair. Tool allowance. Boot stipend. ' +
      'Fair-chance employer.',
    source: SOURCES.direct,
  },
  {
    title: 'Custodial Worker — Federal Building',
    company: 'GSA Region 7',
    city: 'Kansas City', region: 'MO', postal: '64108', industry: 'government',
    salaryMin: 38000, salaryMax: 46000, riskTier: 'HIGH',
    excludesFelons: true, backgroundCheckLikely: true,
    skills: ['janitorial', 'cleaning'],
    certs: [], minYears: 0, postedDaysAgo: 11,
    description:
      'Federal security clearance required — most felony convictions ' +
      'disqualifying. Posting included so candidates can see what to ' +
      'avoid based on background.',
    source: SOURCES.usajobs,
  },
  {
    title: 'Warehouse Selector — Night',
    company: 'Southeast Food Service',
    city: 'Atlanta', region: 'GA', postal: '30303', industry: 'warehousing',
    salaryMin: 46000, salaryMax: 58000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['warehouse_operations', 'picking_packing', 'pallet_jack'],
    certs: ['osha_forklift'], minYears: 0, postedDaysAgo: 1,
    description:
      'Voice-pick environment. $1.50 night-shift differential. ' +
      'No background check.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Painter — Commercial',
    company: 'Capital Painting',
    city: 'Austin', region: 'TX', postal: '78701', industry: 'construction',
    salaryMin: 42000, salaryMax: 56000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['painting', 'painting_residential', 'general_labor'],
    certs: ['osha_10'], minYears: 1, postedDaysAgo: 7,
    description:
      'Commercial interior + exterior. Spray, brush, and roll. ' +
      'Fair-chance hiring.',
    source: SOURCES.jooble,
  },
  {
    title: 'Welder Helper',
    company: 'Gulf Coast Fabrication',
    city: 'Houston', region: 'TX', postal: '77002', industry: 'manufacturing',
    salaryMin: 40000, salaryMax: 50000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['welding', 'general_labor', 'sheet_metal'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 3,
    description:
      'Fitter / helper to journey-level welders. Will train. Path ' +
      'to AWS certification on the company dime.',
    source: SOURCES.direct,
  },
  {
    title: 'Tire Technician',
    company: 'Big Country Tire',
    city: 'Phoenix', region: 'AZ', postal: '85001', industry: 'automotive',
    salaryMin: 36000, salaryMax: 44000, riskTier: 'MEDIUM',
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['tire_install', 'auto_repair', 'customer_service'],
    certs: [], minYears: 0, postedDaysAgo: 5,
    description:
      'Will train. Bonus opportunities. Past records considered ' +
      'individually under Arizona fair-chance guidance.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Construction Laborer',
    company: 'Sunbelt General Contractors',
    city: 'Las Vegas', region: 'NV', postal: '89101', industry: 'construction',
    salaryMin: 40000, salaryMax: 54000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['general_labor', 'concrete', 'drywall'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 2,
    description:
      'Commercial buildouts. Steel-toe boots provided after first ' +
      'paycheck. No background check.',
    source: SOURCES.jooble,
  },
  {
    title: 'Cook — High Volume',
    company: 'Roadside Diner Co.',
    city: 'Denver', region: 'CO', postal: '80202', industry: 'food_service',
    salaryMin: 38000, salaryMax: 48000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['cooking', 'grilling', 'food_prep'],
    certs: ['servsafe'], minYears: 0, postedDaysAgo: 6,
    description:
      'Breakfast diner, 4am start. Tip share. Strong fair-chance ' +
      'hiring record.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Driller / Excavation Helper',
    company: 'Frontier Drilling',
    city: 'Casper', region: 'WY', postal: '82601', industry: 'energy_utilities',
    salaryMin: 56000, salaryMax: 74000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['general_labor', 'excavator', 'bobcat_skid_steer'],
    certs: ['osha_10'], minYears: 0, postedDaysAgo: 10,
    description:
      'Hitches of 14-on / 7-off. Company truck. Open to candidates ' +
      'with records — drug test on intake only.',
    source: SOURCES.direct,
  },
  {
    title: 'Junior Network Tech (Remote-Optional)',
    company: 'Cascade IT Partners',
    city: 'Seattle', region: 'WA', postal: '98109', industry: 'it_general',
    salaryMin: 52000, salaryMax: 66000, riskTier: 'MEDIUM', remote: true,
    excludesFelons: false, backgroundCheckLikely: true,
    skills: ['computer_repair', 'networking', 'customer_service'],
    certs: ['comptia_a_plus', 'comptia_network_plus'], minYears: 0, postedDaysAgo: 4,
    description:
      'Help-desk + on-site networking work for SMB clients. Will ' +
      'train. Background check standard but applied individually.',
    source: SOURCES.adzuna,
  },
  {
    title: 'Phlebotomy Technician',
    company: 'Mercy Lab Services',
    city: 'Cleveland', region: 'OH', postal: '44113', industry: 'healthcare',
    salaryMin: 36000, salaryMax: 44000, riskTier: 'HIGH',
    excludesFelons: true, backgroundCheckLikely: true,
    skills: ['customer_service'],
    certs: ['phlebotomy', 'cpr'], minYears: 0, postedDaysAgo: 15,
    description:
      'Health-system role. State board may disqualify certain ' +
      'convictions for direct-patient roles. Apply if record is ' +
      'older or unrelated.',
    source: SOURCES.serpapi,
  },
  {
    title: 'Manufacturing Maintenance Tech',
    company: 'Crown Steel',
    city: 'Pittsburgh', region: 'PA', postal: '15222', industry: 'manufacturing',
    salaryMin: 58000, salaryMax: 78000, riskTier: 'LOW',
    excludesFelons: false, backgroundCheckLikely: false,
    skills: ['maintenance', 'electrical', 'machining', 'welding'],
    certs: ['osha_10'], minYears: 2, postedDaysAgo: 8,
    description:
      'Heavy industrial. 12-hour rotating shifts. Strong union ' +
      'shop. Fair-chance employer.',
    source: SOURCES.direct,
  },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const JOBS: JobDto[] = SEED_JOBS.map((s, i) => {
  const id = `${slug(s.company)}-${slug(s.title)}-${i}`.slice(0, 80);
  return {
    id,
    title: s.title,
    company: s.company,
    description: s.description,
    descriptionHtml: null,
    applyUrl: `https://example.com/apply/${id}`,
    locationCity: s.city,
    locationRegion: s.region,
    locationPostalCode: s.postal,
    locationCountry: 'US',
    remote: !!s.remote,
    employmentType: s.employmentType ?? 'FULL_TIME',
    industry: s.industry,
    salaryMin: s.salaryMin,
    salaryMax: s.salaryMax,
    salaryCurrency: 'USD',
    requiredSkills: s.skills,
    requiredCertifications: s.certs,
    minYearsExperience: s.minYears,
    riskTier: s.riskTier,
    backgroundCheckLikely: s.backgroundCheckLikely,
    excludesFelons: s.excludesFelons,
    isApprenticeship: !!s.isApprenticeship,
    postedAt: daysAgo(s.postedDaysAgo),
    expiresAt: daysAhead(45 - s.postedDaysAgo),
    sourceCode: s.source.code,
    sourceName: s.source.name,
  };
});

// ────────────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────────────

export interface JobsQuery {
  q?: string;
  industry?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  radiusMiles?: number;
  offenseType?: string;
  hideFelonExclusions?: boolean;
  minSalary?: number;
  postedWithinDays?: number;
  apprenticeshipsOnly?: boolean;
  limit?: number;
  offset?: number;
}

export function filterJobs(query: JobsQuery, source: JobDto[] = JOBS): PaginatedJobsDto {
  let pool = source.slice();

  if (query.q) {
    const needle = query.q.toLowerCase();
    pool = pool.filter((j) =>
      j.title.toLowerCase().includes(needle) ||
      j.company.toLowerCase().includes(needle) ||
      j.description.toLowerCase().includes(needle) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(needle)) ||
      j.requiredCertifications.some((c) => c.toLowerCase().includes(needle)),
    );
  }

  if (query.industry) {
    pool = pool.filter((j) => j.industry === query.industry);
  }

  if (query.region) {
    pool = pool.filter((j) => j.locationRegion === query.region);
  }

  if (query.city) {
    const needle = query.city.toLowerCase();
    pool = pool.filter((j) => (j.locationCity ?? '').toLowerCase().includes(needle));
  }

  if (query.postalCode) {
    // Bucket by first 2 zip digits — close enough for a demo of radius search.
    const prefix = query.postalCode.slice(0, 2);
    pool = pool.filter((j) => (j.locationPostalCode ?? '').startsWith(prefix));
  }

  if (query.hideFelonExclusions) {
    pool = pool.filter((j) => !j.excludesFelons);
  }

  if (query.minSalary && query.minSalary > 0) {
    pool = pool.filter((j) => (j.salaryMax ?? 0) >= query.minSalary!);
  }

  if (query.postedWithinDays && query.postedWithinDays > 0) {
    const cutoff = NOW - query.postedWithinDays * DAY;
    pool = pool.filter((j) => j.postedAt && new Date(j.postedAt).getTime() >= cutoff);
  }

  if (query.apprenticeshipsOnly) {
    pool = pool.filter((j) => j.isApprenticeship);
  }

  // Conviction-aware exclusion. When a conviction type is supplied we drop
  // only jobs with a CATEGORICAL legal/licensing bar for that conviction
  // (e.g. registry-related + school custodian). Graded "low chance but
  // possible" roles are intentionally left in so the Browse page can still
  // re-rank and rate them — the chance-band control on the client removes
  // those if the user wants. Previously this param was silently ignored.
  if (query.offenseType) {
    const conviction = convictionForOffenseType(query.offenseType);
    pool = pool.filter(
      (j) => !isOffenseHardBlocked(conviction, { industry: j.industry, title: j.title }).blocked,
    );
  }

  const total = pool.length;
  const offset = Math.max(0, query.offset ?? 0);
  const limit  = Math.max(1, Math.min(200, query.limit ?? 50));
  const results = pool.slice(offset, offset + limit);

  return { total, limit, offset, results };
}

export function findJob(id: string, source: JobDto[] = JOBS): JobDto | undefined {
  return source.find((j) => j.id === id);
}

export function jobsByIds(ids: string[], source: JobDto[] = JOBS): JobDto[] {
  const set = new Set(ids);
  return source.filter((j) => set.has(j.id));
}

export function similarJobs(id: string, limit: number, source: JobDto[] = JOBS): JobDto[] {
  const seed = findJob(id, source);
  if (!seed) return [];
  return source
    .filter((j) => j.id !== id)
    .map((j) => ({ j, score: similarity(seed, j) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.j);
}

function similarity(a: JobDto, b: JobDto): number {
  let score = 0;
  if (a.industry && a.industry === b.industry) score += 4;
  if (a.locationRegion && a.locationRegion === b.locationRegion) score += 2;
  if (a.riskTier === b.riskTier) score += 1;
  if (a.isApprenticeship === b.isApprenticeship) score += 1;
  const overlap = a.requiredSkills.filter((s) => b.requiredSkills.includes(s)).length;
  score += overlap;
  return score;
}

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────

export function jobsStats(source: JobDto[] = JOBS): JobsStatsDto {
  const countBy = <T extends string>(
    keyFn: (j: JobDto) => T | null | undefined,
  ): Array<{ key: T; count: number }> => {
    const m = new Map<T, number>();
    for (const j of source) {
      const k = keyFn(j);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const pretty = (s: string) =>
    s.split(/[_\s-]+/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');

  const byIndustry = countBy<string>((j) => j.industry).map((x) => ({
    key: x.key, label: pretty(x.key), count: x.count,
  }));
  const byRegion = countBy<string>((j) => j.locationRegion).map((x) => ({
    key: x.key, label: x.key, count: x.count,
  }));
  const bySource = countBy<string>((j) => j.sourceCode).map((x) => ({
    key: x.key, label: pretty(x.key), count: x.count,
  }));
  const byRiskTier = countBy<string>((j) => j.riskTier).map((x) => ({
    key: x.key, label: x.key, count: x.count,
  }));

  const skillsMap = new Map<string, number>();
  for (const j of source) for (const s of j.requiredSkills) skillsMap.set(s, (skillsMap.get(s) ?? 0) + 1);
  const topSkills = Array.from(skillsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, label: pretty(key), count }));

  const certsMap = new Map<string, number>();
  for (const j of source) for (const c of j.requiredCertifications) certsMap.set(c, (certsMap.get(c) ?? 0) + 1);
  const topCertifications = Array.from(certsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, label: pretty(key), count }));

  const salaryBands = [
    { label: '< $40k',     min: 0,     max: 40000 },
    { label: '$40k–$55k',  min: 40000, max: 55000 },
    { label: '$55k–$70k',  min: 55000, max: 70000 },
    { label: '$70k+',      min: 70000, max: null as number | null },
  ].map((b) => ({
    label: b.label,
    min: b.min,
    max: b.max,
    count: source.filter((j) => {
      const mid = ((j.salaryMin ?? 0) + (j.salaryMax ?? 0)) / 2;
      return mid >= b.min && (b.max == null || mid < b.max);
    }).length,
  }));

  const fairChanceFriendly = source.filter((j) => !j.excludesFelons && j.riskTier !== 'HIGH').length;
  const remote = source.filter((j) => j.remote).length;
  const apprenticeships = source.filter((j) => j.isApprenticeship).length;
  const withSalary = source.filter((j) => j.salaryMin && j.salaryMax).length;
  const postedLast7Days = source.filter((j) =>
    j.postedAt && new Date(j.postedAt).getTime() >= NOW - 7 * DAY,
  ).length;
  const postedLast30Days = source.filter((j) =>
    j.postedAt && new Date(j.postedAt).getTime() >= NOW - 30 * DAY,
  ).length;

  return {
    totals: {
      active: source.length,
      fairChanceFriendly,
      remote,
      apprenticeships,
      withSalary,
      postedLast7Days,
      postedLast30Days,
    },
    byIndustry,
    byRegion,
    bySource,
    byRiskTier,
    salaryBands,
    topCertifications,
    topSkills,
  };
}

// ────────────────────────────────────────────────────────────────────
// Matches + insights (rule-based mock scoring)
// ────────────────────────────────────────────────────────────────────

function publicSummary(j: JobDto): PublicJobSummaryDto {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    locationCity: j.locationCity,
    locationRegion: j.locationRegion,
    industry: j.industry,
    riskTier: j.riskTier,
    backgroundCheckLikely: j.backgroundCheckLikely,
    excludesFelons: j.excludesFelons,
    applyUrl: j.applyUrl,
    postedAt: j.postedAt,
  };
}

function jobToInput(j: JobDto): JobInput {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    description: j.description,
    industry: j.industry,
    riskTier: j.riskTier,
    excludesFelons: j.excludesFelons,
    backgroundCheckLikely: j.backgroundCheckLikely,
    isApprenticeship: j.isApprenticeship,
    remote: j.remote,
    locationRegion: j.locationRegion,
    locationCity: j.locationCity,
    requiredSkills: j.requiredSkills,
    requiredCertifications: j.requiredCertifications,
  };
}

/**
 * Worst-case conviction compatibility across every conviction a person
 * carries. Fair-chance stance: never over-promise — the lowest-scoring
 * conviction governs the match. `candidates` is always non-empty.
 */
function worstCompatibility(job: JobDto, candidates: CandidateProfile[]): CompatibilityRating {
  const input = jobToInput(job);
  let worst = scoreJobCompatibility(candidates[0], input);
  for (let i = 1; i < candidates.length; i++) {
    const r = scoreJobCompatibility(candidates[i], input);
    if (r.score < worst.score) worst = r;
  }
  return worst;
}

interface PersonalizationResult {
  total: number;
  breakdown: ScoredJobDto['breakdown'];
}

/**
 * 0–100 personalization fit from the stored profile (skills, certs,
 * industry preference, experience, location, risk tier). Mirrors the
 * NestJS RuleScorer component weights so the two backends agree.
 */
function personalizationScore(profile: StoredProfile | null, j: JobDto): PersonalizationResult {
  const lower = (xs: string[] | undefined) => new Set((xs ?? []).map((s) => s.toLowerCase()));
  const skills = lower(profile?.skills);
  const certs = lower(profile?.certifications);
  const desired = lower(profile?.desiredIndustries);

  // industry (0..25)
  let industry: number;
  if (!j.industry) industry = 12;
  else if (desired.size === 0) industry = 13;
  else industry = desired.has(j.industry.toLowerCase()) ? 25 : 6;

  // skills (0..25) — no requirement = neutral half credit
  let skillsPts: number;
  if (j.requiredSkills.length === 0) skillsPts = 13;
  else {
    const matched = j.requiredSkills.filter((s) => skills.has(s.toLowerCase())).length;
    skillsPts = Math.round(25 * (matched / j.requiredSkills.length));
  }

  // certifications (0..15) — no requirement = full credit (no barrier)
  let certPts: number;
  if (j.requiredCertifications.length === 0) certPts = 15;
  else {
    const matched = j.requiredCertifications.filter((c) => certs.has(c.toLowerCase())).length;
    certPts = Math.round(15 * (matched / j.requiredCertifications.length));
  }

  // experience (0..15)
  const required = j.minYearsExperience ?? 0;
  const yrs = profile?.yearsExperience ?? 0;
  const expPts = required === 0 ? 15 : Math.min(15, Math.round(15 * (yrs / required)));

  // location (0..10)
  let locPts: number;
  if (j.remote) locPts = 10;
  else if (profile?.locationPostalCode && j.locationPostalCode && profile.locationPostalCode === j.locationPostalCode) locPts = 10;
  else if (!profile?.locationRegion || !j.locationRegion) locPts = 5;
  else if (profile.locationRegion === j.locationRegion) locPts = 8;
  else if (profile.willingToRelocate) locPts = 5;
  else locPts = 0;

  // risk tier (0..10)
  const riskPts = j.riskTier === 'LOW' ? 10 : j.riskTier === 'MEDIUM' ? 7 : 4;

  const total = Math.max(0, Math.min(100, industry + skillsPts + certPts + expPts + locPts + riskPts));
  return {
    total,
    breakdown: { industry, skills: skillsPts, certifications: certPts, experience: expPts, location: locPts, risk: riskPts },
  };
}

interface ScoredInternal {
  jobId: string;
  score: number;
  chance: CompatibilityRating['chance'];
  breakdown: ScoredJobDto['breakdown'];
  explanation: string;
  rating: CompatibilityRating;
  hardBlockReason: string | null;
  job: JobDto;
}

/**
 * Conviction-only context for a job — independent of the user's credentials,
 * so it can be computed once and reused while simulating credential gains.
 */
interface JobConvictionContext {
  rating: CompatibilityRating;
  hardBlockReason: string | null;
}

function convictionContext(
  j: JobDto,
  candidates: CandidateProfile[],
  convictionTypes: string[],
): JobConvictionContext {
  const rating = worstCompatibility(j, candidates);
  let hardBlockReason: string | null = null;
  for (const ct of convictionTypes) {
    const hit = isOffenseHardBlocked(ct as CandidateProfile['convictionType'], { industry: j.industry, title: j.title });
    if (hit.blocked) { hardBlockReason = hit.reason; break; }
  }
  return { rating, hardBlockReason };
}

/**
 * Blend conviction compatibility with personalization. When the person has
 * a record, the conviction engine leads; otherwise personalization
 * (skills/location/industry) does most of the differentiating. A categorical
 * legal bar caps the score so the role lands in "Jobs to approach carefully".
 */
function blendScore(ratingScore: number, persTotal: number, hasConvictions: boolean, hardBlocked: boolean): number {
  const s = hasConvictions
    ? Math.round(0.65 * ratingScore + 0.35 * persTotal)
    : Math.round(0.4 * ratingScore + 0.6 * persTotal);
  return hardBlocked ? Math.min(s, 25) : s;
}

function scoreJobForProfile(
  j: JobDto,
  profile: StoredProfile | null,
  candidates: CandidateProfile[],
  convictionTypes: string[],
  hasConvictions: boolean,
): ScoredInternal {
  const ctx = convictionContext(j, candidates, convictionTypes);
  const pers = personalizationScore(profile, j);
  const score = blendScore(ctx.rating.score, pers.total, hasConvictions, ctx.hardBlockReason !== null);

  return {
    jobId: j.id,
    score,
    chance: ctx.rating.chance,
    breakdown: pers.breakdown,
    explanation: ctx.rating.summary,
    rating: ctx.rating,
    hardBlockReason: ctx.hardBlockReason,
    job: j,
  };
}

export function matchesFor(userId: string, limit: number, source: JobDto[] = JOBS): MatchesResponseDto {
  const profile = getProfile(userId);
  const candidates = candidateProfilesFromStored(profile);
  const convictionTypes = convictionTypesFor(profile);
  const hasConvictions = (profile?.convictions?.length ?? 0) > 0;

  const scored = source
    .map((j) => scoreJobForProfile(j, profile, candidates, convictionTypes, hasConvictions))
    .sort((a, b) => b.score - a.score);

  const toScored = (m: ScoredInternal): ScoredJobDto => ({
    jobId: m.jobId,
    score: m.score,
    breakdown: m.breakdown,
    explanation: m.explanation,
    job: publicSummary(m.job),
  });

  const isAvoid = (m: ScoredInternal) =>
    m.hardBlockReason !== null || m.chance === 'low' || m.score < 40 || m.job.excludesFelons;

  const top = scored
    .filter((m) => !isAvoid(m) && m.score >= 70 && m.chance === 'high')
    .slice(0, limit)
    .map(toScored);

  const topIds = new Set(top.map((t) => t.jobId));
  const medium = scored
    .filter((m) => !isAvoid(m) && !topIds.has(m.jobId))
    .slice(0, limit)
    .map(toScored);

  const avoid: AvoidJobDto[] = scored
    .filter(isAvoid)
    .slice(0, limit)
    .map((m) => {
      const reasons: string[] = [];
      if (m.hardBlockReason) reasons.push(m.hardBlockReason);
      if (m.job.excludesFelons) reasons.push('Employer states this role requires a clean record.');
      reasons.push(...m.rating.possibleBarriers);
      if (reasons.length === 0) reasons.push(...m.rating.riskFactors);
      if (reasons.length === 0) reasons.push('Lower overall fit based on your profile and this role.');
      return { jobId: m.jobId, score: m.score, reasons: Array.from(new Set(reasons)).slice(0, 3), job: publicSummary(m.job) };
    });

  return {
    userId,
    counts: { top: top.length, medium: medium.length, avoid: avoid.length, pool: scored.length },
    topMatches: top,
    mediumMatches: medium,
    avoid,
  };
}

const INSIGHT_LABELS: Record<string, string> = {
  cdl_a: 'CDL Class A',
  cdl_b: 'CDL Class B',
  osha_10: 'OSHA 10',
  osha_30: 'OSHA 30',
  osha_forklift: 'Forklift operator (OSHA)',
  forklift: 'Forklift certification',
  servsafe: 'ServSafe Food Handler',
  nccer: 'NCCER credential',
  welding: 'Welding',
  forklift_operation: 'Forklift operation',
  maintenance: 'Building maintenance',
};
const prettyCode = (code: string) =>
  INSIGHT_LABELS[code] ?? code.split(/[_\s-]+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');

/**
 * Real impact analysis: for each certification / skill the user is missing
 * but that some job requires, simulate adding it and count how many jobs it
 * would move up a tier. Ranked by unlocks (cross the medium line) weighted
 * over promotions (cross into top). Replaces the previously hardcoded list.
 */
export function insightsFor(userId: string, source: JobDto[] = JOBS): InsightsResponseDto {
  const profile = getProfile(userId);
  const baseline = matchesFor(userId, source.length, source);
  const tierOf = (score: number): 0 | 1 | 2 => (score >= 70 ? 2 : score >= 40 ? 1 : 0);

  const candidates = candidateProfilesFromStored(profile);
  const convictionTypes = convictionTypesFor(profile);
  const hasConvictions = (profile?.convictions?.length ?? 0) > 0;

  // Precompute the conviction context per job ONCE. Adding a credential
  // changes only the personalization component, never the conviction
  // rating or the hard-block — so there's no need to re-run the engine for
  // every simulated credential.
  const ctxByJob = new Map<string, JobConvictionContext>();
  const baseTier = new Map<string, 0 | 1 | 2>();
  for (const j of source) {
    const ctx = convictionContext(j, candidates, convictionTypes);
    ctxByJob.set(j.id, ctx);
    const pers = personalizationScore(profile, j);
    const score = blendScore(ctx.rating.score, pers.total, hasConvictions, ctx.hardBlockReason !== null);
    const blockedOrLow = ctx.hardBlockReason !== null || ctx.rating.chance === 'low' || j.excludesFelons;
    baseTier.set(j.id, blockedOrLow ? 0 : tierOf(score));
  }

  const have = new Set([
    ...(profile?.certifications ?? []).map((s) => s.toLowerCase()),
    ...(profile?.skills ?? []).map((s) => s.toLowerCase()),
  ]);

  // Candidate credentials: anything a job requires that the user lacks.
  const certDemand = new Map<string, number>();
  const skillDemand = new Map<string, number>();
  for (const j of source) {
    for (const c of j.requiredCertifications) if (!have.has(c.toLowerCase())) certDemand.set(c, (certDemand.get(c) ?? 0) + 1);
    for (const s of j.requiredSkills) if (!have.has(s.toLowerCase())) skillDemand.set(s, (skillDemand.get(s) ?? 0) + 1);
  }

  const evaluate = (kind: 'certification' | 'skill', code: string, demand: number) => {
    const augmented: StoredProfile = {
      userId: profile?.userId ?? userId,
      ...profile,
      certifications: kind === 'certification' ? [...(profile?.certifications ?? []), code] : profile?.certifications ?? [],
      skills: kind === 'skill' ? [...(profile?.skills ?? []), code] : profile?.skills ?? [],
    };
    let unlocks = 0;
    let promotesToTop = 0;
    for (const j of source) {
      const ctx = ctxByJob.get(j.id)!;
      const before = baseTier.get(j.id) ?? 0;
      const pers = personalizationScore(augmented, j);
      const score = blendScore(ctx.rating.score, pers.total, hasConvictions, ctx.hardBlockReason !== null);
      const blockedOrLow = ctx.hardBlockReason !== null || ctx.rating.chance === 'low' || j.excludesFelons;
      const after = blockedOrLow ? 0 : tierOf(score);
      if (before === 0 && after >= 1) unlocks++;
      if (before <= 1 && after === 2) promotesToTop++;
    }
    return { kind, code, label: prettyCode(code), unlocks, promotesToTop, demand };
  };

  const items = [
    ...Array.from(certDemand.entries()).map(([code, demand]) => evaluate('certification', code, demand)),
    ...Array.from(skillDemand.entries()).map(([code, demand]) => evaluate('skill', code, demand)),
  ]
    .filter((it) => it.unlocks > 0 || it.promotesToTop > 0)
    .sort((a, b) => (b.unlocks * 2 + b.promotesToTop) - (a.unlocks * 2 + a.promotesToTop))
    .slice(0, 7);

  return {
    userId,
    currentTop: baseline.counts.top,
    currentMedium: baseline.counts.medium,
    items,
  };
}

// ────────────────────────────────────────────────────────────────────
// Assessment (RIASEC short form)
// ────────────────────────────────────────────────────────────────────

export const ASSESSMENT_QUESTIONS = [
  // Realistic — hands-on, mechanical, outdoor
  { id: 1,  dimension: 'R' as const, prompt: 'I enjoy fixing or building things with my hands.' },
  { id: 2,  dimension: 'R' as const, prompt: 'I would rather work outdoors than at a desk.' },
  { id: 3,  dimension: 'R' as const, prompt: 'I like operating tools, machines, or equipment.' },
  { id: 4,  dimension: 'R' as const, prompt: 'I would enjoy a job that keeps me physically active.' },
  { id: 5,  dimension: 'R' as const, prompt: 'I take pride in finishing a job I can see and touch.' },
  // Investigative — analytical, problem-solving
  { id: 6,  dimension: 'I' as const, prompt: 'I like figuring out how things work.' },
  { id: 7,  dimension: 'I' as const, prompt: 'I enjoy solving puzzles or analyzing problems.' },
  { id: 8,  dimension: 'I' as const, prompt: 'I like learning new facts and researching topics in depth.' },
  { id: 9,  dimension: 'I' as const, prompt: 'I enjoy working with numbers, data, or measurements.' },
  { id: 10, dimension: 'I' as const, prompt: 'I ask a lot of "why" and "how" questions.' },
  // Artistic — creative, expressive
  { id: 11, dimension: 'A' as const, prompt: 'I like creating or designing things.' },
  { id: 12, dimension: 'A' as const, prompt: 'I prefer flexible work over strict routines.' },
  { id: 13, dimension: 'A' as const, prompt: 'I enjoy expressing ideas through art, music, or writing.' },
  { id: 14, dimension: 'A' as const, prompt: 'I like coming up with original ideas and approaches.' },
  { id: 15, dimension: 'A' as const, prompt: 'I notice colors, shapes, and design in the world around me.' },
  // Social — helping, teaching, supporting
  { id: 16, dimension: 'S' as const, prompt: 'I enjoy helping or teaching other people.' },
  { id: 17, dimension: 'S' as const, prompt: 'I am good at listening to others.' },
  { id: 18, dimension: 'S' as const, prompt: 'People come to me when they need support or advice.' },
  { id: 19, dimension: 'S' as const, prompt: 'I feel good when I help someone solve a personal problem.' },
  { id: 20, dimension: 'S' as const, prompt: 'I work well as part of a team.' },
  // Enterprising — persuading, leading, selling
  { id: 21, dimension: 'E' as const, prompt: 'I am comfortable leading a team.' },
  { id: 22, dimension: 'E' as const, prompt: 'I enjoy convincing or selling.' },
  { id: 23, dimension: 'E' as const, prompt: 'I like setting goals and pushing to reach them.' },
  { id: 24, dimension: 'E' as const, prompt: 'I would enjoy starting or running my own business.' },
  { id: 25, dimension: 'E' as const, prompt: 'I am comfortable making decisions for a group.' },
  // Conventional — organizing, structured work
  { id: 26, dimension: 'C' as const, prompt: 'I am organized and detail-oriented.' },
  { id: 27, dimension: 'C' as const, prompt: 'I like following clear procedures.' },
  { id: 28, dimension: 'C' as const, prompt: 'I keep careful records and track of things.' },
  { id: 29, dimension: 'C' as const, prompt: 'I prefer clear instructions over open-ended tasks.' },
  { id: 30, dimension: 'C' as const, prompt: 'I am dependable about deadlines and schedules.' },
];

export const ASSESSMENT_DIMENSIONS = {
  R: { name: 'Realistic',     blurb: 'Hands-on, mechanical, outdoor work.' },
  I: { name: 'Investigative', blurb: 'Analytical, problem-solving work.' },
  A: { name: 'Artistic',      blurb: 'Creative, expressive, flexible work.' },
  S: { name: 'Social',        blurb: 'Helping, teaching, supporting people.' },
  E: { name: 'Enterprising',  blurb: 'Persuading, leading, selling.' },
  C: { name: 'Conventional',  blurb: 'Organizing, recordkeeping, structured work.' },
};

export const ASSESSMENT_SCALE = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

// Singleton across route handlers (see profile-store.ts for rationale).
const globalForAssessment = globalThis as unknown as {
  __dxpAssessment?: Map<string, ReturnType<typeof scoreAssessment>>;
};
const ASSESSMENT_RESULTS: Map<string, ReturnType<typeof scoreAssessment>> =
  globalForAssessment.__dxpAssessment ?? new Map();
globalForAssessment.__dxpAssessment = ASSESSMENT_RESULTS;

export function scoreAssessment(userId: string, answers: Record<number, number>) {
  const scores: Record<'R'|'I'|'A'|'S'|'E'|'C', number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
  const counts: Record<'R'|'I'|'A'|'S'|'E'|'C', number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
  for (const q of ASSESSMENT_QUESTIONS) {
    const v = answers[q.id];
    if (typeof v === 'number') {
      scores[q.dimension] += v;
      counts[q.dimension] += 1;
    }
  }
  // Normalize to a 0–100 percent per dimension.
  const normalized: Record<'R'|'I'|'A'|'S'|'E'|'C', number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
  (Object.keys(scores) as Array<keyof typeof scores>).forEach((k) => {
    normalized[k] = counts[k] ? Math.round((scores[k] / (counts[k] * 5)) * 100) : 0;
  });

  const ordered = (Object.keys(normalized) as Array<keyof typeof normalized>)
    .sort((a, b) => normalized[b] - normalized[a]);
  const hollandCode = ordered.slice(0, 3).join('');
  const topDimensions = ordered.slice(0, 3).map((code) => ({
    code,
    name:  ASSESSMENT_DIMENSIONS[code].name,
    blurb: ASSESSMENT_DIMENSIONS[code].blurb,
    score: normalized[code],
  }));

  const industryMap: Record<keyof typeof normalized, string[]> = {
    R: ['construction', 'manufacturing', 'warehousing', 'automotive'],
    I: ['it_general', 'energy_utilities', 'healthcare'],
    A: ['services', 'food_service', 'retail'],
    S: ['healthcare', 'education', 'services'],
    E: ['retail', 'services', 'logistics'],
    C: ['logistics', 'finance', 'government'],
  };
  const recommended = Array.from(new Set(ordered.slice(0, 3).flatMap((c) => industryMap[c]))).slice(0, 5);

  const occupations = [
    { onetCode: '47-2111.00', title: 'Electrician',          hollandCode: 'RIE', jobZone: 3, industry: 'construction',
      description: 'Install and repair electrical systems in homes, businesses, and factories.',
      preparation: '4-year apprenticeship; journeyman license.', typicalWage: '$56k – $98k',
      fairChanceFriendly: true },
    { onetCode: '53-3032.00', title: 'CDL Truck Driver',      hollandCode: 'RCE', jobZone: 2, industry: 'transportation',
      description: 'Operate heavy trucks to transport goods over local or long-distance routes.',
      preparation: 'CDL-A training program (4–8 weeks).', typicalWage: '$52k – $92k',
      fairChanceFriendly: true },
    { onetCode: '49-9071.00', title: 'Maintenance + Repair Worker', hollandCode: 'RIE', jobZone: 2, industry: 'services',
      description: 'Perform a wide variety of repair tasks on buildings and equipment.',
      preparation: 'On-the-job training; trade school helpful.', typicalWage: '$38k – $72k',
      fairChanceFriendly: true },
    { onetCode: '35-2014.00', title: 'Restaurant Cook',       hollandCode: 'RCS', jobZone: 2, industry: 'food_service',
      description: 'Prepare and cook food in a restaurant kitchen.',
      preparation: 'Short-term on-the-job training; ServSafe.', typicalWage: '$30k – $52k',
      fairChanceFriendly: true },
    { onetCode: '47-2031.00', title: 'Carpenter',             hollandCode: 'RIA', jobZone: 3, industry: 'construction',
      description: 'Construct, install, and repair structures made of wood, drywall, and other materials.',
      preparation: 'Apprenticeship or trade school.', typicalWage: '$42k – $84k',
      fairChanceFriendly: true },
    { onetCode: '51-4121.00', title: 'Welder',                hollandCode: 'RIC', jobZone: 2, industry: 'manufacturing',
      description: 'Join metal parts using welding equipment in fabrication and repair work.',
      preparation: 'Trade-school program (6–18 months); AWS certs.', typicalWage: '$45k – $78k',
      fairChanceFriendly: true },
  ];

  const result = {
    userId,
    scores: normalized,
    hollandCode,
    topDimensions,
    recommendedIndustries: recommended,
    occupations: occupations.map((o) => {
      // Fit = weighted overlap of the occupation's full 3-letter Holland code
      // with the user's normalized scores (primary dim weighted most). This
      // differentiates occupations that share a top letter but differ below.
      const codeWeights = [0.5, 0.3, 0.2];
      const fitPercent = Math.round(
        o.hollandCode
          .slice(0, 3)
          .split('')
          .reduce((sum, c, i) => sum + (normalized[c as keyof typeof normalized] ?? 0) * (codeWeights[i] ?? 0), 0),
      );
      const liveJobCount = JOBS.filter((j) => j.industry === o.industry).length;
      return {
        ...o,
        fitPercent,
        liveJobCount,
        jobsQuery: `?industry=${encodeURIComponent(o.industry)}`,
      };
    }).sort((a, b) => b.fitPercent - a.fitPercent),
    completedAt: new Date().toISOString(),
  };

  ASSESSMENT_RESULTS.set(userId, result);
  return result;
}

export function getAssessmentResultFor(userId: string) {
  return ASSESSMENT_RESULTS.get(userId) ?? null;
}

// ────────────────────────────────────────────────────────────────────
// CareerOneStop (mock — real API needs DOL auth)
// ────────────────────────────────────────────────────────────────────

export function mockAjcCenters(location: string) {
  return {
    OneStopCenterList: [
      {
        ID: 'WA-SEATTLE-01',
        Name: 'Seattle WorkSource Affiliate',
        Address1: '2nd Avenue Office',
        City: 'Seattle', StateAbbr: 'WA', Zip: '98101',
        Phone: '(206) 555-0142',
        Distance: '0.0',
        ProgramType: 'WorkSource',
        OpenHour: 'Mon–Fri 8a–5p',
        Latitude: 47.6062, Longitude: -122.3321,
        WebSiteUrl: 'https://www.worksourcewa.com/',
      },
      {
        ID: 'WA-RENTON-02',
        Name: 'WorkSource Renton',
        Address1: '500 SW 7th St',
        City: 'Renton', StateAbbr: 'WA', Zip: '98057',
        Phone: '(425) 555-0118',
        Distance: '11.4',
        ProgramType: 'WorkSource',
        OpenHour: 'Mon–Thu 8:30a–4:30p',
        Latitude: 47.4829, Longitude: -122.2171,
        WebSiteUrl: 'https://www.worksourcewa.com/',
      },
      {
        ID: 'WA-TACOMA-03',
        Name: 'WorkSource Pierce',
        Address1: '1313 Tacoma Ave S',
        City: 'Tacoma', StateAbbr: 'WA', Zip: '98402',
        Phone: '(253) 555-0177',
        Distance: '32.1',
        ProgramType: 'WorkSource',
        OpenHour: 'Mon–Fri 8a–5p',
        Latitude: 47.2529, Longitude: -122.4443,
        WebSiteUrl: 'https://www.worksourcewa.com/',
      },
    ],
    RecordCount: 3,
    partial: false,
  };
}

export function mockReentryPrograms(_location: string) {
  return {
    items: [
      { name: 'Pioneer Human Services',  city: 'Seattle',  region: 'WA', focus: 'Employment, housing, treatment' },
      { name: 'FreeAmerica Project',     city: 'Tacoma',   region: 'WA', focus: 'Reentry employment + advocacy' },
      { name: 'Post-Prison Education Program', city: 'Seattle', region: 'WA', focus: 'Education + mentorship' },
    ],
  };
}

export function mockWages(_onetOrKeyword: string) {
  return {
    OccupationDetail: {
      Wages: {
        NationalWagesList: [
          { RateType: 'Annual', Pct10: '32000', Pct25: '38000', Median: '46000', Pct75: '58000', Pct90: '72000' },
        ],
      },
    },
  };
}

export function mockLicenses(_kw: string, location: string) {
  return {
    LicenseList: [
      { Title: 'CDL Class A', Region: location || 'WA', Description: 'Commercial Driver License for combination vehicles.' },
      { Title: 'OSHA 10',     Region: location || 'WA', Description: '10-hour OSHA construction or general industry card.' },
    ],
  };
}

export function mockCertifications(_kw: string) {
  return {
    CertificationList: [
      { Name: 'OSHA Forklift Operator', Issuer: 'OSHA',  Description: 'Powered industrial truck operator card.' },
      { Name: 'ServSafe Food Handler',  Issuer: 'NRA',   Description: 'Food handler certification accepted by most states.' },
      { Name: 'AWS Certified Welder',   Issuer: 'AWS',   Description: 'Performance-based weld certification.' },
    ],
  };
}

export function mockApprenticeships(_kw: string, location: string) {
  return {
    ApprenticeshipList: [
      { Title: 'Electrical Apprentice',  Sponsor: 'IBEW Local 46',         Region: location || 'WA' },
      { Title: 'Plumber Apprentice',     Sponsor: 'UA Local 290',          Region: location || 'OR' },
      { Title: 'HVAC Apprentice',        Sponsor: 'NW Mechanical',         Region: location || 'WA' },
      { Title: 'Carpenter Apprentice',   Sponsor: 'Northwest Carpenters',  Region: location || 'WA' },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────
// Live-or-mock pool resolver
// ────────────────────────────────────────────────────────────────────

/**
 * Return the active job pool for /api/v1/* handlers to operate on:
 *   - If any configured provider returned jobs → live (real) data.
 *   - Otherwise → the bundled mock dataset, so the demo never goes blank.
 *
 * Route handlers call this once per request and pass the result into the
 * pool-taking helpers (filterJobs, findJob, jobsStats, etc.).
 *
 * Implemented as a thin wrapper around lib/providers so this file stays
 * import-cycle-free; if no providers are configured this returns the
 * bundled JOBS immediately without paying for a network round trip.
 */
export async function getJobPool(): Promise<{
  jobs: JobDto[];
  isMock: boolean;
  perProvider: Array<{ code: string; name: string; count: number; ok: boolean }>;
}> {
  // Lazy-load to avoid pulling providers (which use Node-only APIs like
  // AbortSignal.timeout) into bundles that don't need them.
  const { fetchLiveJobs, listEnabledProviders } = await import('./providers');
  if (listEnabledProviders().length === 0) {
    return { jobs: JOBS, isMock: true, perProvider: [] };
  }
  const live = await fetchLiveJobs();
  if (!live) return { jobs: JOBS, isMock: true, perProvider: [] };
  return { jobs: live.jobs, isMock: false, perProvider: live.perProvider };
}

