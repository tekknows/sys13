-- MINDLOCK core schema
-- This script creates the tables inferred from the app and extension code.
-- It is intentionally idempotent: it only creates missing objects.

create extension if not exists pgcrypto;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  admin_email text,
  retention_date date,
  accent_color text default '#8e6a5e',
  ticket_retention_days integer default 3,
  disposal_retention_days integer default 30,
  features jsonb not null default '{"incognitoBlocker":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null default '',
  surname text not null default '',
  email text unique not null,
  department text not null default '',
  role text not null default 'Employee',
  account_role text not null default 'Employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_permissions (
  permission_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  can_access_admin boolean not null default false,
  permission_granted_by uuid references public.employees(id) on delete set null,
  permission_granted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text unique,
  user_name text,
  laptop_name text,
  laptop_id text,
  mac_address text,
  email text,
  employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'available',
  department text,
  is_registered boolean not null default false,
  last_sync timestamptz,
  policy_version integer default 1,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replacements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  old_laptop_id text,
  new_laptop_id text,
  reason text,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Policy',
  enabled boolean not null default true,
  scope text not null default 'all',
  user_ids jsonb not null default '[]'::jsonb,
  schedule jsonb not null default '{"type":"daily","days":["Mon","Tue","Wed","Thu","Fri"],"start":"09:00","end":"17:00"}'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  device_id text,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days text[] not null default array['Mon','Tue','Wed','Thu','Fri'],
  start_time text not null default '09:00',
  end_time text not null default '17:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  user_name text,
  domain text,
  mb_used numeric default 0,
  online_hours numeric default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_snapshot (
  id uuid primary key default gen_random_uuid(),
  daily jsonb not null default '[0,0,0,0,0,0,0]'::jsonb,
  categories jsonb not null default '[0,0,0,0]'::jsonb,
  weekly_usage jsonb not null default '[0,0,0,0,0,0,0]'::jsonb,
  asset_status jsonb not null default '[0,0,0,0]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  title text,
  body text,
  user_id uuid references auth.users(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default true,
  default_status text default 'Open',
  default_priority text default 'Medium',
  ticket_id_format text default 'TKT-2026-0001',
  default_assignment text default 'IT Support',
  support_instructions text,
  message_retention_days integer default 30,
  history_retention_days integer default 90,
  resolved_ticket_retention_days integer default 3,
  keep_messages_indefinitely boolean not null default false,
  auto_cleanup_enabled boolean not null default true,
  last_cleanup_date timestamptz,
  next_scheduled_cleanup timestamptz,
  last_cleanup_execution_key text,
  cleanup_history jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '["Low","Medium","High","Critical"]'::jsonb,
  statuses jsonb not null default '[]'::jsonb,
  notifications jsonb not null default '{"newTicket":true,"highPriority":true,"newEmployeeMessage":true,"ticketAssigned":true,"statusChanged":true,"ticketResolved":true}'::jsonb,
  workflow jsonb not null default '{"defaultITStaff":"IT Support","allowEmployeeReopen":true,"allowEmployeeMessagesAfterClose":false,"allowITReopen":true,"requireResolutionNotes":false}'::jsonb,
  security jsonb not null default '{"adminOnlySettings":true,"restrictManagementByRole":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_category_settings (
  id smallint primary key default 1 check (id = 1),
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.changelog (
  id text primary key,
  version text not null unique,
  date date,
  title text not null default '',
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings
  add column if not exists features jsonb not null default '{"incognitoBlocker":true}'::jsonb;

alter table public.ticket_settings
  add column if not exists enabled boolean not null default true,
  add column if not exists categories jsonb not null default '[]'::jsonb,
  add column if not exists priorities jsonb not null default '["Low","Medium","High","Critical"]'::jsonb,
  add column if not exists statuses jsonb not null default '[]'::jsonb;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique not null,
  title text not null,
  description text,
  reporter_name text,
  reporter_email text,
  employee_id uuid references public.employees(id) on delete set null,
  device_id text,
  laptop_id text,
  category text,
  priority text default 'Medium',
  status text default 'Open',
  assignee text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  sender_name text not null,
  sender_email text,
  sender_role text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'Employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_access_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  email text unique not null,
  full_name text,
  role text not null default 'Employee',
  assigned_by text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocking_policies (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  name text not null,
  enabled boolean not null default true,
  domains jsonb not null default '[]'::jsonb,
  schedule jsonb not null default '{"type":"daily","days":["Mon","Tue","Wed","Thu","Fri"],"start":"09:00","end":"17:00"}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  domain text,
  timestamp timestamptz not null default now(),
  duration_seconds integer not null default 0,
  blocked boolean not null default false,
  policy_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_email on public.employees(email);
create index if not exists idx_employees_auth_user_id on public.employees(auth_user_id);
create index if not exists idx_employee_permissions_employee_id on public.employee_permissions(employee_id);
create index if not exists idx_employee_permissions_granted_by on public.employee_permissions(permission_granted_by);
create index if not exists idx_devices_employee_id on public.devices(employee_id);
create index if not exists idx_devices_device_id on public.devices(device_id);
create index if not exists idx_policies_device_id on public.policies(device_id);
create index if not exists idx_usage_recorded_at on public.usage(recorded_at);
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_employee_id on public.tickets(employee_id);
create index if not exists idx_ticket_messages_ticket_id on public.ticket_messages(ticket_id);
create index if not exists idx_blocking_policies_device_id on public.blocking_policies(device_id);
create index if not exists idx_usage_events_device_id on public.usage_events(device_id);
create index if not exists idx_usage_events_timestamp on public.usage_events(timestamp);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at before update on public.settings for each row execute procedure public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at before update on public.employees for each row execute procedure public.set_updated_at();

drop trigger if exists trg_employee_permissions_updated_at on public.employee_permissions;
create trigger trg_employee_permissions_updated_at before update on public.employee_permissions for each row execute procedure public.set_updated_at();

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at before update on public.devices for each row execute procedure public.set_updated_at();

drop trigger if exists trg_replacements_updated_at on public.replacements;
create trigger trg_replacements_updated_at before update on public.replacements for each row execute procedure public.set_updated_at();

drop trigger if exists trg_policies_updated_at on public.policies;
create trigger trg_policies_updated_at before update on public.policies for each row execute procedure public.set_updated_at();

drop trigger if exists trg_schedules_updated_at on public.schedules;
create trigger trg_schedules_updated_at before update on public.schedules for each row execute procedure public.set_updated_at();

drop trigger if exists trg_usage_updated_at on public.usage;
create trigger trg_usage_updated_at before update on public.usage for each row execute procedure public.set_updated_at();

drop trigger if exists trg_analytics_snapshot_updated_at on public.analytics_snapshot;
create trigger trg_analytics_snapshot_updated_at before update on public.analytics_snapshot for each row execute procedure public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications for each row execute procedure public.set_updated_at();

drop trigger if exists trg_ticket_settings_updated_at on public.ticket_settings;
create trigger trg_ticket_settings_updated_at before update on public.ticket_settings for each row execute procedure public.set_updated_at();

drop trigger if exists trg_ticket_category_settings_updated_at on public.ticket_category_settings;
create trigger trg_ticket_category_settings_updated_at before update on public.ticket_category_settings for each row execute procedure public.set_updated_at();

drop trigger if exists trg_changelog_updated_at on public.changelog;
create trigger trg_changelog_updated_at before update on public.changelog for each row execute procedure public.set_updated_at();

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at before update on public.tickets for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_credentials_updated_at on public.user_credentials;
create trigger trg_user_credentials_updated_at before update on public.user_credentials for each row execute procedure public.set_updated_at();

drop trigger if exists trg_admin_access_assignments_updated_at on public.admin_access_assignments;
create trigger trg_admin_access_assignments_updated_at before update on public.admin_access_assignments for each row execute procedure public.set_updated_at();

drop trigger if exists trg_blocking_policies_updated_at on public.blocking_policies;
create trigger trg_blocking_policies_updated_at before update on public.blocking_policies for each row execute procedure public.set_updated_at();
