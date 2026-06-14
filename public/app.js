// ==========================================
// LIMITLESS SALES SYSTEM - Frontend App
// ==========================================

const App = {
  token: localStorage.getItem('limitless_token'),
  user: JSON.parse(localStorage.getItem('limitless_user') || 'null'),
  currentPage: 'dashboard',
  data: {},
  charts: {},
  theme: localStorage.getItem('limitless_theme') || 'light'
};

// ============ UTILITIES ============
const fmt = {
  date(d) { if (!d) return '-'; const date = new Date(d); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); },
  dateTime(d) { if (!d) return '-'; const date = new Date(d); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); },
  time(d) { if (!d) return '-'; return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); },
  money(v) { if (!v) return '0 EGP'; return Number(v).toLocaleString() + ' EGP'; },
  initials(name) { if (!name) return '?'; return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase(); },
  relative(d) {
    if (!d) return '-';
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.date(d);
  },
  dueLabel(d) {
    if (!d) return null;
    const date = new Date(d);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.floor((date - today) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 7) return `In ${diff}d`;
    return this.date(d);
  }
};

function toast(msg, type='success') {
  const t = document.getElementById('toast');
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-700' };
  t.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`;
  t.innerHTML = `<span>${msg}</span>`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function applyTheme() {
  document.body.classList.toggle('dark', App.theme === 'dark');
  const button = document.getElementById('themeToggle');
  if (button) {
    button.textContent = App.theme === 'dark' ? 'Light mode' : 'Dark mode';
    button.setAttribute('aria-label', App.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function toggleTheme() {
  App.theme = App.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('limitless_theme', App.theme);
  applyTheme();
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (App.token) headers['Authorization'] = `Bearer ${App.token}`;
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ============ AUTH ============
function login(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) { errorEl.textContent = data.error || 'Login failed'; errorEl.classList.remove('hidden'); return; }
      App.token = data.token;
      App.user = data.user;
      localStorage.setItem('limitless_token', data.token);
      localStorage.setItem('limitless_user', JSON.stringify(data.user));
      showApp();
    }).catch(err => { errorEl.textContent = 'Network error'; errorEl.classList.remove('hidden'); });
}

function logout() {
  App.token = null;
  App.user = null;
  localStorage.removeItem('limitless_token');
  localStorage.removeItem('limitless_user');
  showLogin();
}

function showLogin() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('appView').classList.add('hidden');
}

function showApp() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('userName').textContent = App.user.full_name;
  document.getElementById('userRole').textContent = App.user.role === 'admin' ? 'Administrator' : 'Sales Executive';
  const avatar = document.getElementById('userAvatar');
  avatar.style.background = App.user.avatar_color || '#6366f1';
  avatar.textContent = fmt.initials(App.user.full_name);
  if (App.user.role === 'admin') document.getElementById('adminNav').classList.remove('hidden');
  else document.getElementById('adminNav').classList.add('hidden');
  navigate('dashboard');
}

// ============ NAVIGATION ============
function navigate(page) {
  App.currentPage = page;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  renderPage(page);
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function renderPage(page) {
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="text-center py-12 text-slate-400">Loading...</div>';
  switch(page) {
    case 'dashboard': renderDashboard(content); break;
    case 'clients': renderClients(content); break;
    case 'calls': renderCalls(content); break;
    case 'meetings': renderMeetings(content); break;
    case 'todos': renderTodos(content); break;
    case 'team': renderTeam(content); break;
    case 'analytics': renderAnalytics(content); break;
    case 'activity': renderActivity(content); break;
  }
}

// ============ DASHBOARD ============
async function renderDashboard(el) {
  try {
    const stats = await api('/stats/dashboard');
    const isAdmin = App.user.role === 'admin';
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">${isAdmin ? 'Admin Dashboard' : 'My Dashboard'}</h1>
            <p class="text-slate-500 mt-1">${isAdmin ? 'Complete overview of sales team performance' : 'Your personal sales overview'}</p>
          </div>
          <div class="text-sm text-slate-500">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <!-- STATS CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          ${statCard('Clients', stats.totalClients, stats.activeClients + ' active', 'from-blue-500 to-cyan-500', 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857')}
          ${statCard('Calls', stats.totalCalls, stats.todayCalls + ' today', 'from-emerald-500 to-teal-500', 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1')}
          ${statCard('Meetings', stats.totalMeetings, stats.upcomingMeetings + ' upcoming', 'from-purple-500 to-pink-500', 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
          ${statCard('Tasks', stats.pendingTodos, stats.overdueTodos + ' overdue', 'from-orange-500 to-red-500', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2')}
        </div>

        ${isAdmin ? `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div class="text-sm opacity-80 mb-1">Total Pipeline Value</div>
            <div class="text-3xl font-bold">${fmt.money(stats.pipelineValue)}</div>
            <div class="text-xs opacity-80 mt-2">Across all sales reps</div>
          </div>
          <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
            <div class="text-sm opacity-80 mb-1">Completed Meetings</div>
            <div class="text-3xl font-bold">${stats.completedMeetings}</div>
            <div class="text-xs opacity-80 mt-2">All-time</div>
          </div>
          <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
            <div class="text-sm opacity-80 mb-1">Calls This Week</div>
            <div class="text-3xl font-bold">${stats.weekCalls}</div>
            <div class="text-xs opacity-80 mt-2">Last 7 days</div>
          </div>
        </div>
        ` : ''}

        <!-- MAIN GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- LEFT: Charts + Upcoming -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Calls Chart -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <h3 class="text-lg font-bold text-slate-800 mb-4">Calls Activity (Last 7 Days)</h3>
              ${renderCallsChart(stats.callsByDay)}
            </div>

            ${isAdmin ? `
            <!-- Team Performance -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-slate-800">Team Performance</h3>
                <button onclick="navigate('team')" class="text-sm text-brand-600 hover:underline">View all</button>
              </div>
              ${renderTeamTable(stats.teamPerformance)}
            </div>
            ` : ''}

            <!-- Upcoming Meetings -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-slate-800">Upcoming Meetings</h3>
                <button onclick="navigate('meetings')" class="text-sm text-brand-600 hover:underline">View all</button>
              </div>
              ${stats.upcomingMeetings.length === 0 ? '<p class="text-slate-400 text-sm py-4 text-center">No upcoming meetings</p>' :
                stats.upcomingMeetings.map(m => `
                  <div class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2" onclick="openMeeting(${m.id})">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-800 truncate">${m.title}</div>
                      <div class="text-sm text-slate-500">${m.client_company || m.client_name} · ${fmt.relative(m.meeting_date)}</div>
                    </div>
                    ${isAdmin ? `<div class="text-xs text-slate-500">${m.user_name}</div>` : ''}
                  </div>
                `).join('')
              }
            </div>
          </div>

          <!-- RIGHT: Recent Activity + Tasks -->
          <div class="space-y-6">
            <!-- Pending Tasks -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-slate-800">Pending Tasks</h3>
                <button onclick="navigate('todos')" class="text-sm text-brand-600 hover:underline">View all</button>
              </div>
              ${stats.pendingTodos.length === 0 ? '<p class="text-slate-400 text-sm py-4 text-center">All caught up! 🎉</p>' :
                stats.pendingTodos.map(t => `
                  <div class="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                    <span class="priority-dot ${t.priority} mt-2"></span>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-slate-800 text-sm">${t.title}</div>
                      <div class="text-xs text-slate-500 mt-0.5">${t.client_name || 'General'} · ${fmt.dueLabel(t.due_date) || 'No due date'}</div>
                    </div>
                    ${isAdmin ? `<div class="text-xs text-slate-400">${t.user_name?.split(' ')[0]}</div>` : ''}
                  </div>
                `).join('')
              }
            </div>

            <!-- Recent Calls -->
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-slate-800">Recent Calls</h3>
                <button onclick="navigate('calls')" class="text-sm text-brand-600 hover:underline">View all</button>
              </div>
              ${stats.recentCalls.length === 0 ? '<p class="text-slate-400 text-sm py-4 text-center">No recent calls</p>' :
                stats.recentCalls.map(c => `
                  <div class="py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-2" onclick="openCall(${c.id})">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-medium text-slate-800 text-sm">${c.subject || 'Call'}</span>
                      <span class="badge badge-${c.outcome}">${c.outcome}</span>
                    </div>
                    <div class="text-xs text-slate-500">${c.client_company || c.client_name} · ${fmt.relative(c.call_date)}${isAdmin ? ' · ' + c.user_name.split(' ')[0] : ''}</div>
                  </div>
                `).join('')
              }
            </div>

            ${isAdmin && stats.recentActivities ? `
            <div class="bg-white rounded-xl border border-slate-200 p-6">
              <h3 class="text-lg font-bold text-slate-800 mb-4">Team Activity</h3>
              ${stats.recentActivities.map(a => `
                <div class="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                  <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <div class="flex-1 text-sm">
                    <span class="font-medium text-slate-800">${a.user_name?.split(' ')[0]}</span>
                    <span class="text-slate-500"> ${a.description}</span>
                  </div>
                  <div class="text-xs text-slate-400">${fmt.relative(a.created_at)}</div>
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error loading dashboard: ${err.message}</div>`;
  }
}

function statCard(title, value, sub, gradient, iconPath) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 card-hover">
      <div class="flex items-start justify-between mb-3">
        <div>
          <div class="text-sm text-slate-500 font-medium">${title}</div>
          <div class="text-3xl font-bold text-slate-800 mt-1">${value}</div>
        </div>
        <div class="w-12 h-12 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/></svg>
        </div>
      </div>
      <div class="text-xs text-slate-500">${sub}</div>
    </div>
  `;
}

function renderCallsChart(data) {
  if (!data || data.length === 0) return '<p class="text-slate-400 text-sm py-8 text-center">No calls data yet</p>';
  // Build last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    const found = data.find(x => x.day === key);
    days.push({ day: key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), count: found ? found.count : 0 });
  }
  const max = Math.max(...days.map(d => d.count), 1);
  return `
    <div class="flex items-end justify-between gap-2 h-40">
      ${days.map(d => `
        <div class="flex-1 flex flex-col items-center gap-2">
          <div class="w-full bg-slate-100 rounded-t relative" style="height: ${(d.count / max) * 100}%; min-height: 4px;">
            <div class="absolute inset-0 bg-gradient-to-t from-brand-500 to-brand-400 rounded-t bar-chart-bar"></div>
            ${d.count > 0 ? `<div class="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700">${d.count}</div>` : ''}
          </div>
          <div class="text-xs text-slate-500 font-medium">${d.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTeamTable(team) {
  if (!team || team.length === 0) return '<p class="text-slate-400 text-sm py-4 text-center">No team data</p>';
  return `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <th class="text-left py-2 font-semibold">Member</th>
            <th class="text-center py-2 font-semibold">Clients</th>
            <th class="text-center py-2 font-semibold">Calls</th>
            <th class="text-center py-2 font-semibold">Meetings</th>
            <th class="text-center py-2 font-semibold">Tasks Done</th>
            <th class="text-right py-2 font-semibold">Pipeline</th>
          </tr>
        </thead>
        <tbody>
          ${team.map(m => `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${m.avatar_color}">${fmt.initials(m.full_name)}</div>
                  <span class="font-medium text-slate-800">${m.full_name}</span>
                </div>
              </td>
              <td class="text-center py-3 text-slate-700">${m.clients}</td>
              <td class="text-center py-3 text-slate-700">${m.calls}</td>
              <td class="text-center py-3 text-slate-700">${m.meetings}</td>
              <td class="text-center py-3 text-slate-700">${m.todos_completed}</td>
              <td class="text-right py-3 font-semibold text-slate-800">${fmt.money(m.pipeline)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============ CLIENTS ============
async function renderClients(el, search = '', status = '') {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const clients = await api(`/clients?${params}`);
    const isAdmin = App.user.role === 'admin';
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">Clients</h1>
            <p class="text-slate-500 mt-1">${clients.length} ${clients.length === 1 ? 'client' : 'clients'}</p>
          </div>
          <button onclick="openClientForm()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Client
          </button>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <input id="clientSearch" type="text" placeholder="Search by name, company, email..." value="${search}" class="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            <select id="clientStatus" class="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">All Statuses</option>
              <option value="lead" ${status==='lead'?'selected':''}>Lead</option>
              <option value="prospect" ${status==='prospect'?'selected':''}>Prospect</option>
              <option value="active" ${status==='active'?'selected':''}>Active</option>
              <option value="inactive" ${status==='inactive'?'selected':''}>Inactive</option>
            </select>
            <button onclick="filterClients()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium">Filter</button>
          </div>
        </div>

        ${clients.length === 0 ? `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857"/></svg>
            <p class="text-slate-500">No clients yet</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${clients.map(c => `
              <div class="bg-white rounded-xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="openClientDetail(${c.id})">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <div class="font-bold text-slate-800 text-lg">${c.name}</div>
                    <div class="text-sm text-slate-500">${c.company || '-'}</div>
                  </div>
                  <span class="badge badge-${c.status}">${c.status}</span>
                </div>
                <div class="space-y-1.5 text-sm">
                  <div class="flex items-center gap-2 text-slate-600">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    ${c.email || 'No email'}
                  </div>
                  <div class="flex items-center gap-2 text-slate-600">
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1"/></svg>
                    ${c.phone || 'No phone'}
                  </div>
                  ${c.industry ? `<div class="flex items-center gap-2 text-slate-600"><svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>${c.industry}</div>` : ''}
                </div>
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                  <div class="text-xs text-slate-500">${isAdmin ? `Assigned to <strong>${c.assigned_to_name}</strong>` : `Added ${fmt.relative(c.created_at)}`}</div>
                  <div class="text-sm font-semibold text-emerald-600">${fmt.money(c.estimated_value)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

function filterClients() {
  const search = document.getElementById('clientSearch').value;
  const status = document.getElementById('clientStatus').value;
  renderClients(document.getElementById('pageContent'), search, status);
}

async function openClientDetail(id) {
  try {
    const client = await api(`/clients/${id}`);
    const isAdmin = App.user.role === 'admin';
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold text-slate-800">${client.name}</h2>
                <span class="badge badge-${client.status}">${client.status}</span>
              </div>
              <p class="text-sm text-slate-500 mt-1">${client.company || 'No company'}</p>
            </div>
            <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-6">
            <!-- Tabs -->
            <div class="flex gap-2 mb-6 border-b border-slate-200">
              <button onclick="switchTab('info')" id="tab-info" class="tab-btn px-4 py-2 font-medium text-slate-600 border-b-2 border-brand-500 text-brand-600">Overview</button>
              <button onclick="switchTab('brief')" id="tab-brief" class="tab-btn px-4 py-2 font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">Client Brief</button>
              <button onclick="switchTab('calls')" id="tab-calls" class="tab-btn px-4 py-2 font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">Calls (${client.calls.length})</button>
              <button onclick="switchTab('meetings')" id="tab-meetings" class="tab-btn px-4 py-2 font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">Meetings (${client.meetings.length})</button>
              <button onclick="switchTab('todos')" id="tab-todos" class="tab-btn px-4 py-2 font-medium text-slate-600 border-b-2 border-transparent hover:text-slate-800">Tasks (${client.todos.length})</button>
            </div>

            <!-- Info Tab -->
            <div id="content-info" class="tab-content">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Email</label>
                    <div class="text-slate-800 mt-1">${client.email || '-'}</div>
                  </div>
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Phone</label>
                    <div class="text-slate-800 mt-1">${client.phone || '-'}</div>
                  </div>
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Industry</label>
                    <div class="text-slate-800 mt-1">${client.industry || '-'}</div>
                  </div>
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Source</label>
                    <div class="text-slate-800 mt-1">${client.source || '-'}</div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Estimated Value</label>
                    <div class="text-2xl font-bold text-emerald-600 mt-1">${fmt.money(client.estimated_value)}</div>
                  </div>
                  ${isAdmin ? `<div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Assigned To</label>
                    <div class="text-slate-800 mt-1">${client.assigned_to_name}</div>
                  </div>` : ''}
                  <div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Added</label>
                    <div class="text-slate-800 mt-1">${fmt.date(client.created_at)}</div>
                  </div>
                  ${client.notes ? `<div>
                    <label class="text-xs text-slate-500 font-semibold uppercase">Notes</label>
                    <div class="text-slate-700 mt-1 text-sm bg-slate-50 p-3 rounded-lg">${client.notes}</div>
                  </div>` : ''}
                </div>
              </div>
              <div class="mt-6 flex gap-2">
                <button onclick="openClientForm(${client.id})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm">Edit Info</button>
                <button onclick="openCallForm(null, ${client.id})" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-medium text-sm">+ Log Call</button>
                <button onclick="openMeetingForm(null, ${client.id})" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg font-medium text-sm">+ Schedule Meeting</button>
                <button onclick="openTodoForm(null, ${client.id})" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-lg font-medium text-sm">+ Add Task</button>
              </div>
            </div>

            <!-- Brief Tab -->
            <div id="content-brief" class="tab-content hidden">
              ${renderClientBrief(client.brief || {})}
            </div>

            <!-- Calls Tab -->
            <div id="content-calls" class="tab-content hidden">
              ${client.calls.length === 0 ? '<p class="text-slate-400 text-center py-8">No calls yet</p>' :
                client.calls.map(c => `
                  <div class="border-b border-slate-100 py-3 hover:bg-slate-50 rounded px-2 cursor-pointer" onclick="openCall(${c.id}, ${client.id})">
                    <div class="flex justify-between items-start mb-1">
                      <span class="font-semibold text-slate-800">${c.subject || 'Call'}</span>
                      <span class="badge badge-${c.outcome}">${c.outcome}</span>
                    </div>
                    <div class="text-sm text-slate-500">${fmt.dateTime(c.call_date)} · ${c.duration || 0} min · ${c.user_name}</div>
                    ${c.notes ? `<div class="text-sm text-slate-600 mt-1">${c.notes}</div>` : ''}
                  </div>
                `).join('')
              }
            </div>

            <!-- Meetings Tab -->
            <div id="content-meetings" class="tab-content hidden">
              ${client.meetings.length === 0 ? '<p class="text-slate-400 text-center py-8">No meetings yet</p>' :
                client.meetings.map(m => `
                  <div class="border border-slate-200 rounded-lg p-4 mb-3 hover:bg-slate-50 cursor-pointer" onclick="openMeeting(${m.id}, ${client.id})">
                    <div class="flex justify-between items-start mb-2">
                      <span class="font-bold text-slate-800">${m.title}</span>
                      <span class="badge badge-${m.status}">${m.status}</span>
                    </div>
                    <div class="text-sm text-slate-500 mb-2">${fmt.dateTime(m.meeting_date)} · ${m.location || 'No location'}</div>
                    ${m.mom ? `<div class="text-sm text-slate-700 bg-slate-50 p-3 rounded mt-2"><strong>MOM:</strong> ${m.mom.slice(0, 200)}${m.mom.length > 200 ? '...' : ''}</div>` : ''}
                  </div>
                `).join('')
              }
            </div>

            <!-- Todos Tab -->
            <div id="content-todos" class="tab-content hidden">
              ${client.todos.length === 0 ? '<p class="text-slate-400 text-center py-8">No tasks yet</p>' :
                client.todos.map(t => `
                  <div class="flex items-start gap-3 py-3 border-b border-slate-100">
                    <span class="priority-dot ${t.priority} mt-2"></span>
                    <div class="flex-1">
                      <div class="font-medium text-slate-800">${t.title}</div>
                      <div class="text-xs text-slate-500 mt-1">${fmt.dueLabel(t.due_date) || 'No due date'} · <span class="badge badge-${t.status}">${t.status}</span></div>
                      ${t.description ? `<div class="text-sm text-slate-600 mt-1">${t.description}</div>` : ''}
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(err) {
    toast(err.message, 'error');
  }
}

function renderClientBrief(b) {
  return `
    <form id="briefForm" onsubmit="saveBrief(event, ${b.client_id || 'null'})">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Budget</label>
          <input name="budget" value="${b.budget || ''}" placeholder="e.g., 50K-100K EGP" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
          <input name="target_audience" value="${b.target_audience || ''}" placeholder="e.g., Women 25-35, urban" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Goals</label>
          <textarea name="goals" rows="3" placeholder="What does the client want to achieve?" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${b.goals || ''}</textarea>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Services Interested In</label>
          <input name="services_interested" value="${b.services_interested || ''}" placeholder="e.g., Social Media, SEO, Video Production" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Current Challenges</label>
          <textarea name="current_challenges" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${b.current_challenges || ''}</textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Competitors</label>
          <input name="competitors" value="${b.competitors || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Preferences</label>
          <input name="preferences" value="${b.preferences || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">Internal Notes <span class="text-xs text-amber-600">(Only visible to team)</span></label>
          <textarea name="internal_notes" rows="3" placeholder="Internal observations, decision maker info, strategy notes..." class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-amber-50">${b.internal_notes || ''}</textarea>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Save Brief</button>
      </div>
    </form>
  `;
}

async function saveBrief(e, clientId) {
  e.preventDefault();
  if (!clientId) { toast('Save client first', 'error'); return; }
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  try {
    await api(`/clients/${clientId}/brief`, { method: 'PUT', body: JSON.stringify(data) });
    toast('Client brief saved');
  } catch(err) { toast(err.message, 'error'); }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('border-brand-500', 'text-brand-600');
    el.classList.add('border-transparent');
  });
  document.getElementById(`content-${tab}`)?.classList.remove('hidden');
  const btn = document.getElementById(`tab-${tab}`);
  btn?.classList.add('border-brand-500', 'text-brand-600');
  btn?.classList.remove('border-transparent');
}

// ============ CLIENT FORM ============
async function openClientForm(clientId = null) {
  let client = { name: '', company: '', email: '', phone: '', industry: '', status: 'lead', source: '', estimated_value: 0, notes: '' };
  if (clientId) client = await api(`/clients/${clientId}`);
  const isAdmin = App.user.role === 'admin';
  const users = isAdmin ? await api('/users') : [];

  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800">${clientId ? 'Edit' : 'New'} Client</h2>
          <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="clientForm" onsubmit="saveClient(event, ${clientId || 'null'})" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input name="name" required value="${client.name}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input name="company" value="${client.company || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input name="email" type="email" value="${client.email || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input name="phone" value="${client.phone || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Industry</label>
              <input name="industry" value="${client.industry || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select name="source" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select...</option>
                <option ${client.source === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
                <option ${client.source === 'Referral' ? 'selected' : ''}>Referral</option>
                <option ${client.source === 'Website' ? 'selected' : ''}>Website</option>
                <option ${client.source === 'Cold Call' ? 'selected' : ''}>Cold Call</option>
                <option ${client.source === 'Event' ? 'selected' : ''}>Event</option>
                <option ${client.source === 'Facebook Ads' ? 'selected' : ''}>Facebook Ads</option>
                <option ${client.source === 'Instagram' ? 'selected' : ''}>Instagram</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="lead" ${client.status === 'lead' ? 'selected' : ''}>Lead</option>
                <option value="prospect" ${client.status === 'prospect' ? 'selected' : ''}>Prospect</option>
                <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${client.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Estimated Value (EGP)</label>
              <input name="estimated_value" type="number" value="${client.estimated_value || 0}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            ${isAdmin ? `
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <select name="assigned_to" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                ${users.filter(u => u.role === 'sales').map(u => `<option value="${u.id}" ${u.id === client.assigned_to ? 'selected' : ''}>${u.full_name}</option>`).join('')}
              </select>
            </div>` : ''}
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${client.notes || ''}</textarea>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">${clientId ? 'Update' : 'Create'} Client</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveClient(e, clientId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  data.estimated_value = parseFloat(data.estimated_value) || 0;
  if (data.assigned_to) data.assigned_to = parseInt(data.assigned_to);
  try {
    if (clientId) {
      await api(`/clients/${clientId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('Client updated');
    } else {
      const r = await api('/clients', { method: 'POST', body: JSON.stringify(data) });
      toast('Client created');
      closeModal();
      setTimeout(() => openClientDetail(r.id), 300);
      return;
    }
    closeModal();
    if (App.currentPage === 'clients') renderClients(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

// ============ CALLS ============
async function renderCalls(el) {
  try {
    const calls = await api('/calls');
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">Calls</h1>
            <p class="text-slate-500 mt-1">${calls.length} total calls</p>
          </div>
          <button onclick="openCallForm()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Log Call
          </button>
        </div>
        ${calls.length === 0 ? `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            <p class="text-slate-500">No calls logged yet</p>
          </div>
        ` : `
          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            ${calls.map(c => `
              <div class="border-b border-slate-100 p-4 hover:bg-slate-50 cursor-pointer" onclick="openCall(${c.id})">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="font-bold text-slate-800">${c.subject || 'Call'}</div>
                    <div class="text-sm text-slate-500 mt-0.5">${c.client_company || c.client_name}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="badge badge-${c.outcome}">${c.outcome}</span>
                    <span class="text-sm font-semibold text-slate-600">${c.duration || 0}m</span>
                  </div>
                </div>
                <div class="flex justify-between items-center text-sm text-slate-500">
                  <div class="flex items-center gap-3">
                    <span>📅 ${fmt.dateTime(c.call_date)}</span>
                    <span>📞 ${c.call_type}</span>
                  </div>
                  ${App.user.role === 'admin' ? `<span class="text-xs">${c.user_name}</span>` : ''}
                </div>
                ${c.notes ? `<div class="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">${c.notes}</div>` : ''}
                ${c.next_follow_up ? `<div class="text-xs text-amber-600 mt-2">↪ Follow-up: ${fmt.date(c.next_follow_up)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

async function openCallForm(callId = null, clientId = null) {
  let call = { call_date: new Date().toISOString().slice(0,16), duration: 15, call_type: 'outbound', outcome: 'connected', subject: '', notes: '', next_follow_up: '', client_id: clientId || '' };
  if (callId) call = await api('/calls').then(calls => calls.find(c => c.id === callId));
  const clients = await api('/clients');

  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800">${callId ? 'Edit' : 'Log'} Call</h2>
          <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="callForm" onsubmit="saveCall(event, ${callId || 'null'})" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Client *</label>
            <select name="client_id" required class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select client...</option>
              ${clients.map(c => `<option value="${c.id}" ${c.id == call.client_id ? 'selected' : ''}>${c.name}${c.company ? ' - ' + c.company : ''}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Date & Time *</label>
              <input name="call_date" type="datetime-local" required value="${call.call_date ? new Date(call.call_date).toISOString().slice(0,16) : ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input name="duration" type="number" value="${call.duration || 0}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select name="call_type" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="outbound" ${call.call_type === 'outbound' ? 'selected' : ''}>Outbound</option>
                <option value="inbound" ${call.call_type === 'inbound' ? 'selected' : ''}>Inbound</option>
                <option value="follow-up" ${call.call_type === 'follow-up' ? 'selected' : ''}>Follow-up</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
              <select name="outcome" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="connected" ${call.outcome === 'connected' ? 'selected' : ''}>Connected</option>
                <option value="no-answer" ${call.outcome === 'no-answer' ? 'selected' : ''}>No Answer</option>
                <option value="voicemail" ${call.outcome === 'voicemail' ? 'selected' : ''}>Voicemail</option>
                <option value="callback" ${call.outcome === 'callback' ? 'selected' : ''}>Callback Requested</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input name="subject" value="${call.subject || ''}" placeholder="Brief description" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${call.notes || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Next Follow-up Date</label>
            <input name="next_follow_up" type="date" value="${call.next_follow_up ? call.next_follow_up.split('T')[0] : ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div class="flex justify-between gap-2 pt-4 border-t border-slate-100">
            ${callId ? `<button type="button" onclick="deleteCall(${callId})" class="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg">Delete</button>` : '<div></div>'}
            <div class="flex gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveCall(e, callId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  data.client_id = parseInt(data.client_id);
  data.duration = parseInt(data.duration) || 0;
  try {
    if (callId) {
      await api(`/calls/${callId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('Call updated');
    } else {
      await api('/calls', { method: 'POST', body: JSON.stringify(data) });
      toast('Call logged');
    }
    closeModal();
    if (App.currentPage === 'calls') renderCalls(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteCall(id) {
  if (!confirm('Delete this call?')) return;
  try {
    await api(`/calls/${id}`, { method: 'DELETE' });
    toast('Call deleted');
    closeModal();
    if (App.currentPage === 'calls') renderCalls(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function openCall(id) {
  await openCallForm(id);
}

// ============ MEETINGS ============
async function renderMeetings(el) {
  try {
    const meetings = await api('/meetings');
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">Meetings</h1>
            <p class="text-slate-500 mt-1">${meetings.length} total meetings</p>
          </div>
          <button onclick="openMeetingForm()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Schedule Meeting
          </button>
        </div>
        ${meetings.length === 0 ? `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <p class="text-slate-500">No meetings scheduled</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${meetings.map(m => `
              <div class="bg-white rounded-xl border border-slate-200 p-5 card-hover cursor-pointer" onclick="openMeeting(${m.id})">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="font-bold text-slate-800 text-lg">${m.title}</div>
                    <div class="text-sm text-slate-500 mt-0.5">${m.client_company || m.client_name}</div>
                  </div>
                  <span class="badge badge-${m.status}">${m.status}</span>
                </div>
                <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    ${fmt.dateTime(m.meeting_date)}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    ${m.duration || 60} min
                  </span>
                  ${m.location ? `<span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${m.location}</span>` : ''}
                </div>
                ${m.agenda ? `<div class="text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded"><strong>Agenda:</strong> ${m.agenda.slice(0, 150)}${m.agenda.length > 150 ? '...' : ''}</div>` : ''}
                ${m.mom ? `<div class="text-sm text-emerald-700 mt-2 bg-emerald-50 p-3 rounded border-l-4 border-emerald-500"><strong>✓ MOM recorded</strong> · ${m.mom.slice(0, 150)}${m.mom.length > 150 ? '...' : ''}</div>` : m.status === 'completed' ? '<div class="text-sm text-amber-600 mt-2">⚠ MOM not yet recorded</div>' : ''}
                ${App.user.role === 'admin' ? `<div class="text-xs text-slate-400 mt-2">By ${m.user_name}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

async function openMeetingForm(meetingId = null, clientId = null) {
  let meeting = {
    title: '', meeting_date: new Date(Date.now() + 86400000).toISOString().slice(0,16),
    duration: 60, location: '', meeting_type: 'in-person', status: 'scheduled',
    attendees: '', agenda: '', mom: '', decisions: '', action_items: '', next_meeting: '',
    client_id: clientId || ''
  };
  if (meetingId) {
    const all = await api('/meetings');
    meeting = all.find(m => m.id === meetingId);
  }
  const clients = await api('/clients');

  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800">${meetingId ? 'Edit' : 'Schedule'} Meeting</h2>
          <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="meetingForm" onsubmit="saveMeeting(event, ${meetingId || 'null'})" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select name="client_id" required class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select client...</option>
                ${clients.map(c => `<option value="${c.id}" ${c.id == meeting.client_id ? 'selected' : ''}>${c.name}${c.company ? ' - ' + c.company : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input name="title" required value="${meeting.title || ''}" placeholder="e.g., Q4 Strategy Review" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Date & Time *</label>
              <input name="meeting_date" type="datetime-local" required value="${meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().slice(0,16) : ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input name="duration" type="number" value="${meeting.duration || 60}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select name="meeting_type" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="in-person" ${meeting.meeting_type === 'in-person' ? 'selected' : ''}>In-person</option>
                <option value="video" ${meeting.meeting_type === 'video' ? 'selected' : ''}>Video Call</option>
                <option value="phone" ${meeting.meeting_type === 'phone' ? 'selected' : ''}>Phone</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="scheduled" ${meeting.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="completed" ${meeting.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${meeting.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Location / Link</label>
            <input name="location" value="${meeting.location || ''}" placeholder="Office, address, or video link" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Attendees</label>
            <input name="attendees" value="${meeting.attendees || ''}" placeholder="Names of attendees" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Agenda</label>
            <textarea name="agenda" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${meeting.agenda || ''}</textarea>
          </div>

          <div class="border-t border-slate-200 pt-4 mt-4">
            <h3 class="font-bold text-slate-800 mb-3">📋 Minutes of Meeting (MOM)</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Discussion / MOM</label>
                <textarea name="mom" rows="4" placeholder="What was discussed? Key points?" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${meeting.mom || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Decisions Made</label>
                <textarea name="decisions" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${meeting.decisions || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Action Items</label>
                <textarea name="action_items" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${meeting.action_items || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Next Meeting Date</label>
                <input name="next_meeting" type="date" value="${meeting.next_meeting ? meeting.next_meeting.split('T')[0] : ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
              </div>
            </div>
          </div>

          <div class="flex justify-between gap-2 pt-4 border-t border-slate-100">
            ${meetingId ? `<button type="button" onclick="deleteMeeting(${meetingId})" class="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg">Delete</button>` : '<div></div>'}
            <div class="flex gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Save Meeting</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveMeeting(e, meetingId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  data.client_id = parseInt(data.client_id);
  data.duration = parseInt(data.duration) || 60;
  try {
    if (meetingId) {
      await api(`/meetings/${meetingId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('Meeting updated');
    } else {
      await api('/meetings', { method: 'POST', body: JSON.stringify(data) });
      toast('Meeting scheduled');
    }
    closeModal();
    if (App.currentPage === 'meetings') renderMeetings(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteMeeting(id) {
  if (!confirm('Delete this meeting?')) return;
  try {
    await api(`/meetings/${id}`, { method: 'DELETE' });
    toast('Meeting deleted');
    closeModal();
    if (App.currentPage === 'meetings') renderMeetings(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function openMeeting(id) {
  await openMeetingForm(id);
}

// ============ TODOS ============
async function renderTodos(el) {
  try {
    const todos = await api('/todos');
    const pending = todos.filter(t => t.status !== 'completed');
    const completed = todos.filter(t => t.status === 'completed');
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">To-do List</h1>
            <p class="text-slate-500 mt-1">${pending.length} pending · ${completed.length} completed</p>
          </div>
          <button onclick="openTodoForm()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Task
          </button>
        </div>

        ${todos.length === 0 ? `
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <p class="text-slate-500">No tasks yet</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            ${['high','medium','low'].map(priority => {
              const items = pending.filter(t => t.priority === priority);
              if (items.length === 0) return '';
              return `
                <div class="bg-white rounded-xl border border-slate-200 p-4">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="priority-dot ${priority}"></span>
                    <h3 class="font-bold text-slate-700 uppercase text-xs tracking-wider">${priority} priority</h3>
                    <span class="text-xs text-slate-400 ml-auto">${items.length}</span>
                  </div>
                  <div class="space-y-2">
                    ${items.map(t => `
                      <div class="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer" onclick="openTodoForm(${t.id})">
                        <div class="flex items-start gap-2">
                          <input type="checkbox" onclick="event.stopPropagation(); toggleTodo(${t.id}, this.checked)" class="mt-1 w-4 h-4 rounded">
                          <div class="flex-1 min-w-0">
                            <div class="font-medium text-slate-800 text-sm">${t.title}</div>
                            ${t.description ? `<div class="text-xs text-slate-500 mt-1">${t.description.slice(0, 80)}${t.description.length > 80 ? '...' : ''}</div>` : ''}
                            <div class="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              ${t.due_date ? `<span class="${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-600 font-semibold' : ''}">${fmt.dueLabel(t.due_date)}</span>` : ''}
                              ${t.client_name ? `<span>· ${t.client_name}</span>` : ''}
                              ${App.user.role === 'admin' ? `<span class="ml-auto text-xs">${t.user_name?.split(' ')[0]}</span>` : ''}
                            </div>
                            ${t.category ? `<span class="inline-block text-xs px-2 py-0.5 bg-white rounded mt-1 text-slate-600">${t.category}</span>` : ''}
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${completed.length > 0 ? `
            <div class="mt-8">
              <h3 class="text-lg font-bold text-slate-800 mb-3">✅ Completed</h3>
              <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                ${completed.slice(0, 10).map(t => `
                  <div class="p-3 flex items-start gap-3 opacity-60 hover:opacity-100 cursor-pointer" onclick="openTodoForm(${t.id})">
                    <input type="checkbox" checked onclick="event.stopPropagation(); toggleTodo(${t.id}, false)" class="mt-1 w-4 h-4 rounded">
                    <div class="flex-1">
                      <div class="font-medium text-slate-600 line-through text-sm">${t.title}</div>
                      <div class="text-xs text-slate-400 mt-1">Completed ${fmt.relative(t.completed_at)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `}
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

async function toggleTodo(id, completed) {
  try {
    const all = await api('/todos');
    const todo = all.find(t => t.id === id);
    if (!todo) return;
    await api(`/todos/${id}`, { method: 'PUT', body: JSON.stringify({ ...todo, status: completed ? 'completed' : 'pending' }) });
    renderTodos(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function openTodoForm(todoId = null, clientId = null) {
  let todo = {
    title: '', description: '', due_date: '', priority: 'medium', status: 'pending', category: '', client_id: clientId || ''
  };
  if (todoId) {
    const all = await api('/todos');
    todo = all.find(t => t.id === todoId);
  }
  const clients = await api('/clients');

  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800">${todoId ? 'Edit' : 'New'} Task</h2>
          <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="todoForm" onsubmit="saveTodo(event, ${todoId || 'null'})" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input name="title" required value="${todo.title || ''}" placeholder="What needs to be done?" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">${todo.description || ''}</textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input name="due_date" type="date" value="${todo.due_date ? todo.due_date.split('T')[0] : ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select name="priority" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in-progress" ${todo.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input name="category" value="${todo.category || ''}" placeholder="e.g., Proposal, Follow-up" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Related Client</label>
            <select name="client_id" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">None</option>
              ${clients.map(c => `<option value="${c.id}" ${c.id == todo.client_id ? 'selected' : ''}>${c.name}${c.company ? ' - ' + c.company : ''}</option>`).join('')}
            </select>
          </div>
          <div class="flex justify-between gap-2 pt-4 border-t border-slate-100">
            ${todoId ? `<button type="button" onclick="deleteTodo(${todoId})" class="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg">Delete</button>` : '<div></div>'}
            <div class="flex gap-2">
              <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">Save Task</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveTodo(e, todoId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  if (data.client_id) data.client_id = parseInt(data.client_id);
  else data.client_id = null;
  try {
    if (todoId) {
      await api(`/todos/${todoId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('Task updated');
    } else {
      await api('/todos', { method: 'POST', body: JSON.stringify(data) });
      toast('Task created');
    }
    closeModal();
    if (App.currentPage === 'todos') renderTodos(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

async function deleteTodo(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api(`/todos/${id}`, { method: 'DELETE' });
    toast('Task deleted');
    closeModal();
    if (App.currentPage === 'todos') renderTodos(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

// ============ TEAM (Admin only) ============
async function renderTeam(el) {
  try {
    const users = await api('/users');
    const teamStats = await api('/stats/team');
    el.innerHTML = `
      <div class="fade-in">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-slate-800">Team Management</h1>
            <p class="text-slate-500 mt-1">${users.length} team members</p>
          </div>
          <button onclick="openUserForm()" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Member
          </button>
        </div>

        <!-- TEAM PERFORMANCE -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 class="text-lg font-bold text-slate-800 mb-4">Performance Overview (Last 30 Days)</h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="text-left py-2 font-semibold">Member</th>
                  <th class="text-center py-2 font-semibold">Clients</th>
                  <th class="text-center py-2 font-semibold">Calls (30d)</th>
                  <th class="text-center py-2 font-semibold">Meetings (30d)</th>
                  <th class="text-center py-2 font-semibold">Completed</th>
                  <th class="text-center py-2 font-semibold">Call Min</th>
                  <th class="text-right py-2 font-semibold">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                ${teamStats.map(m => `
                  <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${m.avatar_color}">${fmt.initials(m.full_name)}</div>
                        <div>
                          <div class="font-semibold text-slate-800">${m.full_name}</div>
                          <div class="text-xs text-slate-400">${m.active_clients} active</div>
                        </div>
                      </div>
                    </td>
                    <td class="text-center py-3 font-semibold text-slate-700">${m.total_clients}</td>
                    <td class="text-center py-3 text-slate-700">${m.calls_30d}</td>
                    <td class="text-center py-3 text-slate-700">${m.meetings_30d}</td>
                    <td class="text-center py-3"><span class="badge badge-completed">${m.completed_meetings}</span></td>
                    <td class="text-center py-3 text-slate-700">${m.call_minutes_30d}m</td>
                    <td class="text-right py-3 font-bold text-emerald-600">${fmt.money(m.pipeline_value)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- TEAM MEMBERS CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${users.map(u => `
            <div class="bg-white rounded-xl border border-slate-200 p-5 card-hover">
              <div class="flex items-start gap-3 mb-4">
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg" style="background:${u.avatar_color}">${fmt.initials(u.full_name)}</div>
                <div class="flex-1">
                  <div class="font-bold text-slate-800 text-lg">${u.full_name}</div>
                  <div class="text-sm text-slate-500">@${u.username}</div>
                  <span class="inline-block mt-1 text-xs px-2 py-0.5 ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} rounded font-medium uppercase">${u.role}</span>
                </div>
                <span class="badge ${u.status === 'active' ? 'badge-active' : 'badge-inactive'}">${u.status}</span>
              </div>
              <div class="space-y-1 text-sm text-slate-600 mb-4">
                ${u.email ? `<div class="flex items-center gap-2"><svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${u.email}</div>` : ''}
                ${u.phone ? `<div class="flex items-center gap-2"><svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${u.phone}</div>` : ''}
              </div>
              <div class="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
                <div>
                  <div class="text-2xl font-bold text-slate-800">${u.client_count}</div>
                  <div class="text-xs text-slate-500">Clients</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-slate-800">${u.call_count}</div>
                  <div class="text-xs text-slate-500">Calls</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-slate-800">${u.meeting_count}</div>
                  <div class="text-xs text-slate-500">Meetings</div>
                </div>
              </div>
              <button onclick="openUserForm(${u.id})" class="mt-4 w-full text-sm text-slate-600 hover:bg-slate-100 py-2 rounded-lg">Edit Member</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

async function openUserForm(userId = null) {
  let user = { username: '', full_name: '', email: '', phone: '', role: 'sales', avatar_color: '#6366f1', status: 'active' };
  if (userId) {
    const users = await api('/users');
    user = users.find(u => u.id === userId);
    delete user.password;
  }
  const modal = document.getElementById('modalContainer');
  modal.innerHTML = `
    <div class="fixed inset-0 modal-backdrop z-40 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800">${userId ? 'Edit' : 'Add'} Team Member</h2>
          <button onclick="closeModal()" class="p-2 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="userForm" onsubmit="saveUser(event, ${userId || 'null'})" class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Username *</label>
              <input name="username" required ${userId ? 'readonly' : ''} value="${user.username || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${userId ? 'bg-slate-100' : ''}">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">${userId ? 'New Password (optional)' : 'Password *'}</label>
              <input name="password" type="password" ${userId ? '' : 'required'} class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="${userId ? 'Leave blank to keep current' : ''}">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input name="full_name" required value="${user.full_name || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input name="email" type="email" value="${user.email || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input name="phone" value="${user.phone || ''}" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select name="role" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="sales" ${user.role === 'sales' ? 'selected' : ''}>Sales</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Avatar Color</label>
              <div class="flex gap-2 flex-wrap">
                ${['#ef4444','#10b981','#3b82f6','#8b5cf6','#f59e0b','#6366f1','#ec4899','#14b8a6'].map(c => `
                  <label class="cursor-pointer">
                    <input type="radio" name="avatar_color" value="${c}" ${user.avatar_color === c ? 'checked' : ''} class="sr-only peer">
                    <div class="w-8 h-8 rounded-full peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-brand-500" style="background:${c}"></div>
                  </label>
                `).join('')}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium">${userId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveUser(e, userId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd);
  if (!data.password) delete data.password;
  try {
    if (userId) {
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('User updated');
    } else {
      if (!data.password) { toast('Password required', 'error'); return; }
      await api('/users', { method: 'POST', body: JSON.stringify(data) });
      toast('User created');
    }
    closeModal();
    if (App.currentPage === 'team') renderTeam(document.getElementById('pageContent'));
  } catch(err) { toast(err.message, 'error'); }
}

// ============ ANALYTICS (Admin) ============
async function renderAnalytics(el) {
  try {
    const stats = await api('/stats/dashboard');
    const team = await api('/stats/team');
    el.innerHTML = `
      <div class="fade-in">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-slate-800">Analytics & Reports</h1>
          <p class="text-slate-500 mt-1">Team performance insights</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-white rounded-xl border border-slate-200 p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Top Performers by Pipeline</h3>
            ${renderTopPerformers(team)}
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Calls Activity (Last 7 Days)</h3>
            ${renderCallsChart(stats.callsByDay)}
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-6">
          <h3 class="text-lg font-bold text-slate-800 mb-4">Team Comparison</h3>
          ${renderTeamBarChart(team)}
        </div>
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

function renderTopPerformers(team) {
  const sorted = [...team].sort((a,b) => b.pipeline_value - a.pipeline_value);
  const max = Math.max(...sorted.map(t => t.pipeline_value), 1);
  return `
    <div class="space-y-3">
      ${sorted.map((m, i) => `
        <div class="flex items-center gap-3">
          <div class="w-8 text-center font-bold text-slate-400">#${i+1}</div>
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${m.avatar_color}">${fmt.initials(m.full_name)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-800 text-sm">${m.full_name}</div>
            <div class="bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style="width:${(m.pipeline_value/max)*100}%"></div>
            </div>
          </div>
          <div class="text-sm font-bold text-emerald-600">${fmt.money(m.pipeline_value)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTeamBarChart(team) {
  const metrics = [
    { key: 'calls_30d', label: 'Calls (30d)', color: 'from-blue-500 to-cyan-500' },
    { key: 'meetings_30d', label: 'Meetings (30d)', color: 'from-purple-500 to-pink-500' },
    { key: 'todos_completed_30d', label: 'Tasks Done', color: 'from-orange-500 to-red-500' },
  ];
  return `
    <div class="space-y-6">
      ${metrics.map(metric => {
        const max = Math.max(...team.map(t => t[metric.key] || 0), 1);
        return `
          <div>
            <h4 class="font-semibold text-slate-700 mb-2 text-sm">${metric.label}</h4>
            <div class="space-y-2">
              ${team.map(m => `
                <div class="flex items-center gap-3">
                  <div class="w-32 text-sm text-slate-700 truncate">${m.full_name}</div>
                  <div class="flex-1 bg-slate-100 rounded h-6 relative overflow-hidden">
                    <div class="absolute inset-y-0 left-0 bg-gradient-to-r ${metric.color} rounded flex items-center justify-end pr-2 text-xs text-white font-bold" style="width:${((m[metric.key] || 0)/max)*100}%">
                      ${m[metric.key] || 0}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============ ACTIVITY (Admin) ============
async function renderActivity(el) {
  try {
    const activities = await api('/activities');
    el.innerHTML = `
      <div class="fade-in">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-slate-800">Activity Log</h1>
          <p class="text-slate-500 mt-1">Recent team activities</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-6">
          ${activities.length === 0 ? '<p class="text-slate-400 text-center py-8">No activity yet</p>' :
            `<div class="space-y-3">
              ${activities.map(a => `
                <div class="flex items-start gap-3 py-2">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${a.avatar_color}">${fmt.initials(a.user_name)}</div>
                  <div class="flex-1">
                    <div class="text-sm"><span class="font-semibold text-slate-800">${a.user_name}</span> <span class="text-slate-600">${a.description}</span></div>
                    <div class="text-xs text-slate-400 mt-0.5">${fmt.relative(a.created_at)} · ${fmt.dateTime(a.created_at)}</div>
                  </div>
                </div>
              `).join('')}
            </div>`
          }
        </div>
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div class="text-center py-12 text-red-500">Error: ${err.message}</div>`;
  }
}

// ============ MODAL ============
function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

// ============ EVENT LISTENERS ============
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.querySelectorAll('.nav-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  applyTheme();

