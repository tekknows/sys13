-- Admin-only bootstrap for the default system account.
insert into public.employees (employee_id, name, surname, email, department, role, account_role, is_active)
values ('EMP-ADMIN-001', 'System', 'Administrator', 'admin@sys13.com', 'Administration', 'Administrator', 'Administrator', true)
on conflict (email) do update
set name = excluded.name,
    surname = excluded.surname,
    department = excluded.department,
    role = excluded.role,
    account_role = excluded.account_role,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.user_credentials (employee_id, email, password_hash, role, is_active)
values ((select id from public.employees where email = 'admin@sys13.com'), 'admin@sys13.com', encode(digest('admin123', 'sha256'), 'hex'), 'Administrator', true)
on conflict (email) do update
set employee_id = excluded.employee_id,
    password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.admin_access_assignments (employee_id, email, full_name, role, assigned_by, is_active)
values ((select id from public.employees where email = 'admin@sys13.com'), 'admin@sys13.com', 'System Administrator', 'Administrator', 'system', true)
on conflict (email) do update
set employee_id = excluded.employee_id,
    full_name = excluded.full_name,
    role = excluded.role,
    assigned_by = excluded.assigned_by,
    is_active = excluded.is_active,
    updated_at = now();
