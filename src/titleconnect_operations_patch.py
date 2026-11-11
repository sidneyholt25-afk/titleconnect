from pathlib import Path
import re

path = Path('src/components/ImportCenter.tsx')
s = path.read_text()
if s.count('  return <>') != 1:
    raise SystemExit('Stopped safely: could not identify the ImportCenter render section exactly once.')

function_code = r'''  async function importClosingsAndEvents(dryRun: boolean) {
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
      const eventRows = rows(workbook, 'Events');
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
            status: 'planned'
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

'''

s = s.replace('  return <>', function_code + '  return <>', 1)

pattern = re.compile(r'      <section className="panel">\s*<h2>Still to Import</h2>[\s\S]*?      </section>')
replacement = '''      <section className="panel">
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
      </section>'''
if len(pattern.findall(s)) != 1:
    raise SystemExit('Stopped safely: could not find the Still to Import panel exactly once.')
s = pattern.sub(replacement, s, count=1)
path.write_text(s)
print('Closings and Events preview/import added. No database changes were made.')
