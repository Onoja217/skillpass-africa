create type public.verification_status as enum (
  'active',
  'revoked',
  'suspended'
);

alter table public.skill_verifications
add column verification_status public.verification_status
not null default 'active';

create index skill_verifications_public_id_status_idx
on public.skill_verifications (public_verification_id, verification_status);
