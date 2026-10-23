// Thai public holidays → src/prototype/thHolidays.json (run: npm run holidays, once a year or when the
// cabinet adds a special day off). Source: Google Calendar's public "วันหยุดในประเทศไทย" calendar, free and
// keyless; it sends no CORS header, so the app can't read it live and ships this file instead.
// Only official days off (วันหยุดนักขัตฤกษ์) are kept, not observances such as Valentine's Day.
import { writeFileSync } from 'node:fs';

const ICS = 'https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics';
const OUT = new URL('../src/prototype/thHolidays.json', import.meta.url);
const FIX = [[/​/g, ''], [/ขื้น/g, 'ขึ้น']]; // stray zero-width space, a typo in the source

const text = await (await fetch(ICS)).text();
const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/); // unfold long lines first
const from = String(new Date().getFullYear() - 1);
const days = {};
let ev = null;
for (const line of lines) {
  if (line === 'BEGIN:VEVENT') ev = {};
  else if (line === 'END:VEVENT') {
    if (ev.date >= from && ev.desc?.startsWith('วันหยุดนักขัตฤกษ์')) {
      const name = FIX.reduce((s, [re, to]) => s.replace(re, to), ev.name).trim();
      days[ev.date] = days[ev.date] ? `${days[ev.date]} · ${name}` : name;
    }
    ev = null;
  } else if (ev) {
    const [k, ...v] = line.split(':');
    const val = v.join(':').replace(/\\,/g, ',');
    if (k.startsWith('DTSTART')) ev.date = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
    else if (k === 'SUMMARY') ev.name = val;
    else if (k === 'DESCRIPTION') ev.desc = val;
  }
}
const sorted = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`${Object.keys(sorted).length} holidays → ${OUT.pathname}`);
