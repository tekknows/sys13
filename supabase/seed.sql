-- Demo seed data for local development/testing.
-- These sample accounts match the app's built-in defaults and are intentionally easy to replace in production.

insert into public.employees (employee_id, name, surname, email, department, role, account_role, is_active)
values
  ('EMP-ADMIN-001', 'System', 'Administrator', 'admin@sys13.com', 'Administration', 'Administrator', 'Administrator', true),
  ('EMP-IT-001', 'IT', 'Support', 'it-support@sys13.com', 'IT', 'IT Staff', 'IT Staff', true),
  ('EMP-USER-001', 'Sample', 'Employee', 'employee@sys13.com', 'Operations', 'Employee', 'Employee', true)
on conflict (email) do update
set name = excluded.name,
    surname = excluded.surname,
    department = excluded.department,
    role = excluded.role,
    account_role = excluded.account_role,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.user_credentials (employee_id, email, password_hash, role, is_active)
values
  ((select id from public.employees where email = 'admin@sys13.com'), 'admin@sys13.com', encode(digest('admin123', 'sha256'), 'hex'), 'Administrator', true),
  ((select id from public.employees where email = 'it-support@sys13.com'), 'it-support@sys13.com', encode(digest('ITSupport123!', 'sha256'), 'hex'), 'IT Staff', true),
  ((select id from public.employees where email = 'employee@sys13.com'), 'employee@sys13.com', encode(digest('Employee123!', 'sha256'), 'hex'), 'Employee', true)
on conflict (email) do update
set employee_id = excluded.employee_id,
    password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.admin_access_assignments (employee_id, email, full_name, role, assigned_by, is_active)
values
  ((select id from public.employees where email = 'admin@sys13.com'), 'admin@sys13.com', 'System Administrator', 'Administrator', 'system', true),
  ((select id from public.employees where email = 'it-support@sys13.com'), 'it-support@sys13.com', 'IT Support', 'IT Staff', 'system', true)
on conflict (email) do update
set employee_id = excluded.employee_id,
    full_name = excluded.full_name,
    role = excluded.role,
    assigned_by = excluded.assigned_by,
    is_active = excluded.is_active,
    updated_at = now();
