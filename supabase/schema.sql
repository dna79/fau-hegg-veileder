create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  source_filename text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.languages (
  language_code text primary key,
  name text not null,
  native_name text not null,
  enabled boolean not null default true,
  sort_order int not null
);

create table if not exists public.guide_translations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  language_code text not null references public.languages(language_code),
  content jsonb not null,
  status text not null check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, language_code)
);

create index if not exists documents_status_published_at_idx
  on public.documents (status, published_at desc);

create index if not exists guide_translations_document_id_idx
  on public.guide_translations (document_id);

insert into public.languages (language_code, name, native_name, enabled, sort_order)
values
  ('nb', 'Norwegian Bokmål', 'Norsk', true, 10),
  ('en', 'English', 'English', true, 20),
  ('pl', 'Polish', 'Polski', true, 30),
  ('uk', 'Ukrainian', 'Українська', true, 40),
  ('ar', 'Arabic', 'العربية', true, 50),
  ('so', 'Somali', 'Soomaali', true, 60)
on conflict (language_code) do update set
  name = excluded.name,
  native_name = excluded.native_name,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;
