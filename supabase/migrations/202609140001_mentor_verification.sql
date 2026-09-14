create type public.mentor_status as enum (
  'pending',
  'approved',
  'suspended',
  'revoked'
);

alter table public.profiles
add column mentor_status public.mentor_status;
