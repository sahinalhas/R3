# Rehberlik Servisi (School Guidance Service) Application

## Overview
This is a full-stack school guidance service management application built with React, TypeScript, Express, and SQLite. It helps school counselors manage student appointments, counseling sessions, and academic planning.

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: SQLite with Drizzle ORM
- **UI Components**: Radix UI components with custom styling
- **Authentication**: Session-based with Passport.js

## Recent Changes (September 21, 2025)
- ✅ Imported project from GitHub
- ✅ Fixed Drizzle configuration from PostgreSQL to SQLite
- ✅ Initialized database with existing schema and tables
- ✅ Set up development workflow on port 5000
- ✅ Verified frontend and backend integration
- ✅ Configured deployment settings for production

## Key Features
- Student management and records
- Appointment scheduling and tracking
- Counseling session documentation
- Class hour management
- Study planning and progress tracking
- School information management
- User authentication and authorization

## Database Schema
The application uses SQLite with the following main tables:
- `users` - System users (counselors, admin)
- `students` - Student records
- `appointments` - Scheduled appointments
- `counseling_sessions` - Detailed counseling records
- `class_hours` - School schedule management
- `courses` and `course_subjects` - Academic planning
- `study_plans` and `subject_progress` - Study tracking

## Development Setup
- **Development server**: `npm run dev` (runs on port 5000)
- **Build**: `npm run build`
- **Production**: `npm start`
- **Database**: SQLite file at `data/rehberlik.db`

## Authentication
- Default admin credentials: username `admin`, password `admin123`
- Session-based authentication with secure password hashing

## Deployment Configuration
- Target: VM (maintains server state)
- Build command: `npm run build`
- Start command: `npm start`
- Port: 5000 (configured for Replit environment)

## Technical Notes
- Server configured with `allowedHosts: true` for Replit proxy compatibility
- Both frontend and backend served from single Express server
- Vite dev server integrated with Express in development mode
- SQLite database with proper table initialization