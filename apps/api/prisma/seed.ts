import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ONLY real providers — the mock/demo source was retired so no synthetic
// listings can ever surface to a candidate.
const SOURCES = [
  { code: 'usajobs',  displayName: 'USAJobs (US federal government)',      baseUrl: 'https://data.usajobs.gov' },
  { code: 'adzuna',   displayName: 'Adzuna (private-sector aggregator)',   baseUrl: 'https://api.adzuna.com' },
  { code: 'remotive', displayName: 'Remotive (remote-friendly postings)',  baseUrl: 'https://remotive.com' },
];

const SKILLS = [
  { code: 'forklift_operation',   displayName: 'Forklift Operation',   category: 'trade' },
  { code: 'commercial_driving',   displayName: 'Commercial Driving',   category: 'trade' },
  { code: 'welding',              displayName: 'Welding',              category: 'trade' },
  { code: 'carpentry',            displayName: 'Carpentry',            category: 'trade' },
  { code: 'hvac',                 displayName: 'HVAC',                 category: 'trade' },
  { code: 'customer_service',     displayName: 'Customer Service',     category: 'soft' },
  { code: 'food_service',         displayName: 'Food Service',         category: 'service' },
  { code: 'warehouse_operations', displayName: 'Warehouse Operations', category: 'trade' },
  { code: 'computer_literacy',    displayName: 'Computer Literacy',    category: 'technical' },
];

const CERTIFICATIONS = [
  { code: 'osha_10',    displayName: 'OSHA 10-Hour',                issuer: 'OSHA' },
  { code: 'osha_30',    displayName: 'OSHA 30-Hour',                issuer: 'OSHA' },
  { code: 'cdl_a',      displayName: 'Commercial Driver License A', issuer: 'State DMV' },
  { code: 'cdl_b',      displayName: 'Commercial Driver License B', issuer: 'State DMV' },
  { code: 'servsafe',   displayName: 'ServSafe Food Handler',       issuer: 'NRA' },
  { code: 'forklift',   displayName: 'Forklift Operator Cert',      issuer: 'OSHA-compliant' },
];

async function main() {
  for (const s of SOURCES) {
    await prisma.jobSource.upsert({
      where: { code: s.code },
      create: s,
      update: { displayName: s.displayName, baseUrl: s.baseUrl },
    });
  }
  for (const s of SKILLS) {
    await prisma.skill.upsert({ where: { code: s.code }, create: s, update: s });
  }
  for (const c of CERTIFICATIONS) {
    await prisma.certification.upsert({ where: { code: c.code }, create: c, update: c });
  }

  console.log(`Seeded ${SOURCES.length} sources, ${SKILLS.length} skills, ${CERTIFICATIONS.length} certifications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
