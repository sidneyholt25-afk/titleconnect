import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './lib/Auth';
import ImportCenter from './components/ImportCenter';
import {
  LayoutDashboard, Users, Mail, House, ClipboardList,
  CalendarDays, Plus, Search, Bell, Handshake, Globe,
  CheckCircle2, Clock, ArrowUpRight, Copy,
  Menu, X, Building2, MessageSquare, CalendarCheck, FileSpreadsheet
} from 'lucide-react';
import './index.css';

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  client_type: string;
  notes: string;
};

type Agent = {
  id: string;
  name: string;
  brokerage: string;
  email: string;
  phone: string;
  status: string;
  office_phone?: string;
  birthday?: string;
  license_number?: string;
  notes?: string;
};

const templates: Record<string, string> = {
  'New Agent': "Congratulations on joining the real estate industry! I'd love to introduce myself and learn more about your business. Would you be open to grabbing coffee sometime soon? I'd love the opportunity to connect!",
  'New Listing': "Congratulations on your new listing! If there's anything I can do to help throughout the transaction, please don't hesitate to reach out. I'm always happy to be a resource!",
  'Contract Received': "Hi! I wanted to introduce myself and let you know I'm here as a resource throughout the closing process. Please reach out anytime if you need anything. Looking forward to working with you!",
  'Mid-Closing': "Just checking in to see how everything is going with the transaction! Please let me know if there's anything I can do to help make the process smoother.",
  'After Closing': "It was such a pleasure working with you on this transaction! Thank you for allowing us to be a part of it. I look forward to working together again soon!",
  'Coffee Invitation': "I'd love to get together, hear more about your business, and learn how I can better support you. Are you available for coffee sometime next week?"
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return <div>Loading TitleConnect...</div>;
  if (!session) return <Auth />;

  return <Dashboard />;
}

