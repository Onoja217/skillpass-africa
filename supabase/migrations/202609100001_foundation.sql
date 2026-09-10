create type public.user_role as enum ('learner', 'mentor', 'employer', 'administrator');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  phone text check (phone is null or char_length(phone) <= 30),
  location text check (location is null or char_length(location) <= 100),
  biography text check (biography is null or char_length(biography) <= 600),
  avatar_url text,
  selected_skills text[] not null default '{}',
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_administrator()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'administrator') $$;

create policy "Users can read their own profile"
on public.profiles for select to authenticated using (id = auth.uid());

create policy "Administrators can read all profiles"
on public.profiles for select to authenticated using (public.is_administrator());

create policy "Users can update their own profile"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Administrators can update profiles"
on public.profiles for update to authenticated using (public.is_administrator()) with check (public.is_administrator());

create or replace function public.protect_profile_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.email := old.email;
  if not public.is_administrator() then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_identity_before_update before update on public.profiles
for each row execute procedure public.protect_profile_identity();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('learner', 'mentor', 'employer')
      then (new.raw_user_meta_data ->> 'role')::public.user_role
    else 'learner'::public.user_role
  end;
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New member'), new.email, requested_role);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar images are public" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;
grant execute on function public.is_administrator() to authenticated;

comment on table public.profiles is 'Private account profiles. RLS limits ordinary users to their own row.';
