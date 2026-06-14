const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./database/db');
const { authenticate, requireAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], optionsSuccessStatus: 200 }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account inactive' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Log activity
  db.prepare('INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)').run(
    user.id, 'login', `${user.full_name} logged in`
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_color: user.avatar_color
    }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, email, phone, role, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ============ USERS (Admin only) ============
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.avatar_color, u.status, u.created_at,
           (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id) as client_count,
           (SELECT COUNT(*) FROM calls WHERE user_id = u.id) as call_count,
           (SELECT COUNT(*) FROM meetings WHERE user_id = u.id) as meeting_count
    FROM users u
    ORDER BY u.role DESC, u.full_name
  `).all();
  res.json(users);
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, full_name, email, phone, role, avatar_color } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and name required' });
  }
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password, full_name, email, phone, role, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashed, full_name, email, phone, role || 'sales', avatar_color || '#6366f1');
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const { full_name, email, phone, role, avatar_color, status, password } = req.body;
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(`
      UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, avatar_color = ?, status = ?, password = ?
      WHERE id = ?
    `).run(full_name, email, phone, role, avatar_color, status, hashed, req.params.id);
  } else {
    db.prepare(`
      UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, avatar_color = ?, status = ?
      WHERE id = ?
    `).run(full_name, email, phone, role, avatar_color, status, req.params.id);
  }
  res.json({ success: true });
});

// ============ CLIENTS ============
app.get('/api/clients', authenticate, (req, res) => {
  const { status, search } = req.query;
  let query = `
    SELECT c.*, u.full_name as assigned_to_name
    FROM clients c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== 'admin') {
    query += ' AND c.assigned_to = ?';
    params.push(req.user.id);
  }
  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY c.created_at DESC';
  const clients = db.prepare(query).all(...params);
  res.json(clients);
});

