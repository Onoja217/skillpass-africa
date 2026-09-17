insert into public.categories (name)
values
  ('Technology'),
  ('Design'),
  ('Fashion'),
  ('Repairs'),
  ('Business'),
  ('Media'),
  ('Agriculture')
on conflict (name) do nothing;
