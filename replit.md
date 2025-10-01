# Rehberlik Servisi (School Guidance Service) Application

## Overview
This is a full-stack school guidance service management application built with React, TypeScript, Express, and SQLite. It helps school counselors manage student appointments, counseling sessions, and academic planning.

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: SQLite with Drizzle ORM
- **UI Components**: Radix UI components with custom styling
- **Authentication**: Session-based with Passport.js

## Recent Changes (October 1, 2025)
- ✅ Fixed course subjects (topics) management system
- ✅ Updated duration labels from "lesson hours" to "minutes" throughout the application
- ✅ Updated CourseSubjectsManager component to display "dakika" (minutes) instead of "ders saati" (lesson hours)
- ✅ Fixed critical routing issue: legacy routes in server/routes.ts weren't being registered
- ✅ Implemented dual route registration system to support both legacy and modular routes
- ✅ Added authentication middleware to course-subjects POST endpoint
- ✅ Verified course subject creation works end-to-end with API testing

## Previous Changes (September 30, 2025)
- ✅ Successfully imported project from GitHub to Replit
- ✅ Fixed missing nanoid dependency in package.json
- ✅ Configured development workflow with proper webview output on port 5000
- ✅ Verified frontend renders correctly with Vite HMR working
- ✅ Confirmed backend API is responding properly
- ✅ Set up VM deployment configuration for production
- ✅ Validated SQLite database is accessible and properly configured
- ✅ Ensured server allows all hosts for Replit proxy compatibility

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
- **Architecture Note**: Currently using dual routing system (legacy server/routes.ts and modular routes/index.ts) - consider consolidating in future to avoid duplicate route definitions