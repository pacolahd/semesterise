# Semesterise

Semesterise is an integrated academic management platform that streamlines degree audits, petition processes, and learning analytics for Ashesi University.

## Project Overview

Semesterise addresses key challenges in academic management at Ashesi University:

- **Degree Auditing**: Automatically tracks student progress toward graduation requirements
- **Petition Processing**: Streamlines submission, tracking, and approval of academic petitions
- **Learning Analytics**: Integrates with Canvas LMS to provide insights into student performance

## Features

### For Students
- **Dual-View Academic Planning**
  - Semester timeline view for chronological planning
  - Degree requirements view for category-based tracking
  - Synchronized data between both views
- **Transcript Import**
  - One-click import from CAMU transcript PDFs
  - Automatic course categorization
  - Verified academic history
- **Smart Course Planning**
  - Drag-and-drop course rescheduling
  - Prerequisite enforcement
  - Workload balancing recommendations
  - Automatic retake scheduling
- **Petition Management**
  - Streamlined submission for seven petition types
  - Real-time status tracking
  - Integrated messaging with administrators
  - Academic plan integration
- **Learning Analytics** (Future)
  - Canvas LMS integration
  - Performance tracking and visualization
  - Personalized recommendations

### For Administrators
- **Automated Degree Auditing**
  - Cohort-specific requirement verification
  - Grade requirement validation
  - Comprehensive progress reporting
- **Efficient Petition Processing**
  - Hierarchical approval workflow
  - Role-based access control
  - Internal discussion capability
  - Document management
- **Reporting & Analytics**
  - Batch export of petition records
  - Academic progress statistics
  - Comprehensive audit trails

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: BetterAuth
- **API Integrations**: Canvas LMS, Custom APIs for PDF, HTML and MHTML Data Extraction

## Prerequisites

- Node.js 18.x or later
- PostgreSQL 15.x or later
- npm 9.x or later

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/semesterise.git
cd semesterise
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env.local` with your configuration values.

4. Set up the database:
```bash
# Generate schema
npx @better-auth/cli generate

# Run migrations
npx @better-auth/cli migrate
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environmental Variables

```
# Database
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>

# BetterAuth
BETTER_AUTH_SECRET=<your-secret-key>
BETTER_AUTH_URL=http://localhost:3000

# Canvas API (optional)
CANVAS_API_URL=https://<your-canvas-instance>.instructure.com/api/v1
```

## Development

### Database Schema

Semesterise uses a PostgreSQL database with the following core tables:

- **Academic Structure**: departments, majors, courses, etc.
- **Degree Requirements**: categories, requirements, grade requirements
- **Student Records**: profiles, courses, semester mappings
- **Petition System**: petitions, workflow steps, messages
- **Auth**: BetterAuth tables (user, session, account, verification)


### Project Structure (for now)

```
semesterise/
├── src/
│   ├── app/            # Application routes
│   ├── components/     # Reusable UI components
│   ├── env/            # .env configuration with t3 env
│   ├── fonts/          # Custom fonts (Satoshi)
│   ├── hooks/          # Hooks
│   ├── lib/            # Utility functions
├── public/             # Static assets
```

### Core Modules

1. **Degree Auditing**
  - Transcript import and processing
  - Requirement verification
  - Progress tracking
  - Academic warning generation

2. **Petition Processing**
  - Form generation from JSON configuration
  - Workflow management
  - Notification system
  - Document handling

3. **Authentication & Authorization**
  - Role-based access control
  - Student and staff profiles
  - Session management

4. **Learning Analytics** (Future)
  - Canvas data synchronization
  - Performance visualization
  - Recommendation engine

### Design System

Semesterise has a comprehensive design system with:

**Color Palettes**
- Primary: Used for main actions and branding
- Surface: Background and container colors
- Text: Various text colors for proper hierarchy
- Feedback: Success, warning, danger, and info colors

**Typography**
- Satoshi as primary font family
- Consistent text styles with 6 heading levels
- Body text in 3 sizes (large, base, small)

**Components**
- Built on shadcn/ui primitives
- Custom components for academic-specific features
- Responsive design for all screen sizes

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Database Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```


### Coding Standards

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Ashesi University](https://www.ashesi.edu.gh/) for collaboration and support
- [Next.js](https://nextjs.org/) for the application framework
- [shadcn/ui](https://ui.shadcn.com/) for the component foundation
- [Drizzle ORM](https://orm.drizzle.team/) for database access
- [BetterAuth](https://betterauth.io/) for authentication

## Team

- Ryan Tangu Mbun Tangwe - Everything from Ideation to Production😊

## Contact

For questions or support, please contact [mbuntangwe@gmail.com](mailto:mbuntangwe@gmail.com).