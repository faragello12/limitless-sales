const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database...');

// Clear existing data
db.exec(`
  DELETE FROM activities;
  DELETE FROM todos;
  DELETE FROM meetings;
  DELETE FROM calls;
  DELETE FROM client_briefs;
  DELETE FROM clients;
  DELETE FROM users;
  DELETE FROM sqlite_sequence WHERE name IN ('users','clients','client_briefs','calls','meetings','todos','activities');
`);

// Hash passwords
const adminPlain = process.env.ADMIN_PASSWORD || 'Limitless@Admin2026!';
const salesPlain = process.env.SALES_PASSWORD || 'Sales@2026$';
const adminPass = bcrypt.hashSync(adminPlain, 10);
const salesPass = bcrypt.hashSync(salesPlain, 10);

// Insert users
const users = [
  { username: 'admin', password: adminPass, full_name: 'Ahmed Hassan', email: 'ahmed@limitless.com', phone: '+201234567890', role: 'admin', avatar_color: '#ef4444' },
  { username: 'sara', password: salesPass, full_name: 'Sara Mohamed', email: 'sara@limitless.com', phone: '+201111222333', role: 'sales', avatar_color: '#10b981' },
  { username: 'omar', password: salesPass, full_name: 'Omar Ali', email: 'omar@limitless.com', phone: '+201222333444', role: 'sales', avatar_color: '#3b82f6' },
  { username: 'lina', password: salesPass, full_name: 'Lina Khaled', email: 'lina@limitless.com', phone: '+201333444555', role: 'sales', avatar_color: '#8b5cf6' },
  { username: 'mahmoud', password: salesPass, full_name: 'Mahmoud Said', email: 'mahmoud@limitless.com', phone: '+201444555666', role: 'sales', avatar_color: '#f59e0b' }
];

const insertUser = db.prepare(`INSERT INTO users (username, password, full_name, email, phone, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?)`);
users.forEach(u => insertUser.run(u.username, u.password, u.full_name, u.email, u.phone, u.role, u.avatar_color));
console.log('✅ Users created');

// Insert clients
const clients = [
  { name: 'Mohamed El-Sayed', company: 'TechVenture Egypt', email: 'mohamed@techventure.eg', phone: '+201090001001', industry: 'Technology', status: 'active', source: 'LinkedIn', assigned_to: 2, estimated_value: 150000, notes: 'Long-term contract potential' },
  { name: 'Fatma Adel', company: 'Nile Fashion', email: 'fatma@nilefashion.com', phone: '+201090002002', industry: 'Fashion', status: 'prospect', source: 'Referral', assigned_to: 2, estimated_value: 85000, notes: 'Interested in social media campaign' },
  { name: 'Karim Nabil', company: 'Cairo Bites', email: 'karim@cairobites.com', phone: '+201090003003', industry: 'Food & Beverage', status: 'lead', source: 'Website', assigned_to: 3, estimated_value: 45000, notes: 'New lead from contact form' },
  { name: 'Nour Hassan', company: 'GreenLife Organic', email: 'nour@greenlife.eg', phone: '+201090004004', industry: 'Health', status: 'active', source: 'Cold Call', assigned_to: 3, estimated_value: 120000, notes: 'Premium client, monthly retainer' },
  { name: 'Hany Mostafa', company: 'AutoDrive Motors', email: 'hany@autodrive.com', phone: '+201090005005', industry: 'Automotive', status: 'prospect', source: 'Event', assigned_to: 4, estimated_value: 200000, notes: 'Big budget, decision pending' },
  { name: 'Yara Ibrahim', company: 'EduTech Plus', email: 'yara@edutechplus.com', phone: '+201090006006', industry: 'Education', status: 'lead', source: 'Facebook Ads', assigned_to: 4, estimated_value: 60000, notes: 'Looking for video production' },
  { name: 'Tamer Farouk', company: 'Sunrise Hotels', email: 'tamer@sunrisehotels.com', phone: '+201090007007', industry: 'Hospitality', status: 'active', source: 'Referral', assigned_to: 5, estimated_value: 250000, notes: 'Multi-branch campaign' },
  { name: 'Salma Galal', company: 'BeautyBox', email: 'salma@beautybox.com', phone: '+201090008008', industry: 'Beauty', status: 'prospect', source: 'Instagram', assigned_to: 5, estimated_value: 75000, notes: 'Influencer marketing interest' }
];

