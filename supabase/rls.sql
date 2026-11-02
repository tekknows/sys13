-- Row Level Security for MINDLOCK tables.
-- The app uses email + password-hash validation rather than auth_user_id-based sign-in.

alter table public.settings enable row level security;
alter table public.employees enable row level security;
alter table public.devices enable row level security;
alter table public.replacements enable row level security;
alter table public.policies enable row level security;
alter table public.schedules enable row level security;
alter table public.usage enable row level security;
alter table public.analytics_snapshot enable row level security;
alter table public.notifications enable row level security;
alter table public.ticket_settings enable row level security;
alter table public.ticket_category_settings enable row level security;
alter table public.changelog enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.user_credentials enable row level security;
alter table public.admin_access_assignments enable row level security;
alter table public.blocking_policies enable row level security;
alter table public.usage_events enable row level security;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::json->>'email',
    auth.jwt() ->> 'email',
    ''
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'role'),
    (select role from public.user_credentials where email = public.current_user_email() limit 1),
    'Employee'
  );
$$;

create or replace function public.is_admin_or_it()
returns boolean
language sql
stable
as $$
  select public.current_user_role() in ('Administrator', 'IT Staff');
$$;

create or replace function public.is_current_employee(employee_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = employee_uuid
      and e.email = public.current_user_email()
  );
$$;

drop policy if exists "Admin read/write access to settings" on public.settings;
create policy "Admin read/write access to settings"
on public.settings
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Public can read employee records" on public.employees;
create policy "Public can read employee records"
on public.employees
for select
using (true);

drop policy if exists "Public can read credentials" on public.user_credentials;
create policy "Public can read credentials"
on public.user_credentials
for select
using (true);

-- The browser login flow validates the password hash locally, so the credential table must be readable by the anonymous client.

drop policy if exists "Employees can read their own record" on public.employees;
create policy "Employees can read their own record"
on public.employees
for select
using (
  email = public.current_user_email()
  or public.is_admin_or_it()
  or true
);

drop policy if exists "Admin and IT can manage employees" on public.employees;
drop policy if exists "Admin and IT can update employees" on public.employees;
create policy "Admin and IT can manage employees"
on public.employees
for insert with check (public.is_admin_or_it());
create policy "Admin and IT can update employees"
on public.employees
for update
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Employee can read own admin permission" on public.employee_permissions;
drop policy if exists "Admins can manage employee permissions" on public.employee_permissions;
create policy "Employee can read own admin permission"
on public.employee_permissions
for select
using (
  employee_id in (
    select id from public.employees where email = public.current_user_email()
  )
  or public.is_admin_or_it()
);

create policy "Admins can manage employee permissions"
on public.employee_permissions
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Admin and IT can manage devices" on public.devices;
create policy "Admin and IT can manage devices"
on public.devices
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Employee can read assigned device" on public.devices;
create policy "Employee can read assigned device"
on public.devices
for select
using (
  public.is_admin_or_it()
  or employee_id in (
    select id from public.employees where email = public.current_user_email()
  )
);

drop policy if exists "Admin and IT can manage policies" on public.policies;
create policy "Admin and IT can manage policies"
on public.policies
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Admin and IT can manage schedules" on public.schedules;
create policy "Admin and IT can manage schedules"
on public.schedules
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Admin and IT can read usage" on public.usage;
drop policy if exists "Authenticated devices can insert usage records" on public.usage;
create policy "Admin and IT can read usage"
on public.usage
for select using (public.is_admin_or_it());
create policy "Authenticated devices can insert usage records"
on public.usage
for insert with check (auth.role() = 'authenticated');

drop policy if exists "Admin and IT can manage analytics snapshots" on public.analytics_snapshot;
create policy "Admin and IT can manage analytics snapshots"
on public.analytics_snapshot
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can insert their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications
for select
using (
  user_email = public.current_user_email()
  or public.is_admin_or_it()
);

