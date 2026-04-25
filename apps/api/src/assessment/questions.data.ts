/**
 * O*NET Interest Profiler — Short Form.
 *
 * 30 items (5 per dimension) based on the public O*NET-IP content.
 * Respondents rate each item on a 5-point Likert scale from "Strongly
 * Dislike" (1) to "Strongly Like" (5). Per-dimension score is the sum
 * of the 5 matching items, so each dimension ranges 5–25.
 *
 * The instrument is public-domain (U.S. Dept of Labor); we ship it in
 * source rather than calling the external API to keep the product
 * deterministic and offline-friendly.
 */

export type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export interface AssessmentQuestion {
  id: number;            // 1..30, stable ordering for serialized results
  prompt: string;        // "Build kitchen cabinets"
  dimension: RiasecCode;
}

export const RIASEC_LABELS: Record<RiasecCode, { name: string; blurb: string }> = {
  R: { name: 'Realistic',     blurb: 'Hands-on, practical, mechanical — trades, operating equipment, outdoors work.' },
  I: { name: 'Investigative', blurb: 'Analytical, scientific — research, diagnostics, technical problem-solving.' },
  A: { name: 'Artistic',      blurb: 'Creative, expressive — design, music, writing, performance.' },
  S: { name: 'Social',        blurb: 'Helping, teaching, counseling — care, community, training roles.' },
  E: { name: 'Enterprising',  blurb: 'Leading, persuading, selling — management, operations, business.' },
  C: { name: 'Conventional',  blurb: 'Organized, detail-oriented — records, data, administrative work.' },
};

export const QUESTIONS: ReadonlyArray<AssessmentQuestion> = [
  // Realistic
  {  id: 1,  prompt: 'Build kitchen cabinets',                          dimension: 'R' },
  {  id: 2,  prompt: 'Repair household appliances',                     dimension: 'R' },
  {  id: 3,  prompt: 'Assemble electronic parts',                       dimension: 'R' },
  {  id: 4,  prompt: 'Lay brick or tile',                               dimension: 'R' },
  {  id: 5,  prompt: 'Operate a grinding machine in a factory',         dimension: 'R' },
  // Investigative
  {  id: 6,  prompt: 'Study the movement of planets',                   dimension: 'I' },
  {  id: 7,  prompt: 'Develop a new medicine',                          dimension: 'I' },
  {  id: 8,  prompt: 'Study ways to reduce water pollution',            dimension: 'I' },
  {  id: 9,  prompt: 'Do laboratory tests to identify diseases',        dimension: 'I' },
  { id: 10,  prompt: 'Do research on plants or animals',                dimension: 'I' },
  // Artistic
  { id: 11,  prompt: 'Paint sets for plays',                            dimension: 'A' },
  { id: 12,  prompt: 'Write a song',                                    dimension: 'A' },
  { id: 13,  prompt: 'Write books or plays',                            dimension: 'A' },
  { id: 14,  prompt: 'Play a musical instrument',                       dimension: 'A' },
  { id: 15,  prompt: 'Compose or arrange music',                        dimension: 'A' },
  // Social
  { id: 16,  prompt: 'Give career guidance to people',                  dimension: 'S' },
  { id: 17,  prompt: 'Do volunteer work at a non-profit organization',  dimension: 'S' },
  { id: 18,  prompt: 'Help people with personal or emotional problems', dimension: 'S' },
  { id: 19,  prompt: 'Teach an individual an exercise routine',         dimension: 'S' },
  { id: 20,  prompt: 'Help people with family-related problems',        dimension: 'S' },
  // Enterprising
  { id: 21,  prompt: 'Buy and sell stocks and bonds',                   dimension: 'E' },
  { id: 22,  prompt: 'Manage the operations of a hotel',                dimension: 'E' },
  { id: 23,  prompt: 'Operate a beauty salon or barber shop',           dimension: 'E' },
  { id: 24,  prompt: 'Manage a department within a large company',      dimension: 'E' },
  { id: 25,  prompt: 'Start your own business',                         dimension: 'E' },
  // Conventional
  { id: 26,  prompt: 'Generate the monthly payroll checks for an office', dimension: 'C' },
  { id: 27,  prompt: 'Inventory supplies using a hand-held computer',   dimension: 'C' },
  { id: 28,  prompt: 'Use a computer program to generate customer bills', dimension: 'C' },
  { id: 29,  prompt: 'Maintain employee records',                       dimension: 'C' },
  { id: 30,  prompt: 'Compute and record statistical or other numerical data', dimension: 'C' },
];

/**
 * RIASEC → the industry codes our classifier already uses. Multiple
 * industries can be aligned with a single dimension. The scorer uses this
 * to give a small nudge when a candidate's high-scoring dimensions line up
 * with a job's classified industry.
 */
export const RIASEC_TO_INDUSTRIES: Record<RiasecCode, ReadonlyArray<string>> = {
  R: ['construction', 'warehousing', 'transportation', 'manufacturing', 'cleaning'],
  I: ['healthcare', 'services'],
  A: ['services'],
  S: ['healthcare', 'education', 'services', 'food_service'],
  E: ['services', 'food_service'],
  C: ['services', 'warehousing'],
};