const insertClient = db.prepare(`INSERT INTO clients (name, company, email, phone, industry, status, source, assigned_to, estimated_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
clients.forEach(c => insertClient.run(c.name, c.company, c.email, c.phone, c.industry, c.status, c.source, c.assigned_to, c.estimated_value, c.notes));
console.log('✅ Clients created');

// Insert client briefs
const briefs = [
  { client_id: 1, budget: '150,000 - 200,000 EGP/quarter', goals: 'Increase brand awareness by 40%, generate 500+ leads', target_audience: 'Tech-savvy millennials, Cairo & Alexandria', services_interested: 'Digital Marketing, SEO, Content Creation', current_challenges: 'Low brand recognition, competitors gaining market share', competitors: 'Vezeeta, Fareed, Uber Egypt', preferences: 'Data-driven approach, monthly reports', internal_notes: 'CEO is decision maker. Loves detailed analytics.' },
  { client_id: 2, budget: '80,000 - 100,000 EGP', goals: 'Build Instagram presence, reach 100K followers', target_audience: 'Women 18-35, urban areas', services_interested: 'Social Media Management, Influencer Marketing', current_challenges: 'New brand, no online presence', competitors: 'Local fashion brands', preferences: 'Creative visuals, trendy content', internal_notes: 'Owner is very active on social media herself' },
  { client_id: 3, budget: '40,000 - 50,000 EGP', goals: 'Launch new restaurant brand online', target_audience: 'Food lovers, Cairo residents', services_interested: 'Branding, Social Media Setup', current_challenges: 'Brand new business', competitors: 'Local restaurants with strong online presence', preferences: 'Affordable packages, quick turnaround', internal_notes: 'Startup, price-sensitive' },
  { client_id: 4, budget: '120,000 - 150,000 EGP/month', goals: 'Maintain market leadership, expand to new cities', target_audience: 'Health-conscious families', services_interested: 'Full Digital Marketing, PR', current_challenges: 'Scaling operations', competitors: 'Major organic brands', preferences: 'Premium service quality', internal_notes: 'High-value client, weekly check-ins' },
  { client_id: 5, budget: '200,000+ EGP', goals: 'Launch new SUV model campaign', target_audience: 'Upper-middle class car buyers', services_interested: 'Video Production, Event Marketing, Digital Ads', current_challenges: 'Entering competitive segment', competitors: 'Toyota, Hyundai, Kia', preferences: 'High production value', internal_notes: 'Auto industry experience required' }
];

const insertBrief = db.prepare(`INSERT INTO client_briefs (client_id, budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
briefs.forEach(b => insertBrief.run(b.client_id, b.budget, b.goals, b.target_audience, b.services_interested, b.current_challenges, b.competitors, b.preferences, b.internal_notes));
console.log('✅ Client briefs created');

// Insert calls
const today = new Date();
const insertCall = db.prepare(`INSERT INTO calls (user_id, client_id, call_date, duration, call_type, outcome, subject, notes, next_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const calls = [
  { user_id: 2, client_id: 1, call_date: new Date(today.getTime() - 86400000).toISOString(), duration: 25, call_type: 'outbound', outcome: 'connected', subject: 'Q3 Campaign Discussion', notes: 'Discussed Q3 strategy. They want to push SEO focus. Will send proposal by Friday.', next_follow_up: new Date(today.getTime() + 3*86400000).toISOString().split('T')[0] },
  { user_id: 2, client_id: 2, call_date: new Date(today.getTime() - 2*86400000).toISOString(), duration: 15, call_type: 'follow-up', outcome: 'connected', subject: 'Social Media Proposal', notes: 'Positive response to proposal. Wants to see influencer portfolio.', next_follow_up: new Date(today.getTime() + 86400000).toISOString().split('T')[0] },
  { user_id: 3, client_id: 3, call_date: new Date(today.getTime() - 4*86400000).toISOString(), duration: 20, call_type: 'outbound', outcome: 'connected', subject: 'Initial Discussion', notes: 'Very interested. Asked for pricing details.', next_follow_up: new Date(today.getTime() + 2*86400000).toISOString().split('T')[0] },
  { user_id: 3, client_id: 4, call_date: new Date(today.getTime() - 86400000).toISOString(), duration: 35, call_type: 'follow-up', outcome: 'connected', subject: 'Monthly Review', notes: 'Excellent results this month. Discussing expansion to Alexandria.', next_follow_up: new Date(today.getTime() + 7*86400000).toISOString().split('T')[0] },
  { user_id: 4, client_id: 5, call_date: new Date(today.getTime() - 3*86400000).toISOString(), duration: 40, call_type: 'outbound', outcome: 'connected', subject: 'SUV Campaign Brief', notes: 'Need detailed campaign plan with video concepts. Big budget client.', next_follow_up: new Date(today.getTime() + 86400000).toISOString().split('T')[0] },
  { user_id: 4, client_id: 6, call_date: new Date(today.getTime() - 5*86400000).toISOString(), duration: 12, call_type: 'outbound', outcome: 'voicemail', subject: 'Video Production Inquiry', notes: 'Left voicemail. Will retry tomorrow.', next_follow_up: new Date(today.getTime() + 86400000).toISOString().split('T')[0] },
  { user_id: 5, client_id: 7, call_date: new Date(today.getTime() - 86400000).toISOString(), duration: 30, call_type: 'follow-up', outcome: 'connected', subject: 'Multi-branch Coordination', notes: 'Discussing rollout for 3 new branches. Need to schedule meeting.', next_follow_up: new Date(today.getTime() + 2*86400000).toISOString().split('T')[0] },
  { user_id: 5, client_id: 8, call_date: new Date(today.getTime() - 2*86400000).toISOString(), duration: 18, call_type: 'outbound', outcome: 'callback', subject: 'Influencer Marketing', notes: 'Asked to call back after 3 PM. Will retry.', next_follow_up: null },
  { user_id: 2, client_id: 1, call_date: new Date(today.getTime() - 7*86400000).toISOString(), duration: 22, call_type: 'follow-up', outcome: 'connected', subject: 'Contract Renewal', notes: 'Renewed contract for another 6 months. Great win!', next_follow_up: null },
  { user_id: 3, client_id: 4, call_date: new Date(today.getTime() - 14*86400000).toISOString(), duration: 28, call_type: 'outbound', outcome: 'connected', subject: 'Strategy Sync', notes: 'Aligned on new content direction. Approved budget increase.', next_follow_up: null }
];

calls.forEach(c => insertCall.run(c.user_id, c.client_id, c.call_date, c.duration, c.call_type, c.outcome, c.subject, c.notes, c.next_follow_up));
console.log('✅ Calls created');

// Insert meetings
const insertMeeting = db.prepare(`INSERT INTO meetings (user_id, client_id, title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const meetings = [
  {
    user_id: 2, client_id: 1,
    title: 'TechVenture - Q3 Strategy Meeting',
    meeting_date: new Date(today.getTime() + 2*86400000).toISOString(),
    duration: 90, location: 'Limitless Office - Meeting Room A',
    meeting_type: 'in-person', status: 'scheduled',
    attendees: 'Mohamed El-Sayed, Sara Mohamed, Strategy Team',
    agenda: '1. Q3 performance review\n2. Q4 strategy planning\n3. Budget allocation\n4. New campaign ideas',
    mom: null, decisions: null, action_items: null,
    next_meeting: new Date(today.getTime() + 30*86400000).toISOString().split('T')[0]
  },
  {
    user_id: 2, client_id: 2,
    title: 'Nile Fashion - Influencer Strategy',
    meeting_date: new Date(today.getTime() - 3*86400000).toISOString(),
    duration: 60, location: 'Nile Fashion HQ',
    meeting_type: 'in-person', status: 'completed',
    attendees: 'Fatma Adel, Sara Mohamed',
    agenda: '1. Influencer shortlist review\n2. Content calendar\n3. Budget approval',
    mom: 'Meeting held at Nile Fashion HQ. Reviewed 15 potential influencers for Q4 campaign. Client approved top 5 selection. Discussed content calendar - 4 posts per week on Instagram, 2 reels weekly. Client excited about TikTok expansion.\n\nKey points:\n- Influencer budget: 40K EGP for 5 influencers\n- Content approval process: 24-hour turnaround\n- Launch date: October 15th',
    decisions: '1. Approved top 5 influencer selection\n2. Green-lit TikTok expansion with 50K budget\n3. Weekly content review calls starting next week',
    action_items: 'Sara: Send influencer contracts by Monday\nFatma: Provide brand guidelines document\nBoth: Schedule next review call for next Wednesday',
    next_meeting: new Date(today.getTime() + 7*86400000).toISOString().split('T')[0]
  },
  {
    user_id: 3, client_id: 4,
    title: 'GreenLife - Monthly Performance Review',
    meeting_date: new Date(today.getTime() + 86400000).toISOString(),
    duration: 60, location: 'Zoom Meeting',
    meeting_type: 'video', status: 'scheduled',
    attendees: 'Nour Hassan, Omar Ali, Account Manager',
    agenda: '1. September performance metrics\n2. Alexandria expansion plan\n3. Budget review for Q4',
    mom: null, decisions: null, action_items: null,
    next_meeting: null
  },
  {
    user_id: 4, client_id: 5,
    title: 'AutoDrive - SUV Campaign Kickoff',
    meeting_date: new Date(today.getTime() - 2*86400000).toISOString(),
    duration: 120, location: 'AutoDrive Showroom',
    meeting_type: 'in-person', status: 'completed',
    attendees: 'Hany Mostafa, Lina Khaled, Creative Director',
    agenda: '1. Campaign concept presentation\n2. Video production timeline\n3. Launch event planning',
    mom: 'Comprehensive kickoff meeting at AutoDrive showroom. Presented 3 campaign concepts - client selected Concept B (urban adventure theme). Discussed video production - 4 hero videos + 8 social cuts needed. Launch event planned for November 5th at City Stars.\n\nBudget breakdown:\n- Production: 80K EGP\n- Media buying: 100K EGP  \n- Event: 30K EGP',
    decisions: '1. Approved Concept B (urban adventure)\n2. Production timeline: Oct 1-25\n3. Launch event: Nov 5th at City Stars\n4. Hired external production house for hero videos',
    action_items: 'Lina: Finalize production crew by Sept 30\nHany: Provide product access for filming Oct 2\nCreative team: First cut by Oct 15',
    next_meeting: new Date(today.getTime() + 14*86400000).toISOString().split('T')[0]
  },
  {
    user_id: 5, client_id: 7,
    title: 'Sunrise Hotels - Branch Expansion',
    meeting_date: new Date(today.getTime() + 4*86400000).toISOString(),
    duration: 90, location: 'Sunrise Hotels - Hurghada',
    meeting_type: 'in-person', status: 'scheduled',
    attendees: 'Tamer Farouk, Mahmoud Said, Regional Manager',
    agenda: '1. New branches opening strategy\n2. Unified branding approach\n3. Local vs national campaigns',
    mom: null, decisions: null, action_items: null,
    next_meeting: null
  },
  {
    user_id: 3, client_id: 3,
    title: 'Cairo Bites - Brand Discovery',
    meeting_date: new Date(today.getTime() - 5*86400000).toISOString(),
    duration: 45, location: 'Cairo Bites Restaurant',
    meeting_type: 'in-person', status: 'completed',
    attendees: 'Karim Nabil, Omar Ali',
    agenda: '1. Brand vision discussion\n2. Target audience\n3. Initial budget planning',
    mom: 'Discovery session with Karim at the restaurant. Understood vision: authentic Egyptian street food experience elevated. Target: young professionals 25-35, food enthusiasts. Budget concerns but willing to start small.\n\nKey insights:\n- Strong personal brand potential for the owner\n- Unique recipes are differentiator\n- Limited initial budget but growth potential',
    decisions: '1. Start with 3-month pilot program\n2. Focus on Instagram first\n3. Create brand story content featuring Karim',
    action_items: 'Omar: Create 3-tier pricing options\nKarim: Provide high-quality food photos\nPilot launch: October 1st',
    next_meeting: new Date(today.getTime() + 7*86400000).toISOString().split('T')[0]
  }
];

meetings.forEach(m => insertMeeting.run(m.user_id, m.client_id, m.title, m.meeting_date, m.duration, m.location, m.meeting_type, m.status, m.attendees, m.agenda, m.mom, m.decisions, m.action_items, m.next_meeting));
console.log('✅ Meetings created');

// Insert todos
const insertTodo = db.prepare(`INSERT INTO todos (user_id, title, description, due_date, priority, status, client_id, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

const todos = [
  { user_id: 2, title: 'Send TechVenture Q4 proposal', description: 'Include SEO package, content strategy, and budget breakdown', due_date: new Date(today.getTime() + 2*86400000).toISOString().split('T')[0], priority: 'high', status: 'pending', client_id: 1, category: 'Proposal' },
  { user_id: 2, title: 'Follow up with Fatma on influencer contracts', description: 'Make sure contracts are signed before next week', due_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], priority: 'high', status: 'in-progress', client_id: 2, category: 'Follow-up' },
  { user_id: 2, title: 'Prepare monthly report', description: 'Compile all client reports for September', due_date: new Date(today.getTime() + 5*86400000).toISOString().split('T')[0], priority: 'medium', status: 'pending', client_id: null, category: 'Admin' },
  { user_id: 3, title: 'Send Cairo Bites pricing options', description: 'Create 3-tier pricing for their pilot program', due_date: new Date(today.getTime() + 3*86400000).toISOString().split('T')[0], priority: 'high', status: 'pending', client_id: 3, category: 'Proposal' },
  { user_id: 3, title: 'Schedule GreenLife performance review', description: 'Send calendar invite for monthly meeting', due_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], priority: 'medium', status: 'completed', client_id: 4, category: 'Meeting' },
  { user_id: 3, title: 'Research organic food industry trends', description: 'For GreenLife Q4 strategy', due_date: new Date(today.getTime() + 7*86400000).toISOString().split('T')[0], priority: 'low', status: 'pending', client_id: 4, category: 'Research' },
  { user_id: 4, title: 'Finalize AutoDrive production crew', description: 'Confirm videographer, photographer, and drone operator', due_date: new Date(today.getTime() + 2*86400000).toISOString().split('T')[0], priority: 'high', status: 'pending', client_id: 5, category: 'Production' },
  { user_id: 4, title: 'Call back Yara from EduTech', description: 'She requested a callback about video production', due_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], priority: 'medium', status: 'pending', client_id: 6, category: 'Follow-up' },
  { user_id: 4, title: 'Create video concept deck', description: 'For EduTech Plus pitch', due_date: new Date(today.getTime() + 4*86400000).toISOString().split('T')[0], priority: 'medium', status: 'pending', client_id: 6, category: 'Creative' },
  { user_id: 5, title: 'Prepare Hurghada trip presentation', description: 'Slides for Sunrise Hotels branch expansion meeting', due_date: new Date(today.getTime() + 3*86400000).toISOString().split('T')[0], priority: 'high', status: 'in-progress', client_id: 7, category: 'Presentation' },
  { user_id: 5, title: 'Research hospitality marketing trends', description: 'Latest trends in hotel marketing for 2026', due_date: new Date(today.getTime() + 6*86400000).toISOString().split('T')[0], priority: 'low', status: 'pending', client_id: 7, category: 'Research' },
  { user_id: 5, title: 'Send BeautyBox influencer proposal', description: 'Initial proposal after callback', due_date: new Date(today.getTime() + 4*86400000).toISOString().split('T')[0], priority: 'medium', status: 'pending', client_id: 8, category: 'Proposal' },
  { user_id: 2, title: 'Update CRM with new leads', description: 'Add 5 leads from LinkedIn campaign', due_date: new Date(today.getTime() - 86400000).toISOString().split('T')[0], priority: 'low', status: 'completed', client_id: null, category: 'Admin' },
  { user_id: 3, title: 'Send GreenLink content calendar', description: 'October content plan', due_date: new Date(today.getTime() + 5*86400000).toISOString().split('T')[0], priority: 'medium', status: 'pending', client_id: 4, category: 'Content' }
];

todos.forEach(t => insertTodo.run(t.user_id, t.title, t.description, t.due_date, t.priority, t.status, t.client_id, t.category));
console.log('✅ Todos created');

console.log('\n🎉 Database seeded successfully!');
console.log('\n📝 Login credentials:');
console.log(`   Admin:  username=admin,  password=${adminPlain}`);
console.log(`   Sales:  username=sara,   password=${salesPlain}`);
console.log(`   Sales:  username=omar,   password=${salesPlain}`);
console.log(`   Sales:  username=lina,   password=${salesPlain}`);
console.log(`   Sales:  username=mahmoud, password=${salesPlain}`);
