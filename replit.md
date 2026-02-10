# BugFlow - Bug Tracking & Feature Request App

## Overview
BugFlow is a bug tracking and feature request application with three user roles (user, dev, admin). Users register before logging tickets and can submit bugs/feature requests for specific applications. The system supports ticket assignment, internal notes (admin/dev only), file attachments, and email notifications via SendGrid. Admins can manage users, configure email settings, assign tickets to devs, and view email logs.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Passport.js (local strategy), Express Session
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Local registration/login with scrypt password hashing
- **Email**: SendGrid integration (with optional custom SMTP override)
- **File Uploads**: Multer for image attachments (PNG/JPG/WebP, max 10MB)

## Project Structure
```
client/src/
  App.tsx              - Main app with routing, auth, sidebar layout
  lib/auth.tsx         - Auth context provider with login/register/logout
  lib/queryClient.ts   - TanStack Query setup
  components/
    app-sidebar.tsx    - Navigation sidebar with role-based menu (user/dev/admin)
    theme-provider.tsx - Dark/light mode
    theme-toggle.tsx   - Theme toggle button
    ticket-card.tsx    - Ticket card component with app badge, assignment display
  pages/
    auth-page.tsx      - Login/Register page (includes name field)
    dashboard.tsx      - User dashboard with ticket list, filters (type/status/app)
    create-ticket.tsx  - New ticket form with app dropdown
    ticket-detail.tsx  - Ticket detail with comments, attachments, history timeline, assignment, internal notes
    admin-panel.tsx    - Admin/Dev ticket management table with filters
    admin-users.tsx    - Admin user management (role assignment)
    admin-settings.tsx - Admin settings (SMTP config + admin recipients)
    admin-email-log.tsx - Admin email log viewer
server/
  index.ts             - Express server setup
  routes.ts            - API routes (tickets, comments, attachments, admin, settings)
  storage.ts           - Database storage layer
  auth.ts              - Passport auth setup
  db.ts                - Database connection
  seed.ts              - Seed data (bugadmin, taxiadmin, admin, sarah_dev, mike_tester)
  email.ts             - Email notification system (SendGrid + optional SMTP)
shared/
  schema.ts            - Drizzle schema, Zod validation, type exports
```

## Database Schema
- **users**: id, username, email, password, name, role (user/dev/admin), isActive, createdAt, updatedAt
- **tickets**: id, title, description, type (bug/feature_request), app (dispatch/driver_app/admin_panel/passenger_app/website/other), status (open/in_progress/waiting_on_user/resolved/closed/rejected), priority, userId, assignedToUserId, assignedToName, createdAt, updatedAt
- **comments**: id, ticketId, userId, content, isStatusChange, isInternal, createdAt
- **attachments**: id, ticketId, uploadedByUserId, originalName, storedPath, mimeType, size, createdAt
- **ticket_history**: id, ticketId, actorUserId, actorName, kind (CREATED/STATUS_CHANGED/ASSIGNED/PUBLIC_NOTE/INTERNAL_NOTE/ATTACHMENT_ADDED), oldValue, newValue, message, createdAt
- **email_logs**: id, ticketId, toAddresses, subject, body, status (queued/sent/failed), error, sentAt, createdAt
- **settings**: id (singleton), smtpEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFromName, smtpFromEmail, adminRecipients, updatedAt

## API Endpoints
### Auth
- `POST /api/auth/register` - Register new user (username, email, password, name)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Tickets
- `GET /api/tickets` - Get user's tickets (or assigned tickets for dev role)
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create ticket (includes app field)
- `PATCH /api/tickets/:id/status` - Update ticket status (admin/dev only)
- `PATCH /api/tickets/:id/assign` - Assign ticket to user (admin only)
- `GET /api/tickets/:id/comments` - Get ticket comments (filters internal for non-admin/dev)
- `POST /api/tickets/:id/comments` - Add comment (supports isInternal flag)
- `GET /api/tickets/:id/attachments` - Get ticket attachments
- `POST /api/tickets/:id/attachments` - Upload attachments (multipart, max 10 files)
- `GET /api/attachments/:id/download` - Download attachment file
- `GET /api/tickets/:id/history` - Get ticket activity history

### Admin
- `GET /api/admin/tickets` - Get all tickets with user info (admin/dev only)
- `GET /api/admin/users` - Get all users (admin only)
- `PATCH /api/admin/users/:id/role` - Update user role (admin only)
- `GET /api/admin/devs` - Get users with dev/admin role (admin/dev only)
- `GET /api/admin/settings` - Get app settings (admin only)
- `PUT /api/admin/settings` - Update app settings (admin only)
- `POST /api/admin/settings/test-email` - Send test email (admin only)
- `GET /api/admin/email-logs` - Get email logs (admin only)

## User Roles
- **user**: Can create tickets, view own tickets, add comments, upload attachments
- **dev**: Can view assigned tickets + all tickets via admin panel, update ticket status, add internal notes
- **admin**: Full access - manage users, assign tickets, configure settings, view email logs

## Seed Accounts
- Admin: `bugadmin` / `Polopolo1211`
- Admin: `taxiadmin` / `Polopolo133`
- Admin: `admin` / `admin123`
- Dev: `sarah_dev` / `dev123`
- User: `mike_tester` / `user123`

## Application Options
- Dispatch, Driver App, Admin Panel, Passenger App, Website, Other

## Recent Changes
- 2026-02-10: Enhanced to 3-role system (user/dev/admin), added app field, assignment, internal notes, attachments, history timeline, email logging, admin settings page, user management page, email log viewer