function Dashboard() {
  const [page, setPage] = useState('Dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientType, setClientType] = useState('Buyer');
  const [clientNotes, setClientNotes] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientActivities, setClientActivities] = useState<any[]>([]);
  const [clientInteractionType, setClientInteractionType] = useState('Phone Call');
  const [clientInteractionDescription, setClientInteractionDescription] = useState('');
  const [clientInteractionDate, setClientInteractionDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState(false);
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [interactionType, setInteractionType] = useState('Phone Call');
  const [interactionDescription, setInteractionDescription] = useState('');
  const [interactionDate, setInteractionDate] = useState(new Date().toISOString().slice(0, 10));

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [template, setTemplate] = useState('New Agent');
  const [copied, setCopied] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityType, setActivityType] = useState('Phone Call');
  const [activityContactType, setActivityContactType] = useState('agent');
  const [activityContactId, setActivityContactId] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventType, setEventType] = useState('Networking');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventBudget, setEventBudget] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [eventSponsors, setEventSponsors] = useState<any[]>([]);
  const [eventAttendees, setEventAttendees] = useState<any[]>([]);
  const [eventSponsorId, setEventSponsorId] = useState('');
  const [eventContribution, setEventContribution] = useState('');
  const [eventAttendeeType, setEventAttendeeType] = useState('agent');
  const [eventAttendeeId, setEventAttendeeId] = useState('');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorCompany, setSponsorCompany] = useState('');
  const [sponsorType, setSponsorType] = useState('Vendor');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [sponsorPhone, setSponsorPhone] = useState('');
  const [sponsorAddress, setSponsorAddress] = useState('');
  const [sponsorNotes, setSponsorNotes] = useState('');
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskLinkType, setTaskLinkType] = useState('none');
  const [taskLinkId, setTaskLinkId] = useState('');
  const [closings, setClosings] = useState<any[]>([]);
  const [showClosingForm, setShowClosingForm] = useState(false);
  const [closingAddress, setClosingAddress] = useState('');
  const [closingCity, setClosingCity] = useState('Granbury');
  const [closingCounty, setClosingCounty] = useState('Hood');
  const [closingGF, setClosingGF] = useState('');
  const [closingClient, setClosingClient] = useState('');
  const [buyerAgent, setBuyerAgent] = useState('');
  const [listingAgent, setListingAgent] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [estimatedCloseDate, setEstimatedCloseDate] = useState('');
  const [actualCloseDate, setActualCloseDate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [escrowOfficer, setEscrowOfficer] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase.from('clients')
        .select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Could not load clients:', error.message);
        return;
      }
      setClients((data || []).map(c => ({
        id: c.id,
        name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        email: c.email || '',
        phone: c.phone || '',
        client_type: c.client_type || '',
        notes: c.notes || ''
      })));
    }
    loadClients();
  }, []);

  useEffect(() => {
    async function loadClosings() {
      const { data, error } = await supabase.from('closings')
        .select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Could not load closings:', error.message);
        return;
      }
      setClosings(data || []);
    }
    loadClosings();
  }, []);


  useEffect(() => {
    async function loadOperations() {
      const [sp, ev, ts, ac, es, ea] = await Promise.all([
        supabase.from('sponsors').select('*').order('name'),
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('activities').select('*').order('activity_date', { ascending: false }),
        supabase.from('event_sponsors').select('*'),
        supabase.from('event_attendees').select('*')
      ]);

      for (const result of [sp, ev, ts, ac, es, ea]) {
        if (result.error) console.error('Could not load operations data:', result.error.message);
      }
      if (!sp.error) setSponsors(sp.data || []);
      if (!ev.error) setEvents(ev.data || []);
      if (!ts.error) setTasks(ts.data || []);
      if (!ac.error) setActivities(ac.data || []);
      if (!es.error) setEventSponsors(es.data || []);
      if (!ea.error) setEventAttendees(ea.data || []);
    }
    loadOperations();
  }, []);

  async function addSponsor() {
    if (!sponsorName.trim()) {
      alert('Please enter a sponsor name.');
      return;
    }
    const { data, error } = await supabase.from('sponsors').insert([{
      name: sponsorName.trim(),
      company: sponsorCompany || null,
      sponsor_type: sponsorType || null,
      email: sponsorEmail || null,
      phone: sponsorPhone || null,
      address: sponsorAddress || null,
      notes: sponsorNotes || null
    }]).select().single();

    if (error) {
      alert('Could not save sponsor: ' + error.message);
      return;
    }
    setSponsors(current => [...current, data].sort((a,b) => a.name.localeCompare(b.name)));
    setSponsorName('');
    setSponsorCompany('');
    setSponsorType('Vendor');
    setSponsorEmail('');
    setSponsorPhone('');
    setSponsorAddress('');
    setSponsorNotes('');
    setShowSponsorForm(false);
    alert('Sponsor saved!');
  }

  async function addEvent() {
    if (!eventName.trim()) {
      alert('Please enter an event name.');
      return;
    }
    const { data, error } = await supabase.from('events').insert([{
      name: eventName.trim(),
      event_type: eventType,
      event_date: eventDate ? new Date(eventDate).toISOString() : null,
      location: eventLocation || null,
      description: eventDescription || null,
      budget: eventBudget ? Number(eventBudget) : null,
      status: 'planned'
    }]).select().single();

    if (error) {
      alert('Could not save event: ' + error.message);
      return;
    }
    setEvents(current => [data, ...current]);
    setEventName('');
    setEventLocation('');
    setEventType('Networking');
    setEventDate('');
    setEventDescription('');
    setEventBudget('');
    alert('Event saved!');
  }

  async function updateEventStatus(id: string, status: string) {
    const { error } = await supabase.from('events')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      alert('Could not update event: ' + error.message);
      return;
    }
    setEvents(current => current.map(e => e.id === id ? {...e, status} : e));
  }

  async function addEventSponsor(eventId: string) {
    if (!eventSponsorId) {
      alert('Select a sponsor first.');
      return;
    }
    const { data, error } = await supabase.from('event_sponsors').insert([{
      event_id: eventId,
      sponsor_id: eventSponsorId,
      contribution: eventContribution ? Number(eventContribution) : null
    }]).select().single();
    if (error) {
      alert('Could not link sponsor: ' + error.message);
      return;
    }
    setEventSponsors(current => [...current, data]);
    setEventSponsorId('');
    setEventContribution('');
  }

  async function addEventAttendee(eventId: string) {
    if (!eventAttendeeId) {
      alert('Select an attendee first.');
      return;
    }
    const record = {
      event_id: eventId,
      agent_id: eventAttendeeType === 'agent' ? eventAttendeeId : null,
      client_id: eventAttendeeType === 'client' ? eventAttendeeId : null
    };
    const { data, error } = await supabase.from('event_attendees')
      .insert([record]).select().single();
    if (error) {
      alert('Could not add attendee: ' + error.message);
      return;
    }
    setEventAttendees(current => [...current, data]);
    setEventAttendeeId('');
  }

  async function addTask() {
    if (!taskTitle.trim()) {
      alert('Please enter a task title.');
      return;
    }
    const record: any = {
      title: taskTitle.trim(),
      description: taskDescription || null,
      due_date: taskDueDate ? new Date(taskDueDate + 'T12:00:00').toISOString() : null,
      priority: taskPriority,
      completed: false
    };

    if (taskLinkType !== 'none' && taskLinkId) {
      const column: Record<string,string> = {
        agent: 'agent_id', client: 'client_id', sponsor: 'sponsor_id',
        closing: 'closing_id', event: 'event_id'
      };
      record[column[taskLinkType]] = taskLinkId;
    }

    const { data, error } = await supabase.from('tasks').insert([record]).select().single();
    if (error) {
      alert('Could not save task: ' + error.message);
      return;
    }
    setTasks(current => [...current, data].sort((a,b) =>
      (a.due_date || '9999').localeCompare(b.due_date || '9999')
    ));
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
    setTaskPriority('normal');
    setTaskLinkType('none');
    setTaskLinkId('');
  }

  async function toggleTask(task: any) {
    const completed = !task.completed;
    const { error } = await supabase.from('tasks').update({ completed }).eq('id', task.id);
    if (error) {
      alert('Could not update task: ' + error.message);
      return;
    }
    setTasks(current => current.map(t => t.id === task.id ? {...t, completed} : t));
  }

  async function addActivity() {
    if (!activityDescription.trim()) {
      alert('Please enter interaction notes.');
      return;
    }
    const record: any = {
      activity_type: activityType,
      description: activityDescription.trim(),
      activity_date: new Date().toISOString()
    };
    if (activityContactId) {
      const column: Record<string,string> = {
        agent: 'agent_id', client: 'client_id', sponsor: 'sponsor_id',
        closing: 'closing_id', event: 'event_id'
      };
      record[column[activityContactType]] = activityContactId;
    }

    const { data, error } = await supabase.from('activities').insert([record]).select().single();
    if (error) {
      alert('Could not save activity: ' + error.message);
      return;
    }
    setActivities(current => [data, ...current]);
    setActivityDescription('');
    setActivityContactId('');
    alert('Activity saved!');
  }

  async function addClosing() {
    if (!closingAddress.trim()) {
      alert('Please enter the property address.');
      return;
    }

    const { data, error } = await supabase.from('closings').insert([{
      property_address: closingAddress.trim(),
      city: closingCity || null,
      county: closingCounty || null,
      gf_number: closingGF || null,
      client_id: closingClient || null,
      buyer_agent_id: buyerAgent || null,
      listing_agent_id: listingAgent || null,
      contract_date: contractDate || null,
      estimated_close_date: estimatedCloseDate || null,
      actual_close_date: actualCloseDate || null,
      sale_price: salePrice ? Number(salePrice) : null,
      loan_amount: loanAmount ? Number(loanAmount) : null,
      escrow_officer: escrowOfficer || null,
      notes: closingNotes || null,
      status: 'open'
    }]).select().single();

    if (error) {
      alert('Could not save closing: ' + error.message);
      return;
    }

    setClosings(current => [data, ...current]);
    setClosingAddress('');
    setClosingGF('');
    setClosingClient('');
    setBuyerAgent('');
    setListingAgent('');
    setContractDate('');
    setEstimatedCloseDate('');
    setActualCloseDate('');
    setSalePrice('');
    setLoanAmount('');
    setEscrowOfficer('');
    setClosingNotes('');
    setShowClosingForm(false);
    alert('Closing saved!');
  }

  async function updateClosingStatus(id: string, status: string) {
    const { error } = await supabase.from('closings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      alert('Could not update closing: ' + error.message);
      return;
    }
    setClosings(current => current.map(c => c.id === id ? { ...c, status } : c));
  }

  async function addClient() {
    if (!clientName.trim()) {
      alert('Please enter a client name.');
      return;
    }
    const parts = clientName.trim().split(/\s+/);
    const first_name = parts.shift() || '';
    const last_name = parts.join(' ');
    const { data, error } = await supabase.from('clients').insert([{
      first_name, last_name,
      email: clientEmail || null,
      phone: clientPhone || null,
      client_type: clientType,
      notes: clientNotes || null
    }]).select().single();

    if (error) {
      alert('Could not save client: ' + error.message);
      return;
    }
    setClients(current => [{
      id: data.id,
      name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      email: data.email || '',
      phone: data.phone || '',
      client_type: data.client_type || '',
      notes: data.notes || ''
    }, ...current]);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientType('Buyer');
    setClientNotes('');
    setShowClientForm(false);
    alert('Client saved!');
  }

  useEffect(() => {
    async function loadAgents() {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Could not load agents:', error.message);
        return;
      }

      setAgents((data || []).map(a => ({
        id: a.id,
        name: [a.first_name, a.last_name].filter(Boolean).join(' '),
        brokerage: a.brokerage || '',
        email: a.email || '',
        phone: a.phone || '',
        office_phone: a.office_phone || '',
        birthday: a.birthday || '',
        license_number: a.license_number || '',
        notes: a.notes || '',
        status: 'Active'
      })));
    }

    loadAgents();
  }, []);



  useEffect(() => {
    if (!selectedClient) {
      setClientActivities([]);
      return;
    }
    async function loadClientActivities() {
      const { data, error } = await supabase.from('activities')
        .select('*').eq('client_id', selectedClient!.id)
        .order('activity_date', { ascending: false });
      if (error) {
        console.error(error.message);
        return;
      }
      setClientActivities(data || []);
    }
    loadClientActivities();
  }, [selectedClient?.id]);

  async function addClientActivity() {
    if (!selectedClient || !clientInteractionDescription.trim()) {
      alert('Please enter interaction notes.');
      return;
    }
    const { data, error } = await supabase.from('activities').insert([{
      client_id: selectedClient.id,
      activity_type: clientInteractionType,
      description: clientInteractionDescription.trim(),
      activity_date: new Date(clientInteractionDate + 'T12:00:00').toISOString()
    }]).select().single();

    if (error) {
      alert('Could not save interaction: ' + error.message);
      return;
    }
    setClientActivities(current => [data, ...current]);
    setClientInteractionDescription('');
    alert('Client interaction saved!');
  }

  async function saveAgentChanges() {
    if (!selectedAgent) return;
    if ([selectedAgent.phone, selectedAgent.office_phone || ''].some(v => v && v.replace(/\D/g, '').length !== 10)) {
      alert('Phone numbers must contain exactly 10 digits.');
      return;
    }


    const parts = selectedAgent.name.trim().split(/\s+/);
    const first_name = parts.shift() || '';
    const last_name = parts.join(' ');

    const { error } = await supabase
      .from('agents')
      .update({
        first_name,
        last_name,
        brokerage: selectedAgent.brokerage,
        email: selectedAgent.email,
        phone: selectedAgent.phone,
        office_phone: selectedAgent.office_phone || null,
        birthday: selectedAgent.birthday || null,
        license_number: selectedAgent.license_number || null,
        notes: selectedAgent.notes || null
      })
      .eq('id', selectedAgent.id);

    if (error) {
      alert('Could not update agent: ' + error.message);
      return;
    }

    setAgents(current => current.map(a =>
      a.id === selectedAgent.id ? selectedAgent : a
    ));
    setEditingAgent(false);
    alert('Agent profile updated!');
  }


  useEffect(() => {
    if (!selectedAgent) {
      setAgentActivities([]);
      return;
    }

    async function loadAgentActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('agent_id', selectedAgent!.id)
        .order('activity_date', { ascending: false });

      if (error) {
        console.error('Could not load interactions:', error.message);
        return;
      }
      setAgentActivities(data || []);
    }

    loadAgentActivities();
  }, [selectedAgent?.id]);

  async function addAgentActivity() {
    if (!selectedAgent || !interactionDescription.trim()) {
      alert('Please enter interaction notes.');
      return;
    }

    const { data, error } = await supabase
      .from('activities')
      .insert([{
        agent_id: selectedAgent.id,
        activity_type: interactionType,
        description: interactionDescription.trim(),
        activity_date: new Date(interactionDate + 'T12:00:00').toISOString()
      }])
      .select()
      .single();

    if (error) {
      alert('Could not save interaction: ' + error.message);
      return;
    }

    setAgentActivities(current => [data, ...current]);
    setInteractionDescription('');
    alert('Interaction saved!');
  }

  const nav = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Import Center', icon: FileSpreadsheet },
    { name: 'Resource Center', icon: Globe },
    { name: 'Agent CRM', icon: Users },
    { name: 'Client CRM', icon: Users },
    { name: 'Sponsors', icon: Handshake },
    { name: 'Message Center', icon: Mail },
    { name: 'Closing Tracker', icon: House },
    { name: 'Activity Log', icon: ClipboardList },
    { name: 'Tasks', icon: CheckCircle2 },
    { name: 'Events & Sponsorships', icon: CalendarDays },
  ];

  async function addAgent() {
    if (!agentName.trim()) return;
    if ([phone, officePhone].some(v => v && v.replace(/\D/g, '').length !== 10)) {
      alert('Phone numbers must contain exactly 10 digits.');
      return;
    }


    const nameParts = agentName.trim().split(/\s+/);
    const first_name = nameParts.shift() || '';
    const last_name = nameParts.join(' ');

    const { data, error } = await supabase
      .from('agents')
      .insert([{ first_name, last_name, brokerage, email, phone, office_phone: officePhone || null, birthday: birthday || null, license_number: licenseNumber || null, notes: agentNotes || null }])
      .select()
      .single();

    if (error) {
      alert('Could not save agent: ' + error.message);
      return;
    }

    setAgents(current => [{
      id: data.id,
      name: [data.first_name, data.last_name].filter(Boolean).join(' '),
      brokerage: data.brokerage || '',
      email: data.email || '',
      phone: data.phone || '',
      office_phone: data.office_phone || '',
      birthday: data.birthday || '',
      license_number: data.license_number || '',
      notes: data.notes || '',
      status: 'New'
    }, ...current]);

    setAgentName(''); setBrokerage(''); setEmail(''); setPhone('');
    setOfficePhone(''); setBirthday(''); setLicenseNumber(''); setAgentNotes('');
    setShowForm(false);
  }





  const filteredAgents = agents.filter(a =>
    `${a.name} ${a.brokerage}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Handshake size={25}/></div>
          <div><strong>TitleConnect</strong><small>BUSINESS DEVELOPMENT</small></div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X/></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        {nav.map(item => {
          const Icon = item.icon;
          return <button key={item.name}
            className={`nav-item ${page === item.name ? 'selected' : ''}`}
            onClick={() => {setPage(item.name); setMobileOpen(false);}}>
            <Icon size={19}/><span>{item.name}</span>
          </button>;
        })}
        <div className="sidebar-bottom">
          <div className="profile-icon">TT</div>
          <div><strong>Texas Title</strong><small>Granbury, Texas</small></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu/></button>
          <div className="breadcrumb">Workspace <span>/</span> {page}</div>
          <div className="top-actions"><span className="date">Business Development</span><Bell size={19}/><div className="avatar">S</div></div>
        </header>

        <div className="content">
          {page === 'Resource Center' && <>
            <PageHeading title="Texas Title Resource Center" subtitle="Your everyday business-development tools in one place."/>

            <section className="panel">
              <h2>Property & Agent Intelligence</h2>
              <div className="dashboard-grid">
                <a href="https://www.mymta.com/" target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="recent-icon"><Globe size={22}/></div>
                  <h3>MTA GO / MyMTA</h3>
                  <p>Agent productivity, prospecting, production and market research.</p>
                  <strong>Open MTA GO ↗</strong>
                </a>
                <a href="https://www.texas-fetch.com/texastitle" target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="recent-icon"><Search size={22}/></div>
                  <h3>Texas Fetch</h3>
                  <p>Your Texas Title property search and research portal.</p>
                  <strong>Open Fetch ↗</strong>
                </a>
                <a href="https://app.razicrm.com/v2/location/ycibME2I5mRafXbeJmNk/opportunities" target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="recent-icon"><Users size={22}/></div>
                  <h3>Razi</h3>
                  <p>Lead generation, title prospecting and relationship tools.</p>
                  <strong>Open Razi ↗</strong>
                </a>
              </div>
            </section>

            <section className="panel">
              <h2>Texas Title Closing Tools</h2>
              <div className="dashboard-grid">
                <a href="https://texastitleapp.com/" target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="recent-icon"><House size={22}/></div>
                  <h3>Texas Title Closings</h3>
                  <p>Open your existing closing platform.</p>
                  <strong>Open Closing App ↗</strong>
                </a>
                <a href="https://texastitle.com/ready2close/" target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="recent-icon"><CheckCircle2 size={22}/></div>
                  <h3>Ready2Close</h3>
                  <p>Transaction progress, milestone updates and secure document workflows.</p>
                  <strong>Open Ready2Close ↗</strong>
                </a>
              </div>
            </section>

            <section className="panel">
              <h2>Integration Roadmap</h2>
              <p className="muted">These shortcuts open your existing tools. Direct data synchronization is a separate step requiring approved access from each provider.</p>
              <div className="priority"><CheckCircle2/><span>Portal shortcuts added to TitleConnect</span><span className="pill">Available</span></div>
              <div className="priority"><Clock/><span>Excel workbook import and export</span><span className="priority-time">Next</span></div>
              <div className="priority"><Clock/><span>Outlook email and calendar integration</span><span className="priority-time">Planned</span></div>
              <div className="priority"><Clock/><span>MTA, Razi and Fetch data integrations</span><span className="priority-time">Vendor access needed</span></div>
            </section>
          </>}

          {page === 'Import Center' && <ImportCenter />}
          {page === 'Dashboard' && <>
            <div className="welcome">
              <div><div className="eyebrow">YOUR BUSINESS DEVELOPMENT HUB</div><h1>Good morning!</h1><p>Build relationships. Create opportunities. Grow your business.</p></div>
              <button className="primary" onClick={() => setPage('Activity Log')}><Plus size={17}/> Log Activity</button>
            </div>
            <div className="stats">
              <Stat icon={<Users/>} label="Total Agents" value={agents.length.toString()} note="In your CRM"/>
              <Stat icon={<House/>} label="Active Closings" value={closings.filter(c => c.status !== "closed" && c.status !== "cancelled").length.toString()} note="Still in progress"/>
              <Stat icon={<ClipboardList/>} label="Activities Logged" value={activities.length.toString()} note="Recorded interactions"/>
              <Stat icon={<CalendarCheck/>} label="Events" value={events.length.toString()} note="Events tracked"/>
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div><h2>Tasks & Follow-ups</h2><p>Your open tasks, sorted by due date</p></div>
                  <button className="text-button" onClick={() => setPage('Tasks')}>View all <ArrowUpRight size={14}/></button>
                </div>
                {tasks
                  .filter(t => !t.completed)
                  .sort((a, b) => {
                    const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                    const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                    return aDate - bDate;
                  })
                  .slice(0, 5)
                  .map(t => {
                    const dueDate = t.due_date ? new Date(t.due_date) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime() : null;
                    const dueLabel = !dueDate ? 'No due date' : dueDay! < today.getTime() ? 'OVERDUE' : dueDate.toDateString() === new Date().toDateString() ? 'DUE TODAY' : `Due ${dueDate.toLocaleDateString()}`;
                    return <div className="recent" key={t.id}>
                      <input type="checkbox" aria-label={`Mark ${t.title} complete`} checked={!!t.completed} onChange={() => toggleTask(t)}/>
                      <div>
                        <strong>{t.title}</strong>
                        <p>{t.description || ''}</p>
                        <small>{dueLabel} · {t.priority || 'normal'} priority</small>
                      </div>
                    </div>;
                  })}
                {tasks.filter(t => !t.completed).length === 0 && <p className="muted">You're all caught up! Add a task to keep your follow-ups on track.</p>}
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Recent Activity</h2><p>Your latest interactions</p></div><button className="text-button" onClick={()=>setPage('Activity Log')}>View all <ArrowUpRight size={14}/></button></div>
                {activities.slice(0,4).map((a,i)=><div className="recent" key={a.id || i}><div className="recent-icon"><MessageSquare size={17}/></div><span>{a.description}</span></div>)}
              </section>
            </div>
            <section className="panel">
              <div className="panel-heading">
                <div><h2>Upcoming Closings</h2><p>Active transactions sorted by expected closing date</p></div>
                <button className="text-button" onClick={() => setPage('Closing Tracker')}>View all <ArrowUpRight size={14}/></button>
              </div>
              {closings
                .filter(c => c.status !== 'closed' && c.status !== 'cancelled' && c.estimated_close_date)
                .sort((a, b) => new Date(a.estimated_close_date + 'T12:00:00').getTime() - new Date(b.estimated_close_date + 'T12:00:00').getTime())
                .slice(0, 5)
                .map(c => {
                  const closeDate = new Date(c.estimated_close_date + 'T12:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const pastDue = closeDate < today;
                  return <div className="closing-card" key={c.id}>
                    <div className="closing-icon"><Building2/></div>
                    <div className="closing-info">
                      <strong>{c.property_address || 'Address not entered'}</strong>
                      <p>{[c.city, c.county ? c.county + ' County' : ''].filter(Boolean).join(' · ')}</p>
                      <p>Buyer: {agents.find(a => a.id === c.buyer_agent_id)?.name || 'Not assigned'} · Listing: {agents.find(a => a.id === c.listing_agent_id)?.name || 'Not assigned'}</p>
                      <p>{pastDue ? 'PAST DUE' : 'Expected close'}: {closeDate.toLocaleDateString()} · {(c.status || 'open').replace(/_/g, ' ')}</p>
                    </div>
                  </div>;
                })}
              {closings.filter(c => c.status !== 'closed' && c.status !== 'cancelled' && c.estimated_close_date).length === 0 &&
                <p className="muted">No active closings with an expected closing date yet.</p>}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h2>Upcoming Events</h2><p>Your next networking and business development events</p></div>
                <button className="text-button" onClick={() => setPage('Events & Sponsorships')}>View all <ArrowUpRight size={14}/></button>
              </div>
              {events
                .filter(e => e.event_date && new Date(e.event_date).getTime() >= Date.now() && !['completed', 'cancelled'].includes(e.status))
                .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                .slice(0, 4)
                .map(e => {
                  const attendeeCount = eventAttendees.filter(x => x.event_id === e.id).length;
                  const sponsorCount = eventSponsors.filter(x => x.event_id === e.id).length;
                  return <div className="recent" key={e.id}>
                    <div className="recent-icon"><CalendarDays size={17}/></div>
                    <div>
                      <strong>{e.name}</strong>
                      <p>{e.event_type || 'Event'} · {e.location || 'Location TBD'}</p>
                      <small>{new Date(e.event_date).toLocaleString()} · {attendeeCount} attendees · {sponsorCount} sponsors</small>
                    </div>
                  </div>;
                })}
              {events.filter(e => e.event_date && new Date(e.event_date).getTime() >= Date.now() && !['completed', 'cancelled'].includes(e.status)).length === 0 &&
                <p className="muted">No upcoming events scheduled yet.</p>}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h2>Follow-Up Opportunities</h2><p>Agents who need your attention</p></div>
                <button className="text-button" onClick={() => setPage('Agent CRM')}>View agents <ArrowUpRight size={14}/></button>
              </div>
              {agents
                .map(agent => ({
                  agent,
                  lastActivity: activities
                    .filter(a => a.agent_id === agent.id)
                    .sort((a, b) => new Date(b.activity_date || 0).getTime() - new Date(a.activity_date || 0).getTime())[0]
                }))
                .sort((a, b) => {
                  if (!a.lastActivity && b.lastActivity) return -1;
                  if (a.lastActivity && !b.lastActivity) return 1;
                  return new Date(a.lastActivity?.activity_date || 0).getTime() - new Date(b.lastActivity?.activity_date || 0).getTime();
                })
                .slice(0, 5)
                .map(({agent, lastActivity}) => (
                  <div className="recent" key={agent.id}>
                    <div className="recent-icon"><Users size={17}/></div>
                    <div>
                      <button className="text-button" onClick={() => {setSelectedAgent(agent); setPage('Agent CRM');}}>
                        <strong>{agent.name}</strong>
                      </button>
                      <p>{agent.brokerage || 'Brokerage not listed'} · {agent.phone || 'No phone listed'}</p>
                      <small>{lastActivity ? `Last contact: ${new Date(lastActivity.activity_date).toLocaleDateString()} · ${lastActivity.activity_type || 'Interaction'}` : 'Never contacted'}</small>
                    </div>
                  </div>
                ))}
              {agents.length === 0 && <p className="muted">No agents available yet.</p>}
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h2>Agent Relationships</h2><p>Recently added and active contacts</p></div><button className="text-button" onClick={()=>setPage('Agent CRM')}>View agents <ArrowUpRight size={14}/></button></div>
              <AgentTable agents={agents.slice(0,4)} onSelect={agent => { setSelectedAgent(agent); setPage('Agent CRM'); }}/>
            </section>
          </>}

          {page === 'Agent CRM' && <>
            <PageHeading title="Agent CRM" subtitle="Your contacts, relationships, and complete interaction history." action={<button className="primary" onClick={()=>setShowForm(!showForm)}><Plus size={17}/> Add Agent</button>}/>
            {showForm && <section className="panel form-panel"><h2>Add a New Agent</h2><div className="form-grid">
              <Field label="Full Name" value={agentName} set={setAgentName} placeholder="Agent name"/>
              <Field label="Brokerage" value={brokerage} set={setBrokerage} placeholder="Company"/>
              <Field label="Email" value={email} set={setEmail} placeholder="Email address"/>
              <PhoneField label="Phone" value={phone} set={setPhone}/>
              <PhoneField label="Office Phone" value={officePhone} set={setOfficePhone}/>
              <Field label="License Number" value={licenseNumber} set={setLicenseNumber} placeholder="License number"/>
              <label>Birthday<input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)}/></label>
              <label className="full-width">Notes<textarea value={agentNotes} onChange={e=>setAgentNotes(e.target.value)} placeholder="Additional agent details..."/></label>
            </div><div className="form-actions"><button className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary" onClick={addAgent}>Save Agent</button></div></section>}
            {selectedAgent && <section className="panel">
              <div className="panel-heading">
                <div><h2>{selectedAgent.name}</h2><p>Agent Profile</p></div>
                <div className="form-actions">
                  {!editingAgent && <button className="primary" onClick={() => setEditingAgent(true)}>Edit Agent</button>}
                  <button className="secondary" onClick={() => {setSelectedAgent(null); setEditingAgent(false);}}>Close Profile</button>
                </div>
              </div>
              {editingAgent ? <div className="form-grid">
                <Field label="Full Name" value={selectedAgent.name} set={v=>setSelectedAgent({...selectedAgent,name:v})} placeholder="Full name"/>
                <Field label="Brokerage" value={selectedAgent.brokerage} set={v=>setSelectedAgent({...selectedAgent,brokerage:v})} placeholder="Brokerage"/>
                <Field label="Email" value={selectedAgent.email} set={v=>setSelectedAgent({...selectedAgent,email:v})} placeholder="Email"/>
                <PhoneField label="Phone" value={selectedAgent.phone} set={v=>setSelectedAgent({...selectedAgent,phone:v})}/>
                <PhoneField label="Office Phone" value={selectedAgent.office_phone || ''} set={v=>setSelectedAgent({...selectedAgent,office_phone:v})}/>
                <Field label="License Number" value={selectedAgent.license_number || ''} set={v=>setSelectedAgent({...selectedAgent,license_number:v})} placeholder="License number"/>
                <label>Birthday<input type="date" value={selectedAgent.birthday || ''} onChange={e=>setSelectedAgent({...selectedAgent,birthday:e.target.value})}/></label>
                <label>Notes<textarea value={selectedAgent.notes || ''} onChange={e=>setSelectedAgent({...selectedAgent,notes:e.target.value})}/></label>
                <div className="form-actions">
                  <button className="secondary" onClick={()=>setEditingAgent(false)}>Cancel</button>
                  <button className="primary" onClick={saveAgentChanges}>Save Changes</button>
                </div>
              </div> : <div className="form-grid">
                <div><strong>Brokerage</strong><p>{selectedAgent.brokerage || '—'}</p></div>
                <div><strong>Email</strong><p>{selectedAgent.email || '—'}</p></div>
                <div><strong>Phone</strong><p>{selectedAgent.phone || '—'}</p></div>
                <div><strong>Office Phone</strong><p>{selectedAgent.office_phone || '—'}</p></div>
                <div><strong>License Number</strong><p>{selectedAgent.license_number || '—'}</p></div>
                <div><strong>Birthday</strong><p>{selectedAgent.birthday || '—'}</p></div>
                <div><strong>Notes</strong><p>{selectedAgent.notes || '—'}</p></div>
              </div>}
              <div className="panel" style={{marginTop: '20px'}}>
                <h2>Log an Interaction</h2>
                <div className="form-grid">
                  <label>Interaction Type
                    <select value={interactionType} onChange={e=>setInteractionType(e.target.value)}>
                      {['Phone Call','Email','Text Message','Coffee','Lunch','Office Visit','Meeting','Event','Other'].map(x=><option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label>Date
                    <input type="date" value={interactionDate} onChange={e=>setInteractionDate(e.target.value)}/>
                  </label>
                  <label className="full-width">Notes
                    <textarea value={interactionDescription} onChange={e=>setInteractionDescription(e.target.value)} placeholder="What did you discuss? What is the next step?"/>
                  </label>
                </div>
                <button className="primary" onClick={addAgentActivity}><Plus size={17}/> Save Interaction</button>
                <h2 style={{marginTop:'24px'}}>Interaction History</h2>
                {agentActivities.length === 0 ? <p className="muted">No interactions recorded yet.</p> :
                  agentActivities.map(item=><div className="recent" key={item.id}>
                    <div className="recent-icon"><MessageSquare size={17}/></div>
                    <div><strong>{item.activity_type}</strong><p>{item.description}</p><small>{new Date(item.activity_date).toLocaleDateString()}</small></div>
                  </div>)
                }
              </div>
            </section>}
            <section className="panel"><div className="search-box"><Search size={18}/><input placeholder="Search agents or brokerages..." value={search} onChange={e=>setSearch(e.target.value)}/></div><AgentTable agents={filteredAgents} onSelect={setSelectedAgent}/></section>
          </>}

          {page === 'Client CRM' && <>
            <PageHeading title="Client CRM" subtitle="Manage your client relationships and contact information." action={<button className="primary" onClick={() => setShowClientForm(!showClientForm)}><Plus size={17}/> Add Client</button>}/>
            {showClientForm && <section className="panel form-panel">
              <h2>New Client</h2>
              <div className="form-grid">
                <Field label="Full Name" value={clientName} set={setClientName} placeholder="Client name"/>
                <Field label="Email" value={clientEmail} set={setClientEmail} placeholder="Email address"/>
                <label>Phone<input value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Phone number"/></label>
                <label>Client Type<select value={clientType} onChange={e=>setClientType(e.target.value)}><option>Buyer</option><option>Seller</option><option>Investor</option><option>Other</option></select></label>
                <label style={{gridColumn:'1 / -1'}}>Notes<textarea value={clientNotes} onChange={e=>setClientNotes(e.target.value)} placeholder="Additional notes"/></label>
              </div>
              <button className="primary" onClick={addClient}><Plus size={17}/> Save Client</button>
            </section>}
            <section className="panel">
              <div className="search-box"><Search size={18}/><input placeholder="Search clients..." value={clientSearch} onChange={e=>setClientSearch(e.target.value)}/></div>
              {selectedClient ? <div>
                <button className="text-button" onClick={()=>setSelectedClient(null)}>← Back to Clients</button>
                <h2>{selectedClient.name}</h2>
                <p>{selectedClient.client_type || 'Client'}</p>
                <p>{selectedClient.email || 'No email provided'}</p>
                <p>{selectedClient.phone || 'No phone provided'}</p>
                <p>{selectedClient.notes || 'No notes'}</p>
                <div style={{marginTop:'24px'}}>
                  <h2>Log an Interaction</h2>
                  <div className="form-grid">
                    <label>Type<select value={clientInteractionType} onChange={e=>setClientInteractionType(e.target.value)}>{['Phone Call','Email','Text Message','Coffee','Lunch','Office Visit','Meeting','Event','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
                    <label>Date<input type="date" value={clientInteractionDate} onChange={e=>setClientInteractionDate(e.target.value)}/></label>
                    <label style={{gridColumn:'1 / -1'}}>Notes<textarea value={clientInteractionDescription} onChange={e=>setClientInteractionDescription(e.target.value)} placeholder="What did you discuss?"/></label>
                  </div>
                  <button className="primary" onClick={addClientActivity}><Plus size={17}/> Save Interaction</button>
                  <h2 style={{marginTop:'24px'}}>Interaction History</h2>
                  {clientActivities.length === 0 ? <p className="muted">No interactions recorded yet.</p> :
                    clientActivities.map(item=><div className="recent" key={item.id}>
                      <div className="recent-icon"><MessageSquare size={17}/></div>
                      <div><strong>{item.activity_type}</strong><p>{item.description}</p><small>{new Date(item.activity_date).toLocaleDateString()}</small></div>
                    </div>)
                  }
                </div>
              </div> : clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase())).map(c=>
                <div className="recent" key={c.id}>
                  <div className="recent-icon"><Users size={17}/></div>
                  <div><button className="text-button" onClick={()=>setSelectedClient(c)}><strong>{c.name}</strong></button><p>{c.client_type} · {c.email || 'No email'}</p></div>
                  <span className="priority-time">{c.phone}</span>
                </div>
              )}
              {clients.length === 0 && <p className="muted">No clients added yet. Select Add Client to get started.</p>}
            </section>
          </>}

          {page === 'Message Center' && <>
            <PageHeading title="Message Center" subtitle="Personalized outreach for every relationship milestone."/>
            <section className="panel message-panel">
              <h2>Choose a message template</h2>
              <p className="muted">Select a situation to generate a ready-to-personalize message.</p>
              <div className="template-list">{Object.keys(templates).map(t=><button className={`template-choice ${template===t?'active':''}`} key={t} onClick={()=>{setTemplate(t);setCopied(false)}}>{t}</button>)}</div>
              <div className="message-preview"><div className="preview-heading"><strong>{template}</strong><span className="pill">Editable template</span></div><textarea key={template} defaultValue={templates[template]} id="message-text"/></div>
              <button className="primary" onClick={()=>{navigator.clipboard?.writeText((document.getElementById('message-text') as HTMLTextAreaElement)?.value || templates[template]);setCopied(true)}}><Copy size={17}/>{copied?'Copied!':'Copy Message'}</button>
              <p className="muted small">Review and personalize every message before sending.</p>
            </section>
          </>}

          {page === 'Closing Tracker' && <>
            <PageHeading title="Closing Tracker" subtitle="Track transactions, important dates, and the people involved." action={<button className="primary" onClick={() => setShowClosingForm(!showClosingForm)}><Plus size={17}/> Add Closing</button>}/>

            <div className="stats">
              <Stat icon={<House/>} label="Total Closings" value={closings.length.toString()} note="Saved transactions"/>
              <Stat icon={<Clock/>} label="Open Closings" value={closings.filter(c => c.status !== 'closed' && c.status !== 'cancelled').length.toString()} note="Still in progress"/>
              <Stat icon={<CheckCircle2/>} label="Closed" value={closings.filter(c => c.status === 'closed').length.toString()} note="Completed transactions"/>
            </div>

            {showClosingForm && <section className="panel form-panel">
              <h2>New Closing</h2>
              <div className="form-grid">
                <Field label="Property Address" value={closingAddress} set={setClosingAddress} placeholder="Street address"/>
                <Field label="City" value={closingCity} set={setClosingCity} placeholder="City"/>
                <Field label="County" value={closingCounty} set={setClosingCounty} placeholder="County"/>
                <Field label="GF Number" value={closingGF} set={setClosingGF} placeholder="GF number"/>
                <label>Client<select value={closingClient} onChange={e=>setClosingClient(e.target.value)}><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Buyer Agent<select value={buyerAgent} onChange={e=>setBuyerAgent(e.target.value)}><option value="">Select buyer agent</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                <label>Listing Agent<select value={listingAgent} onChange={e=>setListingAgent(e.target.value)}><option value="">Select listing agent</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                <Field label="Escrow Officer" value={escrowOfficer} set={setEscrowOfficer} placeholder="Escrow officer"/>
                <label>Contract Date<input type="date" value={contractDate} onChange={e=>setContractDate(e.target.value)}/></label>
                <label>Estimated Closing Date<input type="date" value={estimatedCloseDate} onChange={e=>setEstimatedCloseDate(e.target.value)}/></label>
                <label>Actual Closing Date<input type="date" value={actualCloseDate} onChange={e=>setActualCloseDate(e.target.value)}/></label>
                <label>Sale Price ($)<input type="number" min="0" step="0.01" value={salePrice} onChange={e=>setSalePrice(e.target.value)} placeholder="0.00"/></label>
                <label>Loan Amount ($)<input type="number" min="0" step="0.01" value={loanAmount} onChange={e=>setLoanAmount(e.target.value)} placeholder="0.00"/></label>
                <label style={{gridColumn:'1 / -1'}}>Notes<textarea value={closingNotes} onChange={e=>setClosingNotes(e.target.value)} placeholder="Transaction notes..."/></label>
              </div>
              <div className="form-actions">
                <button className="secondary" onClick={()=>setShowClosingForm(false)}>Cancel</button>
                <button className="primary" onClick={addClosing}><Plus size={17}/> Save Closing</button>
              </div>
            </section>}

            <section className="panel">
              <h2>Transactions</h2>
              {closings.length === 0 ? <p className="muted">No closings yet. Select Add Closing to record your first transaction.</p> :
                closings.map(c => <div className="closing-card" key={c.id}>
                  <div className="closing-icon"><Building2/></div>
                  <div className="closing-info">
                    <strong>{c.property_address}</strong>
                    <p>{[c.city, c.county ? c.county + ' County' : ''].filter(Boolean).join(' · ')}</p>
                    <p>Buyer: {agents.find(a=>a.id===c.buyer_agent_id)?.name || 'Not assigned'} · Listing: {agents.find(a=>a.id===c.listing_agent_id)?.name || 'Not assigned'}</p>
                    <p>Client: {clients.find(x=>x.id===c.client_id)?.name || 'Not assigned'}</p>
                    <p>{c.estimated_close_date ? 'Expected close: ' + new Date(c.estimated_close_date + 'T12:00:00').toLocaleDateString() : 'No closing date set'}{c.gf_number ? ' · GF# ' + c.gf_number : ''}</p>
                  </div>
                  <select aria-label="Closing status" value={c.status || 'open'} onChange={e=>updateClosingStatus(c.id,e.target.value)}>
                    <option value="open">Open</option>
                    <option value="under_contract">Under Contract</option>
                    <option value="closing_scheduled">Closing Scheduled</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>)
              }
            </section>
          </>}

          {page === 'Sponsors' && <>
            <PageHeading title="Sponsors & Vendors" subtitle="Manage vendor relationships and event sponsors." action={<button className="primary" onClick={()=>setShowSponsorForm(!showSponsorForm)}><Plus size={17}/> Add Sponsor</button>}/>
            {showSponsorForm && <section className="panel form-panel">
              <h2>New Sponsor</h2>
              <div className="form-grid">
                <Field label="Sponsor Name" value={sponsorName} set={setSponsorName} placeholder="Contact name"/>
                <Field label="Company" value={sponsorCompany} set={setSponsorCompany} placeholder="Company name"/>
                <label>Category<select value={sponsorType} onChange={e=>setSponsorType(e.target.value)}>{['Vendor','Lender','Mortgage','Insurance','Home Services','Marketing','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
                <Field label="Email" value={sponsorEmail} set={setSponsorEmail} placeholder="Email"/>
                <Field label="Phone" value={sponsorPhone} set={setSponsorPhone} placeholder="Phone"/>
                <Field label="Address" value={sponsorAddress} set={setSponsorAddress} placeholder="Business address"/>
                <label style={{gridColumn:'1 / -1'}}>Notes<textarea value={sponsorNotes} onChange={e=>setSponsorNotes(e.target.value)} placeholder="Relationship notes"/></label>
              </div>
              <button className="primary" onClick={addSponsor}><Plus size={17}/> Save Sponsor</button>
            </section>}
            <section className="panel"><h2>Sponsor Directory</h2>
              {sponsors.map(x=><div className="recent" key={x.id}><div className="recent-icon"><Handshake size={17}/></div><div><strong>{x.name}</strong><p>{x.company || x.sponsor_type || 'Sponsor'} · {x.email || 'No email'} · {x.phone || 'No phone'}</p></div></div>)}
              {sponsors.length===0&&<p className="muted">No sponsors added yet.</p>}
            </section>
          </>}

          {page === 'Activity Log' && <>
            <PageHeading title="Activity Log" subtitle="A permanent history of calls, emails, meetings, and business-development activity."/>
            <section className="panel form-panel">
              <h2>Record an Interaction</h2>
              <div className="form-grid">
                <label>Activity Type<select value={activityType} onChange={e=>setActivityType(e.target.value)}>{['Phone Call','Email','Text Message','Coffee','Lunch','Office Visit','Meeting','Event','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
                <label>Related To<select value={activityContactType} onChange={e=>{setActivityContactType(e.target.value);setActivityContactId('');}}><option value="agent">Agent</option><option value="client">Client</option><option value="sponsor">Sponsor</option><option value="closing">Closing</option><option value="event">Event</option></select></label>
                <label style={{gridColumn:'1 / -1'}}>Record<select value={activityContactId} onChange={e=>setActivityContactId(e.target.value)}><option value="">No linked record</option>
                  {activityContactType==='agent' && agents.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {activityContactType==='client' && clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {activityContactType==='sponsor' && sponsors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {activityContactType==='closing' && closings.map(x=><option key={x.id} value={x.id}>{x.property_address}</option>)}
                  {activityContactType==='event' && events.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                </select></label>
                <label style={{gridColumn:'1 / -1'}}>Interaction Notes<textarea value={activityDescription} onChange={e=>setActivityDescription(e.target.value)} placeholder="What happened? What needs follow-up?"/></label>
              </div>
              <button className="primary" onClick={addActivity}><Plus size={17}/> Save Activity</button>
            </section>
            <section className="panel"><h2>Interaction History</h2>{activities.map((a,i)=><div className="recent" key={a.id || i}><div className="recent-icon"><ClipboardList size={17}/></div><div><strong>{a.activity_type}</strong><p>{a.description}</p><small>{a.activity_date ? new Date(a.activity_date).toLocaleString() : ''}</small></div></div>)}{activities.length===0&&<p className="muted">No activities recorded yet.</p>}</section>
          </>}

          {page === 'Tasks' && <>
            <PageHeading title="Tasks & Follow-ups" subtitle="Keep every relationship and transaction moving."/>
            <section className="panel form-panel">
              <h2>Create Task</h2>
              <div className="form-grid">
                <Field label="Task" value={taskTitle} set={setTaskTitle} placeholder="What needs to be done?"/>
                <label>Due Date<input type="date" value={taskDueDate} onChange={e=>setTaskDueDate(e.target.value)}/></label>
                <label>Priority<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                <label>Link To<select value={taskLinkType} onChange={e=>{setTaskLinkType(e.target.value);setTaskLinkId('');}}><option value="none">No linked record</option><option value="agent">Agent</option><option value="client">Client</option><option value="sponsor">Sponsor</option><option value="closing">Closing</option><option value="event">Event</option></select></label>
                {taskLinkType!=='none' && <label>Related Record<select value={taskLinkId} onChange={e=>setTaskLinkId(e.target.value)}><option value="">Select record</option>
                  {taskLinkType==='agent' && agents.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {taskLinkType==='client' && clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {taskLinkType==='sponsor' && sponsors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                  {taskLinkType==='closing' && closings.map(x=><option key={x.id} value={x.id}>{x.property_address}</option>)}
                  {taskLinkType==='event' && events.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                </select></label>}
                <label style={{gridColumn:'1 / -1'}}>Description<textarea value={taskDescription} onChange={e=>setTaskDescription(e.target.value)} placeholder="Details or next steps"/></label>
              </div>
              <button className="primary" onClick={addTask}><Plus size={17}/> Save Task</button>
            </section>
            <section className="panel"><h2>Open & Completed Tasks</h2>
              {tasks.map(t=><div className="recent" key={t.id}><input type="checkbox" checked={!!t.completed} onChange={()=>toggleTask(t)}/><div><strong style={{textDecoration:t.completed?'line-through':'none'}}>{t.title}</strong><p>{t.description || ''}</p><small>{t.due_date ? 'Due ' + new Date(t.due_date).toLocaleDateString() : 'No due date'} · {t.priority || 'normal'} priority</small></div></div>)}
              {tasks.length===0&&<p className="muted">No tasks yet. Add your first follow-up above.</p>}
            </section>
          </>}

          {page === 'Events & Sponsorships' && <>
            <PageHeading title="Events & Sponsorships" subtitle="Plan events, budgets, sponsors, and attendance."/>
            <section className="panel form-panel">
              <h2>Create Event</h2>
              <div className="form-grid">
                <Field label="Event Name" value={eventName} set={setEventName} placeholder="Event name"/>
                <label>Event Type<select value={eventType} onChange={e=>setEventType(e.target.value)}>{['Networking','CE Class','Lunch & Learn','Agent Appreciation','Fundraiser','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
                <label>Date & Time<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)}/></label>
                <Field label="Location" value={eventLocation} set={setEventLocation} placeholder="Event location"/>
                <label>Budget ($)<input type="number" min="0" step="0.01" value={eventBudget} onChange={e=>setEventBudget(e.target.value)} placeholder="0.00"/></label>
                <label style={{gridColumn:'1 / -1'}}>Description<textarea value={eventDescription} onChange={e=>setEventDescription(e.target.value)} placeholder="Event details"/></label>
              </div>
              <button className="primary" onClick={addEvent}><Plus size={17}/> Save Event</button>
            </section>
            <section className="panel"><h2>Events & Sponsorship History</h2>
              {events.map(e=><div className="panel" key={e.id} style={{marginTop:'14px'}}>
                <div className="panel-heading"><div><h2>{e.name}</h2><p>{e.event_type || 'Event'} · {e.location || 'Location TBD'} · {e.event_date ? new Date(e.event_date).toLocaleString() : 'Date TBD'}</p></div>
                  <select value={e.status || 'planned'} onChange={ev=>updateEventStatus(e.id,ev.target.value)}><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                </div>
                <p>{e.description || ''}</p>
                <p className="muted">Budget: {e.budget != null ? '$'+Number(e.budget).toLocaleString() : 'Not set'} · Actual cost: {e.actual_cost != null ? '$'+Number(e.actual_cost).toLocaleString() : 'Not recorded'}</p>
                <h3>Sponsors</h3>
                <div className="form-grid">
                  <label>Sponsor<select value={eventSponsorId} onChange={ev=>setEventSponsorId(ev.target.value)}><option value="">Select sponsor</option>{sponsors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                  <label>Contribution ($)<input type="number" min="0" step="0.01" value={eventContribution} onChange={ev=>setEventContribution(ev.target.value)}/></label>
                  <button className="secondary" onClick={()=>addEventSponsor(e.id)}>Add Sponsor</button>
                </div>
                {eventSponsors.filter(x=>x.event_id===e.id).map(x=><p key={x.id}>{sponsors.find(sp=>sp.id===x.sponsor_id)?.name || 'Sponsor'} · {x.contribution != null ? '$'+Number(x.contribution).toLocaleString() : 'Contribution not entered'}</p>)}
                <h3>Attendees</h3>
                <div className="form-grid">
                  <label>Attendee Type<select value={eventAttendeeType} onChange={ev=>{setEventAttendeeType(ev.target.value);setEventAttendeeId('');}}><option value="agent">Agent</option><option value="client">Client</option></select></label>
                  <label>Attendee<select value={eventAttendeeId} onChange={ev=>setEventAttendeeId(ev.target.value)}><option value="">Select attendee</option>{eventAttendeeType==='agent' ? agents.map(x=><option key={x.id} value={x.id}>{x.name}</option>) : clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                  <button className="secondary" onClick={()=>addEventAttendee(e.id)}>Add Attendee</button>
                </div>
                {eventAttendees.filter(x=>x.event_id===e.id).map(x=><p key={x.id}>{x.agent_id ? agents.find(a=>a.id===x.agent_id)?.name : clients.find(c=>c.id===x.client_id)?.name} · {x.attended ? 'Attended' : 'Registered'}</p>)}
              </div>)}
              {events.length===0&&<p className="muted">No events added yet.</p>}
            </section>
          </>}
        </div>
      </main>
    </div>
  );
}

function Stat({icon,label,value,note}: {icon:React.ReactNode,label:string,value:string,note:string}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><strong>{value}</strong><small>{note}</small></div>;
}
function PageHeading({title,subtitle,action}: {title:string,subtitle:string,action?:React.ReactNode}) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function PhoneField({label,value,set}: {label:string,value:string,set:(v:string)=>void}) {
  return <label>{label}<input type="tel" inputMode="numeric" maxLength={12}
    value={formatPhone(value)}
    onChange={e=>set(formatPhone(e.target.value))}
    placeholder="000-000-0000"
  /></label>;
}

function Field({label,value,set,placeholder}: {label:string,value:string,set:(v:string)=>void,placeholder:string}) {
  return <label>{label}<input value={value} onChange={e=>set(e.target.value)} placeholder={placeholder}/></label>;
}
function AgentTable({agents, onSelect}: {agents:Agent[], onSelect:(agent:Agent)=>void}) {
  return <div className="table-wrap"><table><thead><tr><th>AGENT</th><th>BROKERAGE</th><th>PHONE</th><th>EMAIL</th><th>STATUS</th></tr></thead><tbody>{agents.map(a=><tr key={a.id}><td><button className="text-button" onClick={() => onSelect(a)}><strong>{a.name}</strong></button></td><td>{a.brokerage}</td><td>{formatPhone(a.phone || "")}</td><td>{a.email}</td><td><span className={`status ${a.status==='New'?'new':''}`}>{a.status}</span></td></tr>)}</tbody></table>{agents.length===0&&<p className="muted">No agents found.</p>}</div>;
}