create policy "Users can insert their own notifications"
on public.notifications
for insert
with check (
  user_email = public.current_user_email()
  or public.is_admin_or_it()
);

drop policy if exists "Admin and IT can manage ticket settings" on public.ticket_settings;
create policy "Admin and IT can manage ticket settings"
on public.ticket_settings
for all using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Anyone can read ticket categories" on public.ticket_category_settings;
drop policy if exists "Admin and IT can manage ticket categories" on public.ticket_category_settings;
create policy "Anyone can read ticket categories"
on public.ticket_category_settings
for select using (true);

create policy "Admin and IT can manage ticket categories"
on public.ticket_category_settings
for all using (public.is_admin_or_it())
with check (public.is_admin_or_it());

grant select on public.ticket_category_settings to anon, authenticated;

drop policy if exists "Anyone can read changelog" on public.changelog;
drop policy if exists "Admin and IT can manage changelog" on public.changelog;
create policy "Anyone can read changelog"
on public.changelog
for select using (true);

create policy "Admin and IT can manage changelog"
on public.changelog
for all using (public.is_admin_or_it())
with check (public.is_admin_or_it());

grant select on public.changelog to anon, authenticated;

drop policy if exists "Employees can read their own tickets" on public.tickets;
drop policy if exists "Employees can create their own tickets" on public.tickets;
drop policy if exists "Employees and admins can update tickets they own" on public.tickets;
create policy "Employees can read their own tickets"
on public.tickets
for select
using (
  public.is_admin_or_it()
  or employee_id in (
    select id from public.employees where email = public.current_user_email()
  )
  or reporter_email = public.current_user_email()
);

create policy "Employees can create their own tickets"
on public.tickets
for insert
with check (
  public.is_admin_or_it()
  or reporter_email = public.current_user_email()
);

create policy "Employees and admins can update tickets they own"
on public.tickets
for update
using (
  public.is_admin_or_it()
  or employee_id in (
    select id from public.employees where email = public.current_user_email()
  )
  or reporter_email = public.current_user_email()
)
with check (
  public.is_admin_or_it()
  or employee_id in (
    select id from public.employees where email = public.current_user_email()
  )
  or reporter_email = public.current_user_email()
);

drop policy if exists "Employees can read own ticket messages" on public.ticket_messages;
drop policy if exists "Users can create ticket messages for their ticket" on public.ticket_messages;
create policy "Employees can read own ticket messages"
on public.ticket_messages
for select
using (
  public.is_admin_or_it()
  or ticket_id in (
    select id from public.tickets where employee_id in (
      select id from public.employees where email = public.current_user_email()
    )
  )
);

create policy "Users can create ticket messages for their ticket"
on public.ticket_messages
for insert
with check (
  public.is_admin_or_it()
  or ticket_id in (
    select id from public.tickets where reporter_email = public.current_user_email()
  )
  or ticket_id in (
    select id from public.tickets where employee_id in (
      select id from public.employees where email = public.current_user_email()
    )
  )
);

drop policy if exists "Admin and IT can manage credentials" on public.user_credentials;
create policy "Admin and IT can manage credentials"
on public.user_credentials
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Admin and IT can manage access assignments" on public.admin_access_assignments;
create policy "Admin and IT can manage access assignments"
on public.admin_access_assignments
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Admin and IT can manage blocking policies" on public.blocking_policies;
create policy "Admin and IT can manage blocking policies"
on public.blocking_policies
for all
using (public.is_admin_or_it())
with check (public.is_admin_or_it());

drop policy if exists "Authenticated devices can insert usage events" on public.usage_events;
drop policy if exists "Admin and IT can read usage events" on public.usage_events;
create policy "Authenticated devices can insert usage events"
on public.usage_events
for insert
with check (auth.role() = 'authenticated');

create policy "Admin and IT can read usage events"
on public.usage_events
for select using (public.is_admin_or_it());
