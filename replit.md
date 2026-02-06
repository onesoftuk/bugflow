# BugFlow - Bug Tracking & Feature Request App

## Overview
BugFlow is a bug tracking and feature request application with two user roles (admin and user). Users can register, log bugs and feature requests, and receive notifications about status changes. Admins can update ticket statuses.

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TanStack Query, Wouter, Shadcn UI, Tailwind CSS
- **Backend**: Express.js, Passport.js (local strategy), Express Session
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Local registration/login with scrypt password hashing

## Project Structure
```
client/src/
  App.tsx              - Main app with routing, auth, sidebar layout
  lib/auth.tsx         - Auth context provider with login/register/logout
  lib/queryClient.ts   - TanStack Query setup
  components/
    app-sidebar.tsx    - Navigation sidebar with role-based menu
    theme-provider.tsx - Dark/light mode
    theme-toggle.tsx   - Theme toggle button
    ticket-card.tsx    - Ticket card component
  pages/
    auth-page.tsx      - Login/Register page
    dashboard.tsx      - User dashboard with ticket list
    create-ticket.tsx  - New ticket form
    ticket-detail.tsx  - Ticket detail with comments
    admin-panel.tsx    - Admin ticket management table
server/
  index.ts             - Express server setup
  routes.ts            - API routes
  storage.ts           - Database storage layer
  auth.ts              - Passport auth setup
  db.ts                - Database connection
  seed.ts              - Seed data
shared/
  schema.ts            - Drizzle schema, Zod validation
```

## Database Schema
- **users**: id, username, email, password, role (user/admin)
- **tickets**: id, title, description, type (bug/feature_request), status, priority, userId, createdAt, updatedAt
- **comments**: id, ticketId, userId, content, isStatusChange, createdAt

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/tickets` - Get user's tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id/status` - Update ticket status (admin only)
- `GET /api/tickets/:id/comments` - Get ticket comments
- `POST /api/tickets/:id/comments` - Add comment
- `GET /api/admin/tickets` - Get all tickets with user info (admin only)

## Seed Accounts
- Admin: username `admin`, password `admin123`
- Users: `sarah_dev` and `mike_tester`, password `user123`

## Recent Changes
- Initial build: Full-stack bug tracking app with auth, tickets, comments, admin panel
- Email notifications: Placeholder (console.log) ready for SendGrid integration
