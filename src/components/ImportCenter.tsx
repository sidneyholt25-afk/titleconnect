import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const clean = (v: any) =>
  String(v ?? '').replace(/\u00a0/g, ' ').trim();

const norm = (v: any) => clean(v).toLowerCase();

function splitName(value: string) {
  const parts = clean(value).split(/\s+/);
  return {
    first_name: parts.shift() || '',
    last_name: parts.join(' ')
  };
}

function excelDate(value: any): string {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);

  if (typeof value === 'number' && value > 1000) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000)
      .toISOString().slice(0, 10);
  }

  const parsed = new Date(clean(value));
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function rows(workbook: XLSX.WorkBook, name: string): any[][] {
  const sheet = workbook.Sheets[name];
  return sheet
    ? XLSX.utils.sheet_to_json(sheet, {
        header: 1, defval: '', raw: true, blankrows: false
      }) as any[][]
    : [];
}

export default function ImportCenter() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');

  async function preview(file?: File) {
    if (!file) return;
    setLoading(true);
    setError('');
    setSummary('');
    setFileName(file.name);

    try {
      const bytes = await file.arrayBuffer();
      const book = XLSX.read(bytes, { type: 'array', cellDates: true });
      setWorkbook(book);

      setSheets(book.SheetNames.map(name => {
        const data = rows(book, name);
        const populated = data.filter(r =>
          r.some(v => clean(v) !== '')
        );
        return { name, count: populated.length };
      }));
    } catch (e) {
      setWorkbook(null);
      setError(e instanceof Error ? e.message : 'Could not read workbook.');
    } finally {
      setLoading(false);
    }
  }

  async function importContacts(dryRun = false) {
    if (!workbook || loading) return;
    setLoading(true);
    setError('');
    setSummary('');

    try {
      const [agentResult, clientResult, sponsorResult] = await Promise.all([
        supabase.from('agents').select('id,first_name,last_name,email,phone,brokerage,notes'),
        supabase.from('clients').select('id,first_name,last_name,email,phone,client_type,notes'),
        supabase.from('sponsors').select('id,name,email,sponsor_type,notes')
      ]);

      if (agentResult.error) throw new Error(agentResult.error.message);
      if (clientResult.error) throw new Error(clientResult.error.message);
      if (sponsorResult.error) throw new Error(sponsorResult.error.message);

      const existingAgents: any[] = agentResult.data || [];
      const existingClients: any[] = clientResult.data || [];
      const existingSponsors: any[] = sponsorResult.data || [];

      const pendingAgents = new Map<string, any>();
      const agentUpdates = new Map<string, any>();
      let duplicateAgents = 0;

      let ambiguousAgentRows = 0;

      function addAgent(name: any, email: any, phone: any, brokerage: any, note: string) {
        const fullName = clean(name);
        if (!fullName) return;

        const parts = splitName(fullName);
        const em = norm(email);
        const broker = clean(brokerage);
        const phoneDigits = (value: any) => {
          const digits = clean(value).replace(/\D/g, '');
          return digits.length === 11 && digits.startsWith('1')
            ? digits.slice(1) : digits;
        };
        const incomingPhone = phoneDigits(phone);
        const normalizedName = (value: string) =>
          clean(value).toLowerCase().replace(/\s+/g, ' ');

        const candidates = [
          ...existingAgents.map(a => ({
            ...a,
            ...(agentUpdates.get(a.id) || {})
          })),
          ...pendingAgents.values()
        ];

        const nameMatches = candidates.filter(a =>
          normalizedName(`${a.first_name || ''} ${a.last_name || ''}`) ===
          normalizedName(fullName)
        );

        const emailMatches = em
          ? candidates.filter(a => norm(a.email) === em) : [];
        const phoneMatches = incomingPhone
          ? nameMatches.filter(a => phoneDigits(a.phone) === incomingPhone) : [];

        let existing: any;

        if (emailMatches.length === 1) existing = emailMatches[0];
        else if (emailMatches.length > 1) {
          ambiguousAgentRows++;
          return;
        } else if (phoneMatches.length === 1) existing = phoneMatches[0];
        else if (phoneMatches.length > 1) {
          ambiguousAgentRows++;
          return;
        } else if (nameMatches.length === 1) {
          const candidate = nameMatches[0];
          const savedEmail = norm(candidate.email);
          const savedPhone = phoneDigits(candidate.phone);
          const conflict = (em && savedEmail && em !== savedEmail) ||
            (incomingPhone && savedPhone && incomingPhone !== savedPhone);

          if (conflict) {
            ambiguousAgentRows++;
            return;
          }
          existing = candidate;
        } else if (nameMatches.length > 1) {
          ambiguousAgentRows++;
          return;
        }

        if (!existing) {
          const draft = {
            first_name: parts.first_name,
            last_name: parts.last_name,
            email: em || null,
            phone: clean(phone) || null,
            brokerage: broker || null,
            office_phone: null,
            birthday: null,
            license_number: null,
            notes: note || ''
          };

          pendingAgents.set(
            `${normalizedName(fullName)}|${em}|${incomingPhone}|${pendingAgents.size}`,
            draft
          );
          return;
        }

        duplicateAgents++;

        if (existing.id) {
          const patch: any = { ...(agentUpdates.get(existing.id) || {}) };
          const current = { ...existing, ...patch };

          if (!clean(current.brokerage) && broker) patch.brokerage = broker;
          if (!clean(current.phone) && clean(phone)) patch.phone = clean(phone);
          if (!clean(current.email) && em) patch.email = em;

          const oldNotes = clean(current.notes);
          if (note && !oldNotes.includes(note)) {
            patch.notes = [oldNotes, note].filter(Boolean).join('\n');
          }

          if (Object.keys(patch).length) {
            agentUpdates.set(existing.id, {
              ...(agentUpdates.get(existing.id) || {}),
              ...patch
            });
          }
        } else {
          if (!clean(existing.brokerage) && broker) existing.brokerage = broker;
          if (!clean(existing.phone) && clean(phone)) existing.phone = clean(phone);
          if (!clean(existing.email) && em) existing.email = em;

          const oldNotes = clean(existing.notes);
          if (note && !oldNotes.includes(note)) {
            existing.notes = [oldNotes, note].filter(Boolean).join('\n');
          }
        }
      }

      // Main agent directory: Name, Office, Email, Phone.
      rows(workbook, 'Agents').slice(1).forEach(r => {
        addAgent(r[0], r[2], r[3], r[1], 'Imported from Agents directory');
      });

      // New agents: Start Date, Agent, Email, Cell Phone, Office.
      rows(workbook, 'New Agents').slice(1).forEach(r => {
        const date = excelDate(r[0]);
        addAgent(
          r[1], r[2], r[3], r[4],
          `New agent list${date ? `; start date ${date}` : ''}`
        );
      });

      // PalmAgent: Name, Email, Renewal date in columns C:E.
      rows(workbook, 'PalmAgent').forEach(r => {
        const name = clean(r[2]);
        const email = clean(r[3]);
        if (!name || norm(name) === 'name') return;
        const date = excelDate(r[4]);
        addAgent(
          name, email, '', '',
          `PalmAgent renewal${date ? `: ${date}` : ' date not listed'}`
        );
      });

      // Top Prospects: primary contact list and associated property notes.
      const prospects = rows(workbook, 'Top Prospects');
      prospects.slice(1, 32).forEach(r => {
        const addresses = r.slice(3, 9).map(clean).filter(Boolean);
        addAgent(
          r[0], r[1], r[2], '',
          `Top Prospect${addresses.length ? `; properties: ${addresses.join('; ')}` : ''}`
        );
      });

      // Top-producer block: names, brokerages and reported sales.
      prospects.slice(38, 53).forEach(r => {
        if (clean(r[2]) && norm(r[2]) !== 'agent') {
          addAgent(
            r[2], '', '', r[3],
            `Top Prospect; reported production: ${clean(r[4]) || 'not stated'}`
          );
        }
        if (clean(r[0])) addAgent(r[0], '', '', '', 'Top Prospect');
      });

      // Additional name-only prospect lists.
      prospects.slice(53).forEach(r => {
        if (clean(r[0]) && !['agent'].includes(norm(r[0])))
          addAgent(r[0], '', '', '', 'Top Prospect');
      });

      // Import new agents in chunks.
      const agentRows = Array.from(pendingAgents.values());
      let agentsInserted = agentRows.length;
      let agentsUpdated = agentUpdates.size;

      if (!dryRun) {
        agentsInserted = 0;
        for (let i = 0; i < agentRows.length; i += 100) {
          const batch = agentRows.slice(i, i + 100);
          const { error } = await supabase.from('agents').insert(batch);
          if (error) throw new Error(`Agent import stopped: ${error.message}`);
          agentsInserted += batch.length;
        }

        agentsUpdated = 0;
        for (const [id, patch] of agentUpdates.entries()) {
          const { error } = await supabase.from('agents').update(patch).eq('id', id);
          if (error) throw new Error(`Agent update stopped: ${error.message}`);
          agentsUpdated++;
        }
      }

      // Clients: two contact groups on each worksheet row.
      const clientMap = new Map<string, any>();
      rows(workbook, 'Clients').forEach(r => {
        for (const [n, e, p] of [[1, 2, 3], [5, 6, 7]]) {
          const name = clean(r[n]);
          if (!name) continue;
          const email = norm(r[e]);
          const phone = clean(r[p]);
          const key = email ? `email:${email}` : `name:${norm(name)}:${phone.replace(/\D/g, '')}`;

          if (!clientMap.has(key)) {
            const parts = splitName(name);
            clientMap.set(key, {
              first_name: parts.first_name,
              last_name: parts.last_name || '(not provided)',
              email: email || null,
              phone: phone || null,
              client_type: 'Unspecified',
              notes: 'Imported from Personal.xlsx Clients tab; role not specified in source.'
            });
          }
        }
      });

      const clientByEmail = new Set(existingClients.map(c => norm(c.email)).filter(Boolean));
      const clientByNamePhone = new Set(existingClients.map(c =>
        `${norm(`${c.first_name} ${c.last_name}`)}:${clean(c.phone).replace(/\D/g, '')}`
      ));
      const newClients = Array.from(clientMap.values()).filter(c => {
        if (c.email && clientByEmail.has(norm(c.email))) return false;
        const key = `${norm(`${c.first_name} ${c.last_name}`)}:${clean(c.phone).replace(/\D/g, '')}`;
        if (clientByNamePhone.has(key)) return false;
        if (c.email) clientByEmail.add(norm(c.email));
        clientByNamePhone.add(key);
        return true;
      });

      let clientsInserted = newClients.length;
      if (!dryRun) {
        clientsInserted = 0;
        for (let i = 0; i < newClients.length; i += 100) {
          const batch = newClients.slice(i, i + 100);
          const { error } = await supabase.from('clients').insert(batch);
          if (error) throw new Error(`Client import stopped: ${error.message}`);
          clientsInserted += batch.length;
        }
      }

      // Sponsors: Name, Category, Email, Phone, Address.
      const sponsorMap = new Map<string, any>();
      rows(workbook, 'Sponsors').forEach(r => {
        const name = clean(r[0]);
        if (!name) return;
        const email = norm(r[2]);
        const key = email ? `email:${email}` : `name:${norm(name)}`;
        if (!sponsorMap.has(key)) {
          sponsorMap.set(key, {
            name,
            company: null,
            sponsor_type: clean(r[1]) || null,
            email: email || null,
            phone: clean(r[3]) || null,
            address: clean(r[4]) || null,
            notes: 'Imported from Personal.xlsx Sponsors tab.'
          });
        }
      });

      const existingSponsorKeys = new Set<string>();
      existingSponsors.forEach(x => {
        if (norm(x.email)) existingSponsorKeys.add(`email:${norm(x.email)}`);
        existingSponsorKeys.add(`name:${norm(x.name)}`);
      });

      const newSponsors = Array.from(sponsorMap.values()).filter(x =>
        !(x.email && existingSponsorKeys.has(`email:${norm(x.email)}`)) &&
        !existingSponsorKeys.has(`name:${norm(x.name)}`)
      );

      let sponsorsInserted = newSponsors.length;
      if (!dryRun) {
        sponsorsInserted = 0;
        for (let i = 0; i < newSponsors.length; i += 100) {
          const batch = newSponsors.slice(i, i + 100);
          const { error } = await supabase.from('sponsors').insert(batch);
          if (error) throw new Error(`Sponsor import stopped: ${error.message}`);
          sponsorsInserted += batch.length;
        }
      }

      setSummary(
        `${dryRun ? 'PREVIEW ONLY — no records were changed. ' : 'Import complete. '}` +
        `Agents ${dryRun ? 'to add' : 'added'}: ${agentsInserted}; ` +
        `agents ${dryRun ? 'to enrich' : 'enriched'}: ${agentsUpdated}; ` +
        `clients ${dryRun ? 'to add' : 'added'}: ${clientsInserted}; ` +
        `sponsors ${dryRun ? 'to add' : 'added'}: ${sponsorsInserted}. ` +
        `Agent rows matched: ${duplicateAgents}; ` +
        `ambiguous agent rows skipped for review: ${ambiguousAgentRows}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setLoading(false);
    }
  }

  async function importClosingsAndEvents(dryRun: boolean) {
    if (!workbook || loading) return;
    setLoading(true);
    setError('');
    setSummary('');

    try {
      const [closingResult, eventResult, eventSponsorResult, attendeeResult, agentResult, clientResult, sponsorResult] = await Promise.all([
        supabase.from('closings').select('id,gf_number,property_address'),
        supabase.from('events').select('id,name,event_date,location'),
        supabase.from('event_sponsors').select('id,event_id,sponsor_id,contribution'),
        supabase.from('event_attendees').select('id,event_id,agent_id,client_id,attended'),
        supabase.from('agents').select('id,first_name,last_name,email'),
        supabase.from('clients').select('id,first_name,last_name,email'),
        supabase.from('sponsors').select('id,name')
      ]);
      for (const result of [closingResult, eventResult, eventSponsorResult, attendeeResult, agentResult, clientResult, sponsorResult]) {
        if (result.error) throw new Error(result.error.message);
      }

      const existingClosings: any[] = closingResult.data || [];
      const existingEvents: any[] = eventResult.data || [];
      const existingEventSponsors: any[] = eventSponsorResult.data || [];
      const existingAttendees: any[] = attendeeResult.data || [];
      const agents: any[] = agentResult.data || [];
      const clients: any[] = clientResult.data || [];
      const sponsors: any[] = sponsorResult.data || [];
      const cleanName = (v: any) => clean(v).toLowerCase().replace(/\s+/g, ' ');
      const amount = (v: any): number | null => {
        if (v === null || v === undefined || clean(v) === '') return null;
        const n = Number(String(v).replace(/[$,]/g, '').trim());
        return Number.isFinite(n) ? n : null;
      };
      const resolveAgent = (name: any): string | null => {
        const key = cleanName(name);
        if (!key) return null;
        const matches = agents.filter(a => cleanName(`${a.first_name || ''} ${a.last_name || ''}`) === key);
        return matches.length === 1 ? matches[0].id : null;
      };
      const resolveClient = (name: any): string | null => {
        const key = cleanName(name);
        if (!key) return null;
        const matches = clients.filter(c => cleanName(`${c.first_name || ''} ${c.last_name || ''}`) === key);
        return matches.length === 1 ? matches[0].id : null;
      };

      // Closings are identified by their GF number. The GF label temporarily fills property_address.
      const closingRows = rows(workbook, 'Closings');
      const existingGfs = new Set(existingClosings.map(c => (clean(c.gf_number || '') || clean(c.property_address || '').replace(/^GF #/i, '')).toLowerCase()).filter(Boolean));
      const seenGfs = new Set<string>();
      const closingRecords: any[] = [];
      let closingAlreadyPresent = 0;
      let closingFlagged = 0;
      let closingRowsSkipped = 0;
      let sectionTitle = '';
      let insideClosingTable = false;

      closingRows.forEach((r, index) => {
        const first = clean(r[0]);
        const firstNorm = norm(first);
        if (firstNorm.startsWith('closed - mtd')) {
          sectionTitle = first;
          insideClosingTable = false;
          return;
        }
        if (firstNorm === 'gfno') {
          insideClosingTable = true;
          return;
        }
        if (!insideClosingTable || !first || firstNorm === 'total') return;
        if (!/\d/.test(first) || !first.toUpperCase().includes('GRA')) return;

        const gf = first.trim();
        const gfKey = gf.toLowerCase();
        if (seenGfs.has(gfKey)) { closingRowsSkipped++; return; }
        seenGfs.add(gfKey);
        if (existingGfs.has(gfKey)) { closingAlreadyPresent++; return; }

        const openDate = excelDate(r[1]);
        const closeDate = excelDate(r[2]);
        const rawStatus = norm(r[3]);
        let status = rawStatus === 'closed' ? 'closed' :
          rawStatus === 'cancelled' || rawStatus === 'canceled' ? 'cancelled' :
          rawStatus.includes('closing scheduled') ? 'closing_scheduled' :
          rawStatus.includes('under contract') ? 'under_contract' :
          rawStatus === 'open' ? 'open' :
          sectionTitle.toLowerCase().startsWith('closed - mtd') ? 'closed' : 'open';

        const customer = clean(r[4]);
        const buyerName = clean(r[5]);
        const listingName = clean(r[6]);
        const notes: string[] = [`Imported from Personal.xlsx Closings tab, row ${index + 1}.`];
        if (r[9] !== '' && r[9] != null) notes.push(`Workbook premium: ${clean(r[9])}`);
        if (customer && !resolveClient(customer)) notes.push(`Workbook customer: ${customer} (not linked to a saved client).`);
        if (buyerName && !resolveAgent(buyerName)) notes.push(`Buyer agent not linked: ${buyerName}.`);
        if (listingName && !resolveAgent(listingName)) notes.push(`Listing agent not linked: ${listingName}.`);
        if (!openDate) {
          closingFlagged++;
          if (clean(r[1])) notes.push(`Open date value could not be parsed: ${clean(r[1])}; contract date left blank.`);
          else notes.push('Open date was blank; contract date left blank.');
        }
        if (rawStatus !== 'closed' && status === 'closed') {
          notes.push(`Status inferred as Closed from workbook section: ${sectionTitle}.`);
        }

        closingRecords.push({
          property_address: `GF #${gf}`,
          city: null,
          county: clean(r[8]) || null,
          gf_number: gf,
          client_id: resolveClient(customer),
          buyer_agent_id: resolveAgent(buyerName),
          listing_agent_id: resolveAgent(listingName),
          contract_date: openDate || null,
          estimated_close_date: status === 'closed' || status === 'cancelled' ? null : closeDate || null,
          actual_close_date: status === 'closed' ? closeDate || null : null,
          sale_price: amount(r[11]),
          loan_amount: amount(r[10]),
          escrow_officer: clean(r[7]) || null,
          notes: notes.join('\n'),
          status
        });
      });

      // Events tab uses four separate blocks. Dates, venues, attendee lists, RSVP lists and sponsors
      // are mapped from their labelled columns; unlabelled name-only cells are not guessed into links.
      const eventSheet = workbook.Sheets['Events'];
      const eventRows = eventSheet
        ? XLSX.utils.sheet_to_json(eventSheet, {
            header: 1,
            defval: '',
            raw: true,
            blankrows: true,
            range: { s: { r: 0, c: 0 }, e: { r: 58, c: 15 } }
          }) as any[][]
        : [];

      const eventSpecs = [
        { title: eventRows[1]?.[1], sponsorBlock: { start: 4, end: 9, nameCol: 1, detailCol: 2 }, attendeeBlock: { start: 4, end: 14, nameCol: 3, emailCol: 4, phoneCol: 5 }, rsvpBlock: null, locationOnly: false },
        { title: eventRows[1]?.[8], sponsorBlock: { start: 4, end: 9, nameCol: 8, detailCol: 9 }, attendeeBlock: { start: 4, end: 18, nameCol: 10, phoneCol: 11, emailCol: 12 }, rsvpBlock: { start: 4, end: 28, nameCol: 13, phoneCol: 14, emailCol: 15 }, locationOnly: true },
        { title: eventRows[18]?.[1], sponsorBlock: null, attendeeBlock: null, rsvpBlock: { start: 18, end: 28, nameCol: 13, phoneCol: 14, emailCol: 15 }, locationOnly: false },
        { title: eventRows[29]?.[9], sponsorBlock: { start: 31, end: 34, nameCol: 9, detailCol: 10 }, attendeeBlock: { start: 31, end: 59, nameCol: 11, emailCol: 12, phoneCol: 13 }, rsvpBlock: { start: 31, end: 58, nameCol: 14, emailCol: 15 }, locationOnly: true }
      ];

      const parseEventTitle = (value: any, locationOnly: boolean) => {
        const title = clean(value);
        const match = title.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!match) return null;
        const date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        const rest = title.slice(match[0].length).replace(/^\s*-\s*/, '').trim();
        const segments = rest.split(/\s+-\s+/).filter(Boolean);
        let name = '';
        let location = '';
        if (segments.length >= 2) {
          location = segments[0];
          name = segments.slice(1).join(' - ');
        } else if (locationOnly && rest) {
          location = rest;
          name = `${rest} Event`;
        } else {
          name = rest;
        }
        return name ? { date, name, location: location || null, sourceTitle: title } : null;
      };

      const eventWork: any[] = [];
      let invalidEventBlocks = 0;
      for (const spec of eventSpecs) {
        const parsed = parseEventTitle(spec.title, spec.locationOnly);
        if (!parsed) { invalidEventBlocks++; continue; }
        const attendeeRows: any[] = [];
        const sponsorRows: any[] = [];
        const readPeople = (block: any, attended: boolean) => {
          if (!block) return;
          for (let i = block.start; i < block.end; i++) {
            const r = eventRows[i] || [];
            const personName = clean(r[block.nameCol]);
            if (!personName || norm(personName) === 'name' || norm(personName) === 'rsvp') continue;
            attendeeRows.push({ name: personName, email: clean(r[block.emailCol]), phone: clean(r[block.phoneCol]), attended });
          }
        };
        readPeople(spec.attendeeBlock, true);
        readPeople(spec.rsvpBlock, false);
        if (spec.sponsorBlock) {
          for (let i = spec.sponsorBlock.start; i < spec.sponsorBlock.end; i++) {
            const r = eventRows[i] || [];
            const sponsorName = clean(r[spec.sponsorBlock.nameCol]);
            if (!sponsorName || norm(sponsorName) === 'sponsors') continue;
            sponsorRows.push({ name: sponsorName, detail: clean(r[spec.sponsorBlock.detailCol]) });
          }
        }
        const sourceNotes = [`Source label: ${parsed.sourceTitle}.`, 'Event type and status were not specified in the workbook; set to Other / Planned for review.'];
        if (parsed.name === 'Christmas in Cowtown') {
          const unlabelled = (eventRows[20] || []).slice(1, 5).map(clean).filter(Boolean);
          if (unlabelled.length) sourceNotes.push(`Additional unlabelled names in workbook: ${unlabelled.join(', ')}.`);
        }
        const sponsorDetails = sponsorRows.map(x => `${x.name}${x.detail ? ` — ${x.detail}` : ''}`);
        if (sponsorDetails.length) sourceNotes.push(`Workbook sponsor details: ${sponsorDetails.join('; ')}.`);
        eventWork.push({
          record: {
            name: parsed.name,
            event_type: 'Other',
            event_date: new Date(`${parsed.date}T12:00:00`).toISOString(),
            location: parsed.location,
            description: `Imported from Personal.xlsx Events tab. ${sourceNotes.join(' ')}`,
            budget: null,
            status: 'completed'
          },
          sourceDate: parsed.date,
          attendeeRows,
          sponsorRows,
          existing: null,
          id: null,
          skip: false
        });
      }

      const day = (value: any) => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      };
      let eventsAlreadyPresent = 0;
      let ambiguousEventBlocks = 0;
      for (const item of eventWork) {
        const matches = existingEvents.filter(e => day(e.event_date) === item.sourceDate &&
          (cleanName(e.name) === cleanName(item.record.name) ||
            (item.record.location && cleanName(e.location) === cleanName(item.record.location))));
        if (matches.length === 1) {
          item.existing = matches[0];
          item.id = matches[0].id;
          eventsAlreadyPresent++;
        } else if (matches.length > 1) {
          item.skip = true;
          ambiguousEventBlocks++;
        }
      }

      const resolveEventPerson = (person: any) => {
        const email = norm(person.email);
        if (email) {
          const emailMatches = [
            ...agents.filter(a => norm(a.email) === email).map(a => ({ type: 'agent', id: a.id })),
            ...clients.filter(c => norm(c.email) === email).map(c => ({ type: 'client', id: c.id }))
          ];
          if (emailMatches.length === 1) return emailMatches[0];
          if (emailMatches.length > 1) return null;
        }
        const name = cleanName(person.name);
        const nameMatches = [
          ...agents.filter(a => cleanName(`${a.first_name || ''} ${a.last_name || ''}`) === name).map(a => ({ type: 'agent', id: a.id })),
          ...clients.filter(c => cleanName(`${c.first_name || ''} ${c.last_name || ''}`) === name).map(c => ({ type: 'client', id: c.id }))
        ];
        return nameMatches.length === 1 ? nameMatches[0] : null;
      };
      const existingAttendanceKeys = new Map<string, any>();
      existingAttendees.forEach(a => {
        const personKey = a.agent_id ? `agent:${a.agent_id}` : a.client_id ? `client:${a.client_id}` : '';
        if (personKey) existingAttendanceKeys.set(`${a.event_id}|${personKey}`, a);
      });
      const existingSponsorKeys = new Set(existingEventSponsors.map(x => `${x.event_id}|${x.sponsor_id}`));
      let unresolvedPeople = 0;
      let unresolvedSponsors = 0;
      let attendeesToAdd = 0;
      let attendeesToMarkAttended = 0;
      let sponsorLinksToAdd = 0;
      const attendeeWork: any[] = [];
      const sponsorLinkWork: any[] = [];

      for (const item of eventWork.filter(x => !x.skip)) {
        const people = new Map<string, any>();
        for (const raw of item.attendeeRows) {
          const person = resolveEventPerson(raw);
          if (!person) { unresolvedPeople++; continue; }
          const key = `${person.type}:${person.id}`;
          const previous = people.get(key);
          people.set(key, { ...person, attended: !!raw.attended || !!previous?.attended });
        }
        for (const person of people.values()) {
          const existing = item.id ? existingAttendanceKeys.get(`${item.id}|${person.type}:${person.id}`) : null;
          if (existing) {
            if (person.attended && !existing.attended) {
              attendeeWork.push({ kind: 'update', id: existing.id, attended: true });
              attendeesToMarkAttended++;
            }
          } else {
            attendeeWork.push({ kind: 'insert', item, person, attended: person.attended });
            attendeesToAdd++;
          }
        }

        const linkedSponsors = new Map<string, any>();
        for (const raw of item.sponsorRows) {
          const matches = sponsors.filter(s => cleanName(s.name) === cleanName(raw.name));
          if (matches.length !== 1) { unresolvedSponsors++; continue; }
          const contributionText = String(raw.detail || '');
          const contributionMatch = contributionText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
          const contribution = contributionMatch ? amount(contributionMatch[1]) : null;
          linkedSponsors.set(matches[0].id, { sponsorId: matches[0].id, contribution });
        }
        for (const link of linkedSponsors.values()) {
          const exists = item.id && existingSponsorKeys.has(`${item.id}|${link.sponsorId}`);
          if (!exists) {
            sponsorLinkWork.push({ item, ...link });
            sponsorLinksToAdd++;
          }
        }
      }

      let closingsInserted = closingRecords.length;
      let eventsInserted = eventWork.filter(x => !x.skip && !x.existing).length;
      if (!dryRun) {
        closingsInserted = 0;
        for (let i = 0; i < closingRecords.length; i += 100) {
          const batch = closingRecords.slice(i, i + 100);
          const { error } = await supabase.from('closings').insert(batch);
          if (error) throw new Error(`Closing import stopped: ${error.message}`);
          closingsInserted += batch.length;
        }

        eventsInserted = 0;
        for (const item of eventWork.filter(x => !x.skip)) {
          if (item.existing) continue;
          const { data, error } = await supabase.from('events').insert([item.record]).select('id').single();
          if (error) throw new Error(`Event import stopped: ${error.message}`);
          item.id = data.id;
          eventsInserted++;
        }

        for (const link of attendeeWork) {
          if (link.kind === 'update') {
            const { error } = await supabase.from('event_attendees').update({ attended: true }).eq('id', link.id);
            if (error) throw new Error(`Attendee update stopped: ${error.message}`);
          } else {
            const record = {
              event_id: link.item.id,
              agent_id: link.person.type === 'agent' ? link.person.id : null,
              client_id: link.person.type === 'client' ? link.person.id : null,
              attended: link.attended
            };
            const { error } = await supabase.from('event_attendees').insert([record]);
            if (error) throw new Error(`Attendee import stopped: ${error.message}`);
          }
        }
        for (const link of sponsorLinkWork) {
          const { error } = await supabase.from('event_sponsors').insert([{
            event_id: link.item.id,
            sponsor_id: link.sponsorId,
            contribution: link.contribution
          }]);
          if (error) throw new Error(`Event sponsor import stopped: ${error.message}`);
        }
      }

      setSummary(
        `${dryRun ? 'PREVIEW ONLY — no records were changed. ' : 'Import complete. '}` +
        `Closings ${dryRun ? 'to add' : 'added'}: ${closingsInserted}; existing GF numbers skipped: ${closingAlreadyPresent}; ` +
        `closing rows skipped as duplicates: ${closingRowsSkipped}; flagged closing rows: ${closingFlagged}. ` +
        `Events ${dryRun ? 'to add' : 'added'}: ${eventsInserted}; existing events matched: ${eventsAlreadyPresent}; ` +
        `ambiguous event blocks skipped: ${ambiguousEventBlocks}; invalid event blocks: ${invalidEventBlocks}. ` +
        `Attendee links ${dryRun ? 'to add' : 'added'}: ${attendeesToAdd}; existing attendees to mark attended: ${attendeesToMarkAttended}; ` +
        `sponsor links ${dryRun ? 'to add' : 'added'}: ${sponsorLinksToAdd}; ` +
        `unmatched attendees: ${unresolvedPeople}; unmatched sponsors: ${unresolvedSponsors}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Closing and event import failed.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <div className="page-heading">
      <div>
        <h1>Excel Import Center</h1>
        <p>Preview your workbook, then import contacts into TitleConnect.</p>
      </div>
    </div>

    <section className="panel form-panel">
      <h2>Upload Excel Workbook</h2>
      <p className="muted">Upload Personal.xlsx. The file is read in your browser.</p>
      <input type="file" accept=".xlsx,.xls" onChange={e => preview(e.target.files?.[0])}/>
      {loading && <p>Working...</p>}
      {fileName && <p><strong>Selected:</strong> {fileName}</p>}
      {error && <p style={{color:'#b91c1c'}}>{error}</p>}
      {summary && <p style={{color:'#166534',fontWeight:600}}>{summary}</p>}
    </section>

    {sheets.length > 0 && <>
      <div className="stats">
        <ImportStat label="Worksheets" value={sheets.length}/>
        <ImportStat label="Populated rows" value={sheets.reduce((n,x)=>n+x.count,0)}/>
        <ImportStat label="Contact tabs" value={5}/>
        <ImportStat label="Special mapping tabs" value={3}/>
      </div>

      <section className="panel">
        <h2>Workbook Preview</h2>
        {sheets.map(x=><div className="recent" key={x.name}>
          <div><strong>{x.name}</strong><p>{x.count} populated rows</p></div>
        </div>)}
      </section>

      <section className="panel">
        <h2>Import Contacts & Sponsors</h2>
        <p className="muted">
          Imports Agents, New Agents, PalmAgent, Top Prospects, Clients and Sponsors.
          Existing contacts are matched by email or name. New-agent start dates,
          PalmAgent renewal dates and prospect property notes are preserved in agent notes.
        </p>
        <div className="form-actions">
          <button className="secondary" disabled={loading || !workbook} onClick={() => importContacts(true)}>
            {loading ? 'Working...' : 'Preview Import'}
          </button>
          <button className="primary" disabled={loading || !workbook} onClick={() => importContacts(false)}>
            {loading ? 'Importing...' : 'Import Contacts & Sponsors'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Import Closings & Events</h2>
        <p className="muted">
          Closings use a temporary GF label as the property address, while the GF number is preserved separately.
          Buyer, listing-agent and client links are created only when there is one exact saved-contact match.
          Events are imported as Other / Planned because the workbook does not specify event types or completion status.
          Preview first; nothing is written until you choose Import.
        </p>
        <div className="form-actions">
          <button className="secondary" disabled={loading || !workbook} onClick={() => importClosingsAndEvents(true)}>
            {loading ? 'Working...' : 'Preview Closings & Events'}
          </button>
          <button className="primary" disabled={loading || !workbook} onClick={() => importClosingsAndEvents(false)}>
            {loading ? 'Importing...' : 'Import Closings & Events'}
          </button>
        </div>
      </section>
    </>}
  </>;
}

function ImportStat({label,value}: {label:string,value:number}) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span></div>
    <strong>{value}</strong>
  </div>;
}
