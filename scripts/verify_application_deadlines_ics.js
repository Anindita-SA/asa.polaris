// Strict RFC 5545 verification test suite for application_deadlines.ics
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const icsPath = path.resolve(__dirname, '../../Higher\'s application and Internship stuff/docs/application_deadlines.ics');

function runVerification() {
  console.log(`Verifying: ${icsPath}`);

  if (!fs.existsSync(icsPath)) {
    throw new Error(`File does not exist: ${icsPath}`);
  }

  const rawBuffer = fs.readFileSync(icsPath);
  const rawString = rawBuffer.toString('utf8');

  // 1. Check raw byte size
  console.log(`1. Raw byte size: ${rawBuffer.length} bytes`);
  if (rawBuffer.length === 0) throw new Error('File is empty');

  // 2. Strict typography check: NO em dash (\u2014) or en dash (\u2013)
  if (rawString.includes('\u2014') || rawString.includes('\u2013')) {
    throw new Error('FAIL: Em dash or en dash detected in .ics file!');
  }
  console.log('2. Typography check: PASSED (0 em dashes, 0 en dashes)');

  // 3. Strict line ending check: Every line must end with \r\n (CRLF). No bare \n.
  const crCount = (rawString.match(/\r/g) || []).length;
  const lfCount = (rawString.match(/\n/g) || []).length;
  const crlfCount = (rawString.match(/\r\n/g) || []).length;

  if (crCount !== lfCount || crCount !== crlfCount) {
    throw new Error(`FAIL: Mixed line endings! CR=${crCount}, LF=${lfCount}, CRLF=${crlfCount}`);
  }
  console.log(`3. Line endings check: PASSED (All ${crlfCount} lines end strictly with CRLF)`);

  // 4. Line length check: Every folded line must be <= 75 octets
  const lines = rawString.split('\r\n');
  // Drop trailing empty line from terminal \r\n
  if (lines[lines.length - 1] === '') lines.pop();

  let maxOctets = 0;
  for (let i = 0; i < lines.length; i++) {
    const len = Buffer.byteLength(lines[i], 'utf8');
    if (len > maxOctets) maxOctets = len;
    if (len > 75) {
      throw new Error(`FAIL: Line ${i + 1} exceeds 75 octets (${len} octets): "${lines[i]}"`);
    }
  }
  console.log(`4. Line length check: PASSED (Max line length is ${maxOctets} octets <= 75 limit across ${lines.length} lines)`);

  // 5. Unfold lines according to RFC 5545 section 3.1
  const unfoldedLines = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfoldedLines.length === 0) throw new Error('First line cannot be a folded continuation');
      unfoldedLines[unfoldedLines.length - 1] += line.slice(1);
    } else {
      unfoldedLines.push(line);
    }
  }
  console.log(`5. Unfolding check: PASSED (Unfolded ${lines.length} folded lines into ${unfoldedLines.length} logical lines)`);

  // 6. Envelope structure check
  if (unfoldedLines[0] !== 'BEGIN:VCALENDAR') throw new Error('File does not start with BEGIN:VCALENDAR');
  if (unfoldedLines[unfoldedLines.length - 1] !== 'END:VCALENDAR') throw new Error('File does not end with END:VCALENDAR');

  const requiredHeaders = [
    'VERSION:2.0',
    'PRODID:-//Polaris Productivity//Application Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  for (const h of requiredHeaders) {
    if (!unfoldedLines.includes(h)) throw new Error(`Missing required calendar header: ${h}`);
  }
  console.log('6. Envelope check: PASSED (Valid VCALENDAR 2.0 structure)');

  // 7. Parse VEVENT components
  const events = [];
  let currentEvent = null;
  let currentAlarm = null;

  for (let i = 1; i < unfoldedLines.length - 1; i++) {
    const line = unfoldedLines[i];
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { alarms: [], rawProps: {} };
    } else if (line === 'END:VEVENT') {
      if (!currentEvent) throw new Error(`Unexpected END:VEVENT at line ${i}`);
      events.push(currentEvent);
      currentEvent = null;
    } else if (line === 'BEGIN:VALARM') {
      if (!currentEvent) throw new Error(`VALARM outside VEVENT at line ${i}`);
      currentAlarm = {};
    } else if (line === 'END:VALARM') {
      if (!currentAlarm) throw new Error(`Unexpected END:VALARM at line ${i}`);
      currentEvent.alarms.push(currentAlarm);
      currentAlarm = null;
    } else if (currentAlarm) {
      const colonIdx = line.indexOf(':');
      const propPart = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 1);
      const [propName, ...params] = propPart.split(';');
      currentAlarm[propName] = val;
      currentAlarm.rawProps = currentAlarm.rawProps || {};
      currentAlarm.rawProps[propName] = { val, params };
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      const propPart = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 1);
      const [propName, ...params] = propPart.split(';');
      currentEvent[propName] = val;
      currentEvent.rawProps[propName] = { val, params };
    }
  }

  console.log(`7. VEVENT count check: PASSED (${events.length} VEVENT components parsed)`);
  const milestoneCount = events.length / 3;
  if (events.length % 3 !== 0) {
    throw new Error(`FAIL: Events count (${events.length}) must be divisible by 3 (deadlines + buffers + runways)`);
  }

  // 8. Event validation
  const uids = new Set();
  let deadlineEvents = 0;
  let bufferEvents = 0;
  let runwayEvents = 0;

  const dateRegex = /^\d{8}$/;
  const stampRegex = /^\d{8}T\d{6}Z$/;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Check UID uniqueness
    if (!ev.UID) throw new Error(`Event ${i + 1} missing UID`);
    if (uids.has(ev.UID)) throw new Error(`Duplicate UID: ${ev.UID}`);
    uids.add(ev.UID);

    // Check DTSTAMP
    if (!ev.DTSTAMP || !stampRegex.test(ev.DTSTAMP)) {
      throw new Error(`Event ${i + 1} (${ev.UID}) invalid DTSTAMP: ${ev.DTSTAMP}`);
    }

    // Check DTSTART & DTEND
    const dtstart = ev.DTSTART;
    const dtend = ev.DTEND;
    if (!dtstart || !dateRegex.test(dtstart)) {
      throw new Error(`Event ${i + 1} (${ev.UID}) invalid DTSTART: ${dtstart}`);
    }
    if (!dtend || !dateRegex.test(dtend)) {
      throw new Error(`Event ${i + 1} (${ev.UID}) invalid DTEND: ${dtend}`);
    }

    // Check VALUE=DATE parameter
    if (!ev.rawProps.DTSTART.params.includes('VALUE=DATE')) {
      throw new Error(`Event ${i + 1} (${ev.UID}) DTSTART missing VALUE=DATE`);
    }
    if (!ev.rawProps.DTEND.params.includes('VALUE=DATE')) {
      throw new Error(`Event ${i + 1} (${ev.UID}) DTEND missing VALUE=DATE`);
    }

    // Check DTEND is exactly DTSTART + 1 day
    const [sy, sm, sd] = [dtstart.slice(0, 4), dtstart.slice(4, 6), dtstart.slice(6, 8)].map(Number);
    const startDate = new Date(Date.UTC(sy, sm - 1, sd));
    const nextDate = new Date(startDate.getTime());
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const expectedEnd = `${nextDate.getUTCFullYear()}${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}${String(nextDate.getUTCDate()).padStart(2, '0')}`;
    if (dtend !== expectedEnd) {
      throw new Error(`Event ${i + 1} (${ev.UID}) DTEND (${dtend}) is not DTSTART + 1 day (${expectedEnd})`);
    }

    // Check SUMMARY & DESCRIPTION
    if (!ev.SUMMARY) throw new Error(`Event ${i + 1} (${ev.UID}) missing SUMMARY`);
    if (!ev.DESCRIPTION) throw new Error(`Event ${i + 1} (${ev.UID}) missing DESCRIPTION`);
    if (ev.STATUS !== 'CONFIRMED') throw new Error(`Event ${i + 1} (${ev.UID}) STATUS is not CONFIRMED: ${ev.STATUS}`);
    if (ev.TRANSP !== 'TRANSPARENT') throw new Error(`Event ${i + 1} (${ev.UID}) TRANSP is not TRANSPARENT: ${ev.TRANSP}`);

    // Check VALARM duration format
    const rfcDurationRegex = /^(?:-P\d+D|PT0S|-PT\d+[HMS])$/;
    for (const alm of ev.alarms) {
      if (alm.ACTION !== 'DISPLAY') throw new Error(`VALARM ACTION must be DISPLAY, got: ${alm.ACTION}`);
      if (!alm.TRIGGER) throw new Error(`VALARM missing TRIGGER in event ${ev.UID}`);
      if (!alm.DESCRIPTION) throw new Error(`VALARM missing DESCRIPTION in event ${ev.UID}`);
      // Strict RFC 5545 duration check
      if (alm.TRIGGER === '-PT0M' || alm.TRIGGER === '-PT0S' || alm.TRIGGER === '-P0D') {
        throw new Error(`VALARM invalid negative zero TRIGGER: "${alm.TRIGGER}" in event ${ev.UID}. Zero duration must be PT0S.`);
      }
      if (!rfcDurationRegex.test(alm.TRIGGER)) {
        throw new Error(`VALARM TRIGGER "${alm.TRIGGER}" does not match RFC 5545 duration grammar in event ${ev.UID}`);
      }
    }

    if (ev.UID.includes('-runway@')) {
      runwayEvents++;
      if (!ev.SUMMARY.startsWith('[14-Day Runway]')) {
        throw new Error(`Runway event missing [14-Day Runway] prefix: ${ev.SUMMARY}`);
      }
      if (ev.alarms.length !== 2) {
        throw new Error(`Runway event ${ev.UID} does not have exactly 2 alarms: ${ev.alarms.length}`);
      }
      const triggers = ev.alarms.map(a => a.TRIGGER);
      if (!triggers.includes('-P1D') || !triggers.includes('PT0S')) {
        throw new Error(`Runway event ${ev.UID} missing required alarms (-P1D, PT0S): ${triggers.join(', ')}`);
      }
      const alarm1 = ev.alarms.find(a => a.TRIGGER === '-P1D');
      const alarm0 = ev.alarms.find(a => a.TRIGGER === 'PT0S');
      if (!alarm1.DESCRIPTION.includes('1 day prior')) {
        throw new Error(`Runway event ${ev.UID} -P1D alarm missing "1 day prior": ${alarm1.DESCRIPTION}`);
      }
      if (!alarm0.DESCRIPTION.includes('Runway Active')) {
        throw new Error(`Runway event ${ev.UID} PT0S alarm missing "Runway Active": ${alarm0.DESCRIPTION}`);
      }
    } else if (ev.UID.includes('-buffer@')) {
      bufferEvents++;
      if (!ev.SUMMARY.startsWith('[7-Day Buffer]')) {
        throw new Error(`Buffer event missing [7-Day Buffer] prefix: ${ev.SUMMARY}`);
      }
      if (ev.alarms.length !== 2) {
        throw new Error(`Buffer event ${ev.UID} does not have exactly 2 alarms: ${ev.alarms.length}`);
      }
      const triggers = ev.alarms.map(a => a.TRIGGER);
      if (!triggers.includes('-P1D') || !triggers.includes('PT0S')) {
        throw new Error(`Buffer event ${ev.UID} missing required alarms (-P1D, PT0S): ${triggers.join(', ')}`);
      }
      const alarm1 = ev.alarms.find(a => a.TRIGGER === '-P1D');
      const alarm0 = ev.alarms.find(a => a.TRIGGER === 'PT0S');
      if (!alarm1.DESCRIPTION.includes('1 day prior')) {
        throw new Error(`Buffer event ${ev.UID} -P1D alarm missing "1 day prior": ${alarm1.DESCRIPTION}`);
      }
      if (!alarm0.DESCRIPTION.includes('Buffer Active')) {
        throw new Error(`Buffer event ${ev.UID} PT0S alarm missing "Buffer Active": ${alarm0.DESCRIPTION}`);
      }
    } else {
      deadlineEvents++;
      if (ev.alarms.length !== 3) {
        throw new Error(`Deadline event ${ev.UID} does not have exactly 3 alarms: ${ev.alarms.length}`);
      }
      const triggers = ev.alarms.map(a => a.TRIGGER);
      if (!triggers.includes('-P14D') || !triggers.includes('-P7D') || !triggers.includes('-P1D')) {
        throw new Error(`Deadline event ${ev.UID} missing required alarms (-P14D, -P7D, -P1D): ${triggers.join(', ')}`);
      }
      const alarm14 = ev.alarms.find(a => a.TRIGGER === '-P14D');
      const alarm7 = ev.alarms.find(a => a.TRIGGER === '-P7D');
      const alarm1 = ev.alarms.find(a => a.TRIGGER === '-P1D');
      if (!alarm14.DESCRIPTION.includes('14 days / 2 weeks remaining')) {
        throw new Error(`Deadline event ${ev.UID} -P14D alarm missing "14 days / 2 weeks remaining": ${alarm14.DESCRIPTION}`);
      }
      if (!alarm7.DESCRIPTION.includes('7 days remaining')) {
        throw new Error(`Deadline event ${ev.UID} -P7D alarm missing "7 days remaining": ${alarm7.DESCRIPTION}`);
      }
      if (!alarm1.DESCRIPTION.includes('1 day remaining')) {
        throw new Error(`Deadline event ${ev.UID} -P1D alarm missing "1 day remaining": ${alarm1.DESCRIPTION}`);
      }
    }
  }

  const totalAlarms = events.reduce((acc, ev) => acc + ev.alarms.length, 0);
  console.log(`8. Events breakdown: PASSED (${deadlineEvents} Canonical Milestone Deadlines, ${bufferEvents} 7-Day Buffer Reminders, ${runwayEvents} 14-Day Runway Reminders, ${totalAlarms} Total VALARMs)`);
  if (deadlineEvents !== milestoneCount || bufferEvents !== milestoneCount || runwayEvents !== milestoneCount) {
    throw new Error(`FAIL: Expected ${milestoneCount} deadlines, ${milestoneCount} buffers, ${milestoneCount} runways. Got: ${deadlineEvents}, ${bufferEvents}, ${runwayEvents}`);
  }
  const expectedTotalAlarms = milestoneCount * 3 + milestoneCount * 2 + milestoneCount * 2;
  if (totalAlarms !== expectedTotalAlarms) {
    throw new Error(`FAIL: Expected exactly ${expectedTotalAlarms} VALARM components, got ${totalAlarms}`);
  }

  // 9. Cross-verify buffer & runway dates match deadline dates (-7d and -14d)
  const deadlineMap = new Map();
  const bufferMap = new Map();
  const runwayMap = new Map();
  for (const ev of events) {
    if (ev.UID.includes('-runway@')) {
      const baseId = ev.UID.replace('-runway@polaris.app', '');
      runwayMap.set(baseId, ev);
    } else if (ev.UID.includes('-buffer@')) {
      const baseId = ev.UID.replace('-buffer@polaris.app', '');
      bufferMap.set(baseId, ev);
    } else {
      const baseId = ev.UID.replace('@polaris.app', '');
      deadlineMap.set(baseId, ev);
    }
  }

  if (deadlineMap.size !== milestoneCount) throw new Error(`Expected ${milestoneCount} deadline events, got ${deadlineMap.size}`);
  if (bufferMap.size !== milestoneCount) throw new Error(`Expected ${milestoneCount} buffer events, got ${bufferMap.size}`);
  if (runwayMap.size !== milestoneCount) throw new Error(`Expected ${milestoneCount} runway events, got ${runwayMap.size}`);

  for (const [baseId, dEv] of deadlineMap.entries()) {
    const bEv = bufferMap.get(baseId);
    if (!bEv) throw new Error(`Missing buffer event for deadline ${baseId}`);
    const rEv = runwayMap.get(baseId);
    if (!rEv) throw new Error(`Missing runway event for deadline ${baseId}`);

    const [dy, dm, dd] = [dEv.DTSTART.slice(0, 4), dEv.DTSTART.slice(4, 6), dEv.DTSTART.slice(6, 8)].map(Number);
    const deadlineDate = new Date(Date.UTC(dy, dm - 1, dd));

    // Expected buffer date: -7 days
    const expectedBufDate = new Date(deadlineDate.getTime());
    expectedBufDate.setUTCDate(expectedBufDate.getUTCDate() - 7);
    const expectedBufStr = `${expectedBufDate.getUTCFullYear()}${String(expectedBufDate.getUTCMonth() + 1).padStart(2, '0')}${String(expectedBufDate.getUTCDate()).padStart(2, '0')}`;

    if (bEv.DTSTART !== expectedBufStr) {
      throw new Error(`Buffer date mismatch for ${dEv.SUMMARY}: expected ${expectedBufStr}, got ${bEv.DTSTART}`);
    }

    // Expected runway date: -14 days
    const expectedRunDate = new Date(deadlineDate.getTime());
    expectedRunDate.setUTCDate(expectedRunDate.getUTCDate() - 14);
    const expectedRunStr = `${expectedRunDate.getUTCFullYear()}${String(expectedRunDate.getUTCMonth() + 1).padStart(2, '0')}${String(expectedRunDate.getUTCDate()).padStart(2, '0')}`;

    if (rEv.DTSTART !== expectedRunStr) {
      throw new Error(`Runway date mismatch for ${dEv.SUMMARY}: expected ${expectedRunStr}, got ${rEv.DTSTART}`);
    }
  }
  console.log(`9. Date delta check: PASSED (All ${milestoneCount} buffer events are exactly -7 days and all ${milestoneCount} runway events are exactly -14 days before their corresponding deadline)`);

  console.log('\n=========================================');
  console.log('ALL RFC 5545 VERIFICATION CHECKS PASSED!');
  console.log('=========================================');
}

runVerification();
