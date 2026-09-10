# SkillPass Africa

SkillPass Africa is a digital skills passport that helps young people prove practical abilities and connect with mentors and employers.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key.
3. Run `supabase/migrations/202609100001_foundation.sql` in the Supabase SQL editor (or use `supabase db push` in a linked project).
4. In Supabase Authentication, add `http://localhost:3000/auth/callback` as an allowed redirect URL.
5. Start the app with `npm run dev`.

## Authentication and access

- Email/password registration, email verification, login, logout, and password reset use Supabase Auth.
- New accounts receive a profile and one of three self-service roles: learner, mentor/verifier, or employer. Administrator access is deliberately not self-service and must be assigned by an existing administrator in the database.
- Route checks send signed-in users only to their role dashboard. Database Row Level Security limits ordinary users to their own profile; administrators can manage all profiles.
- Avatar uploads are restricted to the authenticated user's folder and to JPG, PNG, or WebP files up to 2 MB.

## Quality checks

Run `npm run check` for linting and type checking, and `npm run build` for a production build.

Never commit `.env.local` or service-role keys. The browser and server clients in this project use only the publishable anon key; authorization is enforced by RLS.
