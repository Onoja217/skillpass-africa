# SkillPass Africa

**Prove your skills. Unlock opportunities.**

SkillPass Africa is a digital skills passport for young Africans to prove practical abilities, build verified portfolios, and connect with mentors, internships, apprenticeships, and employment opportunities.

## What SkillPass Africa does

SkillPass Africa turns practical learning into verifiable evidence. Learners can discover skills, complete practical assessments, submit evidence, receive mentor verification, and build a portfolio that can be shared publicly.

### Current capabilities

- **Skills catalogue** across Technology, Design, Fashion, Repairs, Business, Media, and Agriculture.
- **Practical assessments** designed around demonstrable skills rather than theory alone.
- **Evidence submissions** supporting written responses, project links, video links, and secure evidence files.
- **Submission workflow** with draft, submitted, under review, revision requested, verified, and rejected states.
- **Mentor review workspace** for reviewing learner submissions and recording verification decisions, competency ratings, and feedback.
- **Mentor verification** restricted to approved mentors through server-side authorization and Supabase RLS.
- **Verified portfolios** showing learner achievements and portfolio completion progress.
- **Public skill verification** with unique verification IDs such as `SP-XXXXXXXX`.
- **QR-based verification** linking directly to a public verification page.
- **Verification status management** supporting active, revoked, and suspended verification records.
- **Verification audit logs** for tracking verification activity.
- **Role-based dashboards** for learners, mentors, employers, and administrators.
- **Secure evidence storage** using a private Supabase Storage bucket with database and storage policies.

## Roles

- **Learner** — discovers skills, completes assessments, submits evidence, and builds a portfolio.
- **Mentor / Verifier** — reviews learner evidence and verifies demonstrated skills.
- **Employer** — accesses the platform for skills and talent discovery as employer functionality develops.
- **Administrator** — manages users, verification workflows, and platform operations.

Administrator access is not self-service and must be assigned through the application's authorized administrative workflow.

## Technology stack

- **Next.js + TypeScript** — web application, routing, server-side actions, and application logic.
- **Supabase Auth** — authentication, email verification, password recovery, and sessions.
- **Supabase PostgreSQL** — application database and source of truth for profiles, categories, skills, assessments, submissions, verifications, and portfolios.
- **Supabase Row Level Security (RLS)** — database-level authorization and access control.
- **Supabase Storage** — private storage for learner submission evidence.
- **QR verification** — public verification links generated from unique verification IDs.

The project does not use a separate Python/FastAPI database backend. Application data access remains within the Next.js/Supabase architecture unless a new backend is deliberately introduced and documented.

## Core architecture

The platform uses a single canonical submission domain:

`profiles → categories → skills → assessments → submissions → submission evidence → portfolio items → skill verifications`

Mentor verification operates on the existing `submissions` model rather than maintaining a second learner-submission system. Verification records are uniquely associated with submissions and include verification decisions, competency ratings, feedback, public verification IDs, status, and audit history.

Public verification exposes only non-sensitive verification information. Private learner evidence remains protected by Supabase authorization policies.

## Authentication and access

- Email/password registration, email verification, login, logout, and password reset use Supabase Auth.
- Route checks send signed-in users to the appropriate role dashboard.
- Database Row Level Security limits ordinary users to authorized records and prevents unauthorized verification creation.
- Only approved mentors can create mentor verification records.
- Learners cannot create verification records.
- Administrative actions are protected by role-based authorization.
- Avatar uploads are restricted to the authenticated user's folder and to JPG, PNG, or WebP files up to 2 MB.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Add the required Supabase project URL and publishable/anon key to `.env.local`.

4. Run the migrations in `supabase/migrations/` in order, or use:

   ```bash
   supabase db push
   ```

   when working with a linked Supabase project.

5. In Supabase Authentication, add the local callback URL:

   ```text
   http://localhost:3000/auth/callback
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

## Quality checks

Run linting and TypeScript checks with:

```bash
npm run check
```

Run the production build with:

```bash
npm run build
```

The mentor verification and QR verification work was merged into `main` after the final CI pipeline passed linting, type checking, and the production build.

## Security

Security is enforced at both the application and database layers.

- Keep learner evidence in the private `submission-evidence` Supabase Storage bucket.
- Use RLS policies for profiles, submissions, evidence, portfolios, and verification records.
- Never commit `.env.local`, Supabase service-role keys, API keys, passwords, or other secrets.
- Browser and server clients should use the publishable/anon key; privileged operations must be protected server-side and by database policies.
- Public verification pages must expose only information intended for public verification.

## Project status

SkillPass Africa is actively under development. The current foundation includes the learner skills and assessment workflow, secure evidence submissions, verified portfolios, mentor verification, public QR-based skill verification, role-based dashboards, and audit logging.

Upcoming platform areas include deeper employer workflows, opportunity matching, and additional career support features.

## Development workflow

Contributors should:

1. Work from a dedicated issue and feature branch.
2. Keep the shared Supabase schema and TypeScript types aligned before building dependent modules.
3. Open a pull request before merging changes into `main`.
4. Include testing instructions and relevant screenshots for UI changes.
5. Document new database tables, migrations, environment variables, and security policies.
6. Never commit secrets or credentials.
7. Avoid creating duplicate sources of truth when an existing domain model already supports the feature.

## License

This project is currently under active development. Licensing and contribution terms will be documented as the project moves toward wider release.
