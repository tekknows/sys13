-- Employee admin-ui permission migration
-- Reuses the existing public.employees table and email-based identity checks.
-- This migration avoids duplicate employee/admin records and stores the grant state in a dedicated table.

create table if not exists public.employee_permissions (
  permission_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  can_access_admin boolean not null default false,
  permission_granted_by uuid references public.employees(id) on delete set null,
  permission_granted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create index if not exists idx_employee_permissions_employee_id on public.employee_permissions(employee_id);
create index if not exists idx_employee_permissions_granted_by on public.employee_permissions(permission_granted_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employee_permissions_updated_at on public.employee_permissions;
create trigger trg_employee_permissions_updated_at before update on public.employee_permissions
for each row execute procedure public.set_updated_at();

alter table public.employee_permissions enable row level security;

-- Policies for employee_permissions are defined centrally in supabase/rls.sql
-- to avoid duplicate policy names across migration files.