app.get('/api/clients/:id', authenticate, (req, res) => {
  const client = db.prepare(`
    SELECT c.*, u.full_name as assigned_to_name, u.email as assigned_to_email
    FROM clients c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Check access
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const brief = db.prepare('SELECT * FROM client_briefs WHERE client_id = ?').get(req.params.id);
  const calls = db.prepare(`
    SELECT calls.*, u.full_name as user_name FROM calls
    LEFT JOIN users u ON calls.user_id = u.id
    WHERE client_id = ? ORDER BY call_date DESC
  `).all(req.params.id);
  const meetings = db.prepare(`
    SELECT meetings.*, u.full_name as user_name FROM meetings
    LEFT JOIN users u ON meetings.user_id = u.id
    WHERE client_id = ? ORDER BY meeting_date DESC
  `).all(req.params.id);
  const todos = db.prepare(`
    SELECT * FROM todos WHERE client_id = ? ORDER BY due_date ASC
  `).all(req.params.id);

  res.json({ ...client, brief, calls, meetings, todos });
});

app.post('/api/clients', authenticate, (req, res) => {
  const { name, company, email, phone, industry, status, source, estimated_value, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Client name required' });
  const assigned_to = req.user.role === 'admin' && req.body.assigned_to ? req.body.assigned_to : req.user.id;
  const result = db.prepare(`
    INSERT INTO clients (name, company, email, phone, industry, status, source, assigned_to, estimated_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, company, email, phone, industry, status || 'lead', source, assigned_to, estimated_value || 0, notes);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/clients/:id', authenticate, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { name, company, email, phone, industry, status, source, estimated_value, notes, assigned_to } = req.body;
  db.prepare(`
    UPDATE clients SET name=?, company=?, email=?, phone=?, industry=?, status=?, source=?, estimated_value=?, notes=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, company, email, phone, industry, status, source, estimated_value, notes, assigned_to || client.assigned_to, req.params.id);
  res.json({ success: true });
});

// ============ CLIENT BRIEFS ============
app.get('/api/clients/:id/brief', authenticate, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const brief = db.prepare('SELECT * FROM client_briefs WHERE client_id = ?').get(req.params.id);
  res.json(brief || {});
});

app.put('/api/clients/:id/brief', authenticate, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes } = req.body;
  const existing = db.prepare('SELECT id FROM client_briefs WHERE client_id = ?').get(req.params.id);
  if (existing) {
    db.prepare(`
      UPDATE client_briefs SET budget=?, goals=?, target_audience=?, services_interested=?, current_challenges=?, competitors=?, preferences=?, internal_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).run(budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes, req.params.id);
  } else {
    db.prepare(`
      INSERT INTO client_briefs (client_id, budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes);
  }
  res.json({ success: true });
});

// ============ CALLS ============
app.get('/api/calls', authenticate, (req, res) => {
  const { client_id, user_id, from_date, to_date } = req.query;
  let query = `
    SELECT calls.*, c.name as client_name, c.company as client_company, u.full_name as user_name
    FROM calls
    LEFT JOIN clients c ON calls.client_id = c.id
    LEFT JOIN users u ON calls.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== 'admin') {
    query += ' AND calls.user_id = ?';
    params.push(req.user.id);
  }
  if (client_id) { query += ' AND calls.client_id = ?'; params.push(client_id); }
  if (user_id) { query += ' AND calls.user_id = ?'; params.push(user_id); }
  if (from_date) { query += ' AND calls.call_date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND calls.call_date <= ?'; params.push(to_date); }
  query += ' ORDER BY calls.call_date DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/calls', authenticate, (req, res) => {
  const { client_id, call_date, duration, call_type, outcome, subject, notes, next_follow_up } = req.body;
  if (!client_id || !call_date) return res.status(400).json({ error: 'Client and date required' });
  const result = db.prepare(`
    INSERT INTO calls (user_id, client_id, call_date, duration, call_type, outcome, subject, notes, next_follow_up)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, client_id, call_date, duration || 0, call_type || 'outbound', outcome || 'connected', subject, notes, next_follow_up);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/calls/:id', authenticate, (req, res) => {
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  if (req.user.role !== 'admin' && call.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { call_date, duration, call_type, outcome, subject, notes, next_follow_up } = req.body;
  db.prepare(`
    UPDATE calls SET call_date=?, duration=?, call_type=?, outcome=?, subject=?, notes=?, next_follow_up=?
    WHERE id = ?
  `).run(call_date, duration, call_type, outcome, subject, notes, next_follow_up, req.params.id);
  res.json({ success: true });
});

app.delete('/api/calls/:id', authenticate, (req, res) => {
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  if (req.user.role !== 'admin' && call.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  db.prepare('DELETE FROM calls WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ MEETINGS ============
app.get('/api/meetings', authenticate, (req, res) => {
  const { status, client_id, user_id, from_date, to_date } = req.query;
  let query = `
    SELECT meetings.*, c.name as client_name, c.company as client_company, u.full_name as user_name
    FROM meetings
    LEFT JOIN clients c ON meetings.client_id = c.id
    LEFT JOIN users u ON meetings.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== 'admin') {
    query += ' AND meetings.user_id = ?';
    params.push(req.user.id);
  }
  if (status) { query += ' AND meetings.status = ?'; params.push(status); }
  if (client_id) { query += ' AND meetings.client_id = ?'; params.push(client_id); }
  if (user_id) { query += ' AND meetings.user_id = ?'; params.push(user_id); }
  if (from_date) { query += ' AND meetings.meeting_date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND meetings.meeting_date <= ?'; params.push(to_date); }
  query += ' ORDER BY meetings.meeting_date DESC LIMIT 200';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/meetings', authenticate, (req, res) => {
  const { client_id, title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting } = req.body;
  if (!client_id || !title || !meeting_date) return res.status(400).json({ error: 'Required fields missing' });
  const result = db.prepare(`
    INSERT INTO meetings (user_id, client_id, title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, client_id, title, meeting_date, duration || 60, location, meeting_type || 'in-person', status || 'scheduled', attendees, agenda, mom, decisions, action_items, next_meeting);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/meetings/:id', authenticate, (req, res) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (req.user.role !== 'admin' && meeting.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting } = req.body;
  db.prepare(`
    UPDATE meetings SET title=?, meeting_date=?, duration=?, location=?, meeting_type=?, status=?, attendees=?, agenda=?, mom=?, decisions=?, action_items=?, next_meeting=?
    WHERE id = ?
  `).run(title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting, req.params.id);
  res.json({ success: true });
});

app.delete('/api/meetings/:id', authenticate, (req, res) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (req.user.role !== 'admin' && meeting.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  db.prepare('DELETE FROM meetings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ TODOS ============
app.get('/api/todos', authenticate, (req, res) => {
  const { status, priority } = req.query;
  let query = `
    SELECT todos.*, c.name as client_name, c.company as client_company, u.full_name as user_name
    FROM todos
    LEFT JOIN clients c ON todos.client_id = c.id
    LEFT JOIN users u ON todos.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== 'admin') {
    query += ' AND todos.user_id = ?';
    params.push(req.user.id);
  }
  if (status) { query += ' AND todos.status = ?'; params.push(status); }
  if (priority) { query += ' AND todos.priority = ?'; params.push(priority); }
  query += ' ORDER BY todos.due_date ASC, todos.priority DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/todos', authenticate, (req, res) => {
  const { title, description, due_date, priority, status, client_id, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare(`
    INSERT INTO todos (user_id, title, description, due_date, priority, status, client_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, title, description, due_date, priority || 'medium', status || 'pending', client_id, category);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/todos/:id', authenticate, (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { title, description, due_date, priority, status, client_id, category } = req.body;
  const completed_at = status === 'completed' ? new Date().toISOString() : null;
  db.prepare(`
    UPDATE todos SET title=?, description=?, due_date=?, priority=?, status=?, client_id=?, category=?, completed_at=?
    WHERE id = ?
  `).run(title, description, due_date, priority, status, client_id, category, completed_at, req.params.id);
  res.json({ success: true });
});

app.delete('/api/todos/:id', authenticate, (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  if (req.user.role !== 'admin' && todo.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ STATS / DASHBOARD ============
app.get('/api/stats/dashboard', authenticate, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userFilter = isAdmin ? '' : 'AND user_id = ?';
  const params = isAdmin ? [] : [req.user.id];

  // Personal/Team stats
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Helper to avoid passing undefined to better-sqlite3
  const runCount = (sql) => {
    const stmt = db.prepare(sql);
    return isAdmin ? stmt.get().c : stmt.get(req.user.id).c;
  };

  const stats = {
    totalClients: runCount(`SELECT COUNT(*) as c FROM clients WHERE 1=1 ${isAdmin ? '' : 'AND assigned_to = ?'}`),
    activeClients: runCount(`SELECT COUNT(*) as c FROM clients WHERE status IN ('active', 'prospect') ${isAdmin ? '' : 'AND assigned_to = ?'}`),
    totalCalls: db.prepare(`SELECT COUNT(*) as c FROM calls WHERE 1=1 ${userFilter}`).get(...params).c,
    todayCalls: db.prepare(`SELECT COUNT(*) as c FROM calls WHERE date(call_date) = date('now') ${userFilter}`).get(...params).c,
    weekCalls: db.prepare(`SELECT COUNT(*) as c FROM calls WHERE date(call_date) >= date('now', '-7 days') ${userFilter}`).get(...params).c,
    totalMeetings: db.prepare(`SELECT COUNT(*) as c FROM meetings WHERE 1=1 ${userFilter}`).get(...params).c,
    upcomingMeetings: db.prepare(`SELECT COUNT(*) as c FROM meetings WHERE meeting_date >= datetime('now') AND status = 'scheduled' ${userFilter}`).get(...params).c,
    completedMeetings: db.prepare(`SELECT COUNT(*) as c FROM meetings WHERE status = 'completed' ${userFilter}`).get(...params).c,
    totalTodos: db.prepare(`SELECT COUNT(*) as c FROM todos WHERE 1=1 ${userFilter}`).get(...params).c,
    pendingTodos: db.prepare(`SELECT COUNT(*) as c FROM todos WHERE status = 'pending' ${userFilter}`).get(...params).c,
    overdueTodos: db.prepare(`SELECT COUNT(*) as c FROM todos WHERE status != 'completed' AND due_date < date('now') ${userFilter}`).get(...params).c,
    pipelineValue: (() => {
      const sql = `SELECT COALESCE(SUM(estimated_value), 0) as v FROM clients WHERE status IN ('lead', 'prospect', 'active') ${isAdmin ? '' : 'AND assigned_to = ?'}`;
      const stmt = db.prepare(sql);
      return isAdmin ? stmt.get().v : stmt.get(req.user.id).v;
    })(),
  };

  // Calls by day (last 7 days)
  const callsByDay = db.prepare(`
    SELECT date(call_date) as day, COUNT(*) as count
    FROM calls
    WHERE date(call_date) >= date('now', '-7 days') ${userFilter}
    GROUP BY date(call_date)
    ORDER BY day ASC
  `).all(...params);

  // Meetings by status
  const meetingsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM meetings
    WHERE 1=1 ${userFilter}
    GROUP BY status
  `).all(...params);

  // Todos by priority
  const todosByPriority = db.prepare(`
    SELECT priority, COUNT(*) as count FROM todos
    WHERE status != 'completed' ${userFilter}
    GROUP BY priority
  `).all(...params);

  // Upcoming meetings (next 7 days)
  const upcomingMeetings = db.prepare(`
    SELECT meetings.*, c.name as client_name, c.company as client_company, u.full_name as user_name
    FROM meetings
    LEFT JOIN clients c ON meetings.client_id = c.id
    LEFT JOIN users u ON meetings.user_id = u.id
    WHERE meetings.meeting_date >= datetime('now') AND meetings.status = 'scheduled' ${userFilter}
    ORDER BY meetings.meeting_date ASC LIMIT 5
  `).all(...params);

  // Recent calls
  const recentCalls = db.prepare(`
    SELECT calls.*, c.name as client_name, c.company as client_company, u.full_name as user_name
    FROM calls
    LEFT JOIN clients c ON calls.client_id = c.id
    LEFT JOIN users u ON calls.user_id = u.id
    WHERE 1=1 ${userFilter}
    ORDER BY calls.call_date DESC LIMIT 5
  `).all(...params);

  // Pending todos
  const pendingTodos = db.prepare(`
    SELECT todos.*, c.name as client_name, u.full_name as user_name
    FROM todos
    LEFT JOIN clients c ON todos.client_id = c.id
    LEFT JOIN users u ON todos.user_id = u.id
    WHERE todos.status != 'completed' ${userFilter}
    ORDER BY todos.due_date ASC LIMIT 5
  `).all(...params);

  const result = { ...stats, callsByDay, meetingsByStatus, todosByPriority, upcomingMeetings, recentCalls, pendingTodos };

  // Admin-only: team performance
  if (isAdmin) {
    const teamPerformance = db.prepare(`
      SELECT u.id, u.full_name, u.avatar_color,
        (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id) as clients,
        (SELECT COUNT(*) FROM calls WHERE user_id = u.id) as calls,
        (SELECT COUNT(*) FROM meetings WHERE user_id = u.id) as meetings,
        (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND status = 'completed') as todos_completed,
        (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND status != 'completed') as todos_pending,
        (SELECT COALESCE(SUM(estimated_value), 0) FROM clients WHERE assigned_to = u.id) as pipeline
      FROM users u
      WHERE u.role = 'sales'
      ORDER BY u.full_name
    `).all();
    result.teamPerformance = teamPerformance;

    const recentActivities = db.prepare(`
      SELECT activities.*, u.full_name as user_name
      FROM activities
      LEFT JOIN users u ON activities.user_id = u.id
      ORDER BY activities.created_at DESC LIMIT 10
    `).all();
    result.recentActivities = recentActivities;
  }

  res.json(result);
});

app.get('/api/stats/team', authenticate, requireAdmin, (req, res) => {
  const teamData = db.prepare(`
    SELECT u.id, u.full_name, u.avatar_color,
      (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id) as total_clients,
      (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id AND status = 'active') as active_clients,
      (SELECT COUNT(*) FROM calls WHERE user_id = u.id AND date(call_date) >= date('now', '-30 days')) as calls_30d,
      (SELECT COUNT(*) FROM meetings WHERE user_id = u.id AND meeting_date >= date('now', '-30 days')) as meetings_30d,
      (SELECT COUNT(*) FROM meetings WHERE user_id = u.id AND status = 'completed') as completed_meetings,
      (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND status = 'completed' AND date(completed_at) >= date('now', '-30 days')) as todos_completed_30d,
      (SELECT COALESCE(SUM(estimated_value), 0) FROM clients WHERE assigned_to = u.id AND status != 'inactive') as pipeline_value,
      (SELECT COALESCE(SUM(duration), 0) FROM calls WHERE user_id = u.id AND date(call_date) >= date('now', '-30 days')) as call_minutes_30d
    FROM users u
    WHERE u.role = 'sales'
    ORDER BY pipeline_value DESC
  `).all();
  res.json(teamData);
});

// ============ ACTIVITIES (Admin) ============
app.get('/api/activities', authenticate, requireAdmin, (req, res) => {
  const activities = db.prepare(`
    SELECT activities.*, u.full_name as user_name, u.avatar_color
    FROM activities
    LEFT JOIN users u ON activities.user_id = u.id
    ORDER BY activities.created_at DESC LIMIT 50
  `).all();
  res.json(activities);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Limitless Sales System running on http://localhost:${PORT}`);
  console.log('\n📝 Login credentials are configured via .env or ENV variables.');
  console.log('   See .env.example and README.md for default development credentials.');
});
