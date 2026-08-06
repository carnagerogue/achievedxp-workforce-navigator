/**
 * Calendar-file reminders — the zero-infrastructure slice of the engagement
 * engine (docs/connected-backend-scope.md, Pillar 3). Server-sent SMS needs a
 * provider + A2P 10DLC registration; a downloadable .ics needs nothing and
 * puts supervision dates on the person's phone TODAY, with alarms. Preventable
 * technical violations drive ~1 in 4 prison admissions (CSG, "Confined &
 * Costly") — a phone alarm the night before a report date is cheap insurance.
 *
 * Pure string building — no deps. VALARM fires the evening before (and again
 * 2 hours before) each event.
 */
import type { SupervisionInfo, SupervisionCondition, FeeObligation } from './supervision';
import type { ChecklistItem } from './checklist-store';

export interface IcsEvent {
  uid: string;
  /** yyyy-mm-dd (all-day event). */
  date: string;
  title: string;
  description?: string;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const dayInt = (d: string) => d.replace(/-/g, '');
const nextDay = (d: string): string => {
  const [y, m, dd] = d.split('-').map(Number);
  const t = new Date(y, m - 1, dd + 1);
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}`;
};
const isDate = (d?: string): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);

export function buildIcs(events: IcsEvent[], calendarName = 'Reentry reminders'): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}00Z`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AchieveDXP//Workforce Navigator//EN',
    `X-WR-CALNAME:${esc(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${esc(e.uid)}@workforce-navigator`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dayInt(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(e.date)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      // Alarm the evening before (18:00 local ≈ -PT6H from midnight) and morning-of.
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Tomorrow: ' + e.title)}`, 'TRIGGER:-PT6H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Today: ' + e.title)}`, 'TRIGGER:PT8H', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Every dated obligation the app knows about, as calendar events. */
export function reminderEvents(input: {
  supervision: SupervisionInfo;
  conditions: SupervisionCondition[];
  fees: FeeObligation[];
  items: ChecklistItem[];
}): IcsEvent[] {
  const out: IcsEvent[] = [];
  const { supervision, conditions, fees, items } = input;

  if (isDate(supervision.nextReportDate)) {
    out.push({
      uid: 'report-' + supervision.nextReportDate,
      date: supervision.nextReportDate,
      title: supervision.officerName ? `Report to ${supervision.officerName}` : 'Report to your supervision officer',
      description: 'Missing a report date is one of the most common causes of a technical violation. If you can\'t make it, call ahead — always.',
    });
  }
  for (const c of conditions) {
    if (isDate(c.dueDate)) {
      out.push({ uid: `cond-${c.id}-${c.dueDate}`, date: c.dueDate, title: c.label, description: 'Supervision condition — from your plan in Workforce Navigator.' });
    }
  }
  for (const f of fees) {
    if (isDate(f.dueDate)) {
      out.push({ uid: `fee-${f.id}-${f.dueDate}`, date: f.dueDate, title: `Payment due: ${f.label}`, description: 'Supervision-related payment — from your plan in Workforce Navigator.' });
    }
  }
  for (const it of items) {
    if (it.status !== 'completed' && isDate(it.targetDate)) {
      out.push({ uid: `step-${it.id}-${it.targetDate}`, date: it.targetDate, title: it.name, description: 'Plan step — from My Plan in Workforce Navigator.' });
    }
  }
  return out;
}

/** Trigger a browser download of the reminders calendar. */
export function downloadIcs(events: IcsEvent[], filename = 'reentry-reminders.ics') {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
