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
const allowedOrigin = process.env.ALLOWED_ORIGIN || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*');

app.disable('x-powered-by');
app.use(cors({
  origin: allowedOrigin === '*' ? true : allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const safeParams = (params) => {
  if (params == null) return [];
  if (Array.isArray(params) && params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
};

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get([username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account inactive' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });

  await db.prepare('INSERT INTO activities (user_id, action, description) VALUES (?, ?, ?)').run([user.id, 'login', `${user.full_name} logged in`]);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_color: user.avatar_color,
      status: user.status,
      created_at: user.created_at
    }
  });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
  const user = await db.prepare('SELECT id, username, full_name, email, phone, role, avatar_color, status, created_at FROM users WHERE id = ?').get([req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}));

app.get('/api/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const users = await db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.avatar_color, u.status, u.created_at,
      (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id) AS client_count,
      (SELECT COUNT(*) FROM calls WHERE user_id = u.id) AS call_count,
      (SELECT COUNT(*) FROM meetings WHERE user_id = u.id) AS meeting_count
    FROM users u
    ORDER BY u.role DESC, u.full_name ASC
  `).all([]);
  res.json(users);
}));

app.post('/api/users', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, full_name, email, phone, role, avatar_color } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: 'Username, password, and full name are required' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = await db.prepare('INSERT INTO users (username, password, full_name, email, phone, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?)').run([username, hashed, full_name, email, phone, role || 'sales', avatar_color || '#6366f1']);
  res.json({ id: result.lastInsertRowid });
}));

app.put('/api/users/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { full_name, email, phone, role, avatar_color, status, password } = req.body;
  if (!full_name) return res.status(400).json({ error: 'Full name is required' });

  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, avatar_color = ?, status = ?, password = ? WHERE id = ?').run([full_name, email, phone, role, avatar_color, status || 'active', hashed, req.params.id]);
  } else {
    await db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, avatar_color = ?, status = ? WHERE id = ?').run([full_name, email, phone, role, avatar_color, status || 'active', req.params.id]);
  }

  res.json({ success: true });
}));

app.get('/api/clients', authenticate, asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT c.*, u.full_name AS assigned_to_name FROM clients c LEFT JOIN users u ON c.assigned_to = u.id WHERE 1=1';
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
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY c.created_at DESC';
  const rows = await db.prepare(query).all(params);
  res.json(rows);
}));

app.get('/api/clients/:id', authenticate, asyncHandler(async (req, res) => {
  const client = await db.prepare('SELECT c.*, u.full_name AS assigned_to_name, u.email AS assigned_to_email FROM clients c LEFT JOIN users u ON c.assigned_to = u.id WHERE c.id = ?').get([req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const brief = await db.prepare('SELECT * FROM client_briefs WHERE client_id = ?').get([req.params.id]);
  const calls = await db.prepare('SELECT calls.*, u.full_name AS user_name FROM calls LEFT JOIN users u ON calls.user_id = u.id WHERE client_id = ? ORDER BY call_date DESC').all([req.params.id]);
  const meetings = await db.prepare('SELECT meetings.*, u.full_name AS user_name FROM meetings LEFT JOIN users u ON meetings.user_id = u.id WHERE client_id = ? ORDER BY meeting_date DESC').all([req.params.id]);
  const todos = await db.prepare('SELECT * FROM todos WHERE client_id = ? ORDER BY due_date ASC').all([req.params.id]);

  res.json({ ...client, brief, calls, meetings, todos });
}));

app.post('/api/clients', authenticate, asyncHandler(async (req, res) => {
  const { name, company, email, phone, industry, status, source, estimated_value, notes, assigned_to } = req.body;
  if (!name) return res.status(400).json({ error: 'Client name is required' });

  const owner = req.user.role === 'admin' && assigned_to ? assigned_to : req.user.id;
  const result = await db.prepare('INSERT INTO clients (name, company, email, phone, industry, status, source, assigned_to, estimated_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run([name, company, email, phone, industry, status || 'lead', source, owner, estimated_value || 0, notes]);
  res.json({ id: result.lastInsertRowid });
}));

app.put('/api/clients/:id', authenticate, asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM clients WHERE id = ?').get([req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && existing.assigned_to !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { name, company, email, phone, industry, status, source, estimated_value, notes, assigned_to } = req.body;
  const owner = req.user.role === 'admin' ? assigned_to || existing.assigned_to : existing.assigned_to;
  await db.prepare('UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, industry = ?, status = ?, source = ?, estimated_value = ?, notes = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run([name, company, email, phone, industry, status, source, estimated_value || 0, notes, owner, req.params.id]);
  res.json({ success: true });
}));

app.get('/api/clients/:id/brief', authenticate, asyncHandler(async (req, res) => {
  const client = await db.prepare('SELECT * FROM clients WHERE id = ?').get([req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const brief = await db.prepare('SELECT * FROM client_briefs WHERE client_id = ?').get([req.params.id]);
  res.json(brief || {});
}));

app.put('/api/clients/:id/brief', authenticate, asyncHandler(async (req, res) => {
  const client = await db.prepare('SELECT * FROM clients WHERE id = ?').get([req.params.id]);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (req.user.role !== 'admin' && client.assigned_to !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes } = req.body;
  const existing = await db.prepare('SELECT id FROM client_briefs WHERE client_id = ?').get([req.params.id]);

  if (existing) {
    await db.prepare('UPDATE client_briefs SET budget = ?, goals = ?, target_audience = ?, services_interested = ?, current_challenges = ?, competitors = ?, preferences = ?, internal_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?').run([budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes, req.params.id]);
  } else {
    await db.prepare('INSERT INTO client_briefs (client_id, budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run([req.params.id, budget, goals, target_audience, services_interested, current_challenges, competitors, preferences, internal_notes]);
  }

  res.json({ success: true });
}));

app.get('/api/calls', authenticate, asyncHandler(async (req, res) => {
  const { client_id, user_id, from_date, to_date } = req.query;
  let query = 'SELECT calls.*, c.name AS client_name, c.company AS client_company, u.full_name AS user_name FROM calls LEFT JOIN clients c ON calls.client_id = c.id LEFT JOIN users u ON calls.user_id = u.id WHERE 1=1';
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND calls.user_id = ?';
    params.push(req.user.id);
  }
  if (client_id) { query += ' AND calls.client_id = ?'; params.push(client_id); }
  if (user_id) { query += ' AND calls.user_id = ?'; params.push(user_id); }
  if (from_date) { query += ' AND call_date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND call_date <= ?'; params.push(to_date); }

  query += ' ORDER BY calls.call_date DESC LIMIT 200';
  const rows = await db.prepare(query).all(params);
  res.json(rows);
}));

app.post('/api/calls', authenticate, asyncHandler(async (req, res) => {
  const { client_id, call_date, duration, call_type, outcome, subject, notes, next_follow_up } = req.body;
  if (!client_id || !call_date) return res.status(400).json({ error: 'Client and call date are required' });

  const result = await db.prepare('INSERT INTO calls (user_id, client_id, call_date, duration, call_type, outcome, subject, notes, next_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run([req.user.id, client_id, call_date, duration || 0, call_type || 'outbound', outcome || 'connected', subject, notes, next_follow_up]);
  res.json({ id: result.lastInsertRowid });
}));

app.put('/api/calls/:id', authenticate, asyncHandler(async (req, res) => {
  const call = await db.prepare('SELECT * FROM calls WHERE id = ?').get([req.params.id]);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  if (req.user.role !== 'admin' && call.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { call_date, duration, call_type, outcome, subject, notes, next_follow_up } = req.body;
  await db.prepare('UPDATE calls SET call_date = ?, duration = ?, call_type = ?, outcome = ?, subject = ?, notes = ?, next_follow_up = ? WHERE id = ?').run([call_date, duration || call.duration, call_type || call.call_type, outcome || call.outcome, subject, notes, next_follow_up, req.params.id]);
  res.json({ success: true });
}));

app.delete('/api/calls/:id', authenticate, asyncHandler(async (req, res) => {
  const call = await db.prepare('SELECT * FROM calls WHERE id = ?').get([req.params.id]);
  if (!call) return res.status(404).json({ error: 'Call not found' });
  if (req.user.role !== 'admin' && call.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  await db.prepare('DELETE FROM calls WHERE id = ?').run([req.params.id]);
  res.json({ success: true });
}));

app.get('/api/meetings', authenticate, asyncHandler(async (req, res) => {
  const { status, client_id, user_id, from_date, to_date } = req.query;
  let query = 'SELECT meetings.*, c.name AS client_name, c.company AS client_company, u.full_name AS user_name FROM meetings LEFT JOIN clients c ON meetings.client_id = c.id LEFT JOIN users u ON meetings.user_id = u.id WHERE 1=1';
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND meetings.user_id = ?';
    params.push(req.user.id);
  }
  if (status) { query += ' AND meetings.status = ?'; params.push(status); }
  if (client_id) { query += ' AND meetings.client_id = ?'; params.push(client_id); }
  if (user_id) { query += ' AND meetings.user_id = ?'; params.push(user_id); }
  if (from_date) { query += ' AND meeting_date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND meeting_date <= ?'; params.push(to_date); }

  query += ' ORDER BY meetings.meeting_date DESC LIMIT 200';
  const rows = await db.prepare(query).all(params);
  res.json(rows);
}));

app.post('/api/meetings', authenticate, asyncHandler(async (req, res) => {
  const { client_id, title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting } = req.body;
  if (!client_id || !title || !meeting_date) return res.status(400).json({ error: 'Client, title, and date are required' });

  const result = await db.prepare('INSERT INTO meetings (user_id, client_id, title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run([req.user.id, client_id, title, meeting_date, duration || 60, location, meeting_type || 'in-person', status || 'scheduled', attendees, agenda, mom, decisions, action_items, next_meeting]);
  res.json({ id: result.lastInsertRowid });
}));

app.put('/api/meetings/:id', authenticate, asyncHandler(async (req, res) => {
  const meeting = await db.prepare('SELECT * FROM meetings WHERE id = ?').get([req.params.id]);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (req.user.role !== 'admin' && meeting.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { title, meeting_date, duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting } = req.body;
  await db.prepare('UPDATE meetings SET title = ?, meeting_date = ?, duration = ?, location = ?, meeting_type = ?, status = ?, attendees = ?, agenda = ?, mom = ?, decisions = ?, action_items = ?, next_meeting = ? WHERE id = ?').run([title, meeting_date, duration || meeting.duration, location, meeting_type, status, attendees, agenda, mom, decisions, action_items, next_meeting, req.params.id]);
  res.json({ success: true });
}));

app.delete('/api/meetings/:id', authenticate, asyncHandler(async (req, res) => {
  const meeting = await db.prepare('SELECT * FROM meetings WHERE id = ?').get([req.params.id]);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (req.user.role !== 'admin' && meeting.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  await db.prepare('DELETE FROM meetings WHERE id = ?').run([req.params.id]);
  res.json({ success: true });
}));

app.get('/api/todos', authenticate, asyncHandler(async (req, res) => {
  const { status, priority } = req.query;
  let query = 'SELECT todos.*, c.name AS client_name, u.full_name AS user_name FROM todos LEFT JOIN clients c ON todos.client_id = c.id LEFT JOIN users u ON todos.user_id = u.id WHERE 1=1';
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND todos.user_id = ?';
    params.push(req.user.id);
  }
  if (status) { query += ' AND todos.status = ?'; params.push(status); }
  if (priority) { query += ' AND todos.priority = ?'; params.push(priority); }

  query += ' ORDER BY todos.due_date ASC, todos.priority DESC';
  const rows = await db.prepare(query).all(params);
  res.json(rows);
}));

app.post('/api/todos', authenticate, asyncHandler(async (req, res) => {
  const { title, description, due_date, priority, status, client_id, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = await db.prepare('INSERT INTO todos (user_id, title, description, due_date, priority, status, client_id, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run([req.user.id, title, description, due_date, priority || 'medium', status || 'pending', client_id, category]);
  res.json({ id: result.lastInsertRowid });
}));

app.put('/api/todos/:id', authenticate, asyncHandler(async (req, res) => {
  const todo = await db.prepare('SELECT * FROM todos WHERE id = ?').get([req.params.id]);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  if (req.user.role !== 'admin' && todo.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { title, description, due_date, priority, status, client_id, category } = req.body;
  const completed_at = status === 'completed' ? new Date().toISOString() : null;
  await db.prepare('UPDATE todos SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, client_id = ?, category = ?, completed_at = ? WHERE id = ?').run([title, description, due_date, priority, status, client_id, category, completed_at, req.params.id]);
  res.json({ success: true });
}));

app.delete('/api/todos/:id', authenticate, asyncHandler(async (req, res) => {
  const todo = await db.prepare('SELECT * FROM todos WHERE id = ?').get([req.params.id]);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  if (req.user.role !== 'admin' && todo.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  await db.prepare('DELETE FROM todos WHERE id = ?').run([req.params.id]);
  res.json({ success: true });
}));

app.get('/api/stats/dashboard', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userFilter = isAdmin ? '' : ' AND assigned_to = ?';
  const userParams = isAdmin ? [] : [req.user.id];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);

  const totalClients = await db.prepare(`SELECT COUNT(*) AS c FROM clients WHERE 1=1${userFilter}`).get(userParams);
  const activeClients = await db.prepare(`SELECT COUNT(*) AS c FROM clients WHERE status IN ('active','prospect')${userFilter}`).get(userParams);
  const totalCalls = await db.prepare(`SELECT COUNT(*) AS c FROM calls WHERE 1=1${isAdmin ? '' : ' AND user_id = ?'}`).get(userParams);
  const todayCalls = await db.prepare(`SELECT COUNT(*) AS c FROM calls WHERE call_date >= ? AND call_date < ?${isAdmin ? '' : ' AND user_id = ?'}`).get(isAdmin ? [today.toISOString(), tomorrow.toISOString()] : [today.toISOString(), tomorrow.toISOString(), req.user.id]);
  const weekCalls = await db.prepare(`SELECT COUNT(*) AS c FROM calls WHERE call_date >= ? AND call_date < ?${isAdmin ? '' : ' AND user_id = ?'}`).get(isAdmin ? [weekAgo.toISOString(), tomorrow.toISOString()] : [weekAgo.toISOString(), tomorrow.toISOString(), req.user.id]);
  const totalMeetings = await db.prepare(`SELECT COUNT(*) AS c FROM meetings WHERE 1=1${isAdmin ? '' : ' AND user_id = ?'}`).get(userParams);
  const upcomingMeetings = await db.prepare(`SELECT COUNT(*) AS c FROM meetings WHERE meeting_date >= ? AND status = 'scheduled'${isAdmin ? '' : ' AND user_id = ?'}`).get(isAdmin ? [today.toISOString()] : [today.toISOString(), req.user.id]);
  const completedMeetings = await db.prepare(`SELECT COUNT(*) AS c FROM meetings WHERE status = 'completed'${isAdmin ? '' : ' AND user_id = ?'}`).get(userParams);
  const totalTodos = await db.prepare(`SELECT COUNT(*) AS c FROM todos WHERE 1=1${isAdmin ? '' : ' AND user_id = ?'}`).get(userParams);
  const pendingTodos = await db.prepare(`SELECT COUNT(*) AS c FROM todos WHERE status = 'pending'${isAdmin ? '' : ' AND user_id = ?'}`).get(userParams);
  const overdueTodos = await db.prepare(`SELECT COUNT(*) AS c FROM todos WHERE status != 'completed' AND due_date < ?${isAdmin ? '' : ' AND user_id = ?'}`).get(isAdmin ? [today.toISOString().split('T')[0]] : [today.toISOString().split('T')[0], req.user.id]);
  const pipelineValue = await db.prepare(`SELECT COALESCE(SUM(estimated_value), 0) AS v FROM clients WHERE status IN ('lead','prospect','active')${userFilter}`).get(userParams);
  const callsByDay = await db.prepare(`SELECT date(call_date) AS day, COUNT(*) AS count FROM calls WHERE call_date >= ? AND call_date < ?${isAdmin ? '' : ' AND user_id = ?'} GROUP BY date(call_date) ORDER BY day ASC`).all(isAdmin ? [weekAgo.toISOString(), tomorrow.toISOString()] : [weekAgo.toISOString(), tomorrow.toISOString(), req.user.id]);
  const meetingsByStatus = await db.prepare(`SELECT status, COUNT(*) AS count FROM meetings WHERE 1=1${isAdmin ? '' : ' AND user_id = ?'} GROUP BY status`).all(userParams);
  const todosByPriority = await db.prepare(`SELECT priority, COUNT(*) AS count FROM todos WHERE status != 'completed'${isAdmin ? '' : ' AND user_id = ?'} GROUP BY priority`).all(userParams);
  const upcoming = await db.prepare(`SELECT meetings.*, c.name AS client_name, c.company AS client_company, u.full_name AS user_name FROM meetings LEFT JOIN clients c ON meetings.client_id = c.id LEFT JOIN users u ON meetings.user_id = u.id WHERE meeting_date >= ? AND status = 'scheduled'${isAdmin ? '' : ' AND meetings.user_id = ?'} ORDER BY meetings.meeting_date ASC LIMIT 5`).all(isAdmin ? [today.toISOString()] : [today.toISOString(), req.user.id]);
  const recentCalls = await db.prepare(`SELECT calls.*, c.name AS client_name, c.company AS client_company, u.full_name AS user_name FROM calls LEFT JOIN clients c ON calls.client_id = c.id LEFT JOIN users u ON calls.user_id = u.id WHERE 1=1${isAdmin ? '' : ' AND calls.user_id = ?'} ORDER BY calls.call_date DESC LIMIT 5`).all(userParams);
  const pendingTodosList = await db.prepare(`SELECT todos.*, c.name AS client_name, u.full_name AS user_name FROM todos LEFT JOIN clients c ON todos.client_id = c.id LEFT JOIN users u ON todos.user_id = u.id WHERE todos.status != 'completed'${isAdmin ? '' : ' AND todos.user_id = ?'} ORDER BY todos.due_date ASC LIMIT 5`).all(userParams);

  res.json({
    totalClients: totalClients.c,
    activeClients: activeClients.c,
    totalCalls: totalCalls.c,
    todayCalls: todayCalls.c,
    weekCalls: weekCalls.c,
    totalMeetings: totalMeetings.c,
    upcomingMeetings: upcomingMeetings.c,
    completedMeetings: completedMeetings.c,
    totalTodos: totalTodos.c,
    pendingTodos: pendingTodos.c,
    overdueTodos: overdueTodos.c,
    pipelineValue: pipelineValue.v || 0,
    callsByDay,
    meetingsByStatus,
    todosByPriority,
    upcomingMeetings: upcoming,
    recentCalls,
    pendingTodos: pendingTodosList
  });
}));

app.get('/api/stats/team', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const teamData = await db.prepare(`
    SELECT u.id, u.full_name, u.avatar_color,
      (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id) AS total_clients,
      (SELECT COUNT(*) FROM clients WHERE assigned_to = u.id AND status = 'active') AS active_clients,
      (SELECT COUNT(*) FROM calls WHERE user_id = u.id AND call_date >= ?) AS calls_30d,
      (SELECT COUNT(*) FROM meetings WHERE user_id = u.id AND meeting_date >= ?) AS meetings_30d,
      (SELECT COUNT(*) FROM meetings WHERE user_id = u.id AND status = 'completed') AS completed_meetings,
      (SELECT COUNT(*) FROM todos WHERE user_id = u.id AND status = 'completed' AND completed_at >= ?) AS todos_completed_30d,
      (SELECT COALESCE(SUM(estimated_value), 0) FROM clients WHERE assigned_to = u.id AND status != 'inactive') AS pipeline_value,
      (SELECT COALESCE(SUM(duration), 0) FROM calls WHERE user_id = u.id AND call_date >= ?) AS call_minutes_30d
    FROM users u
    WHERE u.role = 'sales'
    ORDER BY pipeline_value DESC
  `).all([thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo]);

  res.json(teamData);
}));

app.get('/api/activities', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const activities = await db.prepare('SELECT activities.*, u.full_name AS user_name, u.avatar_color FROM activities LEFT JOIN users u ON activities.user_id = u.id ORDER BY activities.created_at DESC LIMIT 50').all([]);
  res.json(activities);
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (require.main === module) {
  db.ready.then(() => {
    app.listen(PORT, () => {
      console.log(`Limitless Sales System running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

module.exports = app;
