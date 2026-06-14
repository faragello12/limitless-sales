# 🚀 Limitless Sales Management System

A complete sales management system built for **Limitless Marketing Company** with role-based access control, real-time dashboards, and full CRUD operations for clients, calls, meetings, and to-do lists.

## ✨ Features

### 👥 Two User Roles
- **Admin (Manager)**: Sees everything across the team — all clients, calls, meetings, performance metrics, analytics
- **Sales Executive**: Sees only their own clients, calls, meetings, and tasks

### 📊 Dashboards
- **Admin Dashboard**: Team performance, total pipeline, recent activity across the company
- **Sales Dashboard**: Personal stats, upcoming meetings, pending tasks, recent calls
- **Analytics Page**: Top performers, team comparisons, charts

### 👤 Clients Management
- Full CRUD with search and filtering by status
- Client Brief (internal): Budget, Goals, Target Audience, Services, Challenges, Competitors, Internal Notes
- Each client shows: contacts, calls history, meetings history, tasks history

### 📞 Calls Tracking
- Log calls with date, duration, type (outbound/inbound/follow-up), outcome
- Notes and next follow-up date
- Filter by client and date

### 🤝 Meetings with MOM
- Schedule meetings with title, date, location, type
- **Minutes of Meeting (MOM)**: Discussion, decisions made, action items
- Status: Scheduled / Completed / Cancelled
- Next meeting date tracking

### ✅ To-do Lists
- Priority-based organization (High/Medium/Low)
- Categories (Proposal, Follow-up, Research, etc.)
- Due dates with overdue indicators
- Link to specific clients

### 👨‍💼 Team Management (Admin)
- View all team members
- Performance metrics per rep (clients, calls, meetings, pipeline value)
- Add/edit team members
- Activity log

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd limitless-sales
npm install
```

### 2. Seed Sample Data
```bash
npm run seed
```

### 3. Start Server
```bash
npm start
```

### 4. Open Browser
Navigate to **http://localhost:3000**

## 🔑 Login Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `Limitless@Admin2026!` |
| **Sales** | `sara` | `Sales@2026$` |
| **Sales** | `omar` | `Sales@2026$` |
| **Sales** | `lina` | `Sales@2026$` |
| **Sales** | `mahmoud` | `Sales@2026$` |

## 📁 Project Structure

```
limitless-sales/
├── server.js                  # Express server + all API routes
├── package.json
├── .env                       # Environment variables
├── database/
│   ├── db.js                  # SQLite database setup + schema
│   ├── seed.js                # Sample data
│   └── limitless.db           # Database file (auto-created)
├── middleware/
│   └── auth.js                # JWT authentication
└── public/
    ├── index.html             # SPA shell
    ├── styles.css             # Custom styles
    └── app.js                 # Frontend application
```

## 🔌 Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcryptjs
- **Frontend**: Vanilla JS + Tailwind CSS (CDN) + Chart-free custom CSS charts
- **No build step** — runs directly!

## 📊 Database Schema

- **users**: Authentication + profile (admin/sales roles)
- **clients**: Company contacts with status pipeline
- **client_briefs**: Internal client documentation
- **calls**: Call logs with outcomes
- **meetings**: Meeting schedule + MOM
- **todos**: Task management
- **activities**: Activity audit log

## 🔒 Security Features

- Password hashing with bcrypt
- JWT tokens (7-day expiry)
- Role-based access control (admin vs sales)
- Sales users can ONLY see/modify their own data
- Admin can update user profiles and reset passwords via the admin panel
- To change any user password, use the Admin > Team page and edit the member account
- CORS is restricted via `ALLOWED_ORIGIN`
- HTTP headers hardened with Helmet
- Strong admin password by default in seed script

## 🌐 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Clients
- `GET /api/clients` - List (filtered by role)
- `GET /api/clients/:id` - Detail with calls/meetings/todos
- `POST /api/clients` - Create
- `PUT /api/clients/:id` - Update
- `GET /api/clients/:id/brief` - Get client brief
- `PUT /api/clients/:id/brief` - Save client brief

### Calls
- `GET /api/calls` - List
- `POST /api/calls` - Log call
- `PUT /api/calls/:id` - Update
- `DELETE /api/calls/:id` - Delete

### Meetings
- `GET /api/meetings` - List
- `POST /api/meetings` - Schedule
- `PUT /api/meetings/:id` - Update (incl. MOM)
- `DELETE /api/meetings/:id` - Delete

### Todos
- `GET /api/todos` - List
- `POST /api/todos` - Create
- `PUT /api/todos/:id` - Update
- `DELETE /api/todos/:id` - Delete

### Stats
- `GET /api/stats/dashboard` - Dashboard data
- `GET /api/stats/team` - Team performance (admin)
- `GET /api/activities` - Activity log (admin)

### Users (Admin only)
- `GET /api/users` - List all
- `POST /api/users` - Create
- `PUT /api/users/:id` - Update

## 📝 Notes for Production

Before deploying to production:
1. Set `JWT_SECRET` in `.env`
2. Use a proper database (PostgreSQL or managed SQL recommended)
3. Add HTTPS and a secure deployment platform
4. Set `ALLOWED_ORIGIN` to your app domain
5. Add rate limiting and monitoring
6. Use environment-specific configuration

### Vercel Deployment Notes
- This app is a Node/Express server and can be deployed on platforms that support custom servers.
- **SQLite is not ideal on Vercel** because the filesystem is ephemeral; data will not persist between deployments.
- For Vercel, use a hosted database service and update the app to connect to it instead of local SQLite.

## 🎯 Built For Limitless

This system is purpose-built for marketing sales teams with:
- ✅ Pipeline value tracking
- ✅ MOM (Minutes of Meeting) recording
- ✅ Client brief management
- ✅ Role-based visibility
- ✅ Performance analytics
- ✅ Mobile responsive design
