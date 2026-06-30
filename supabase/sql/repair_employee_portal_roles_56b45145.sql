-- One-time repair for employee portal accounts in company:
-- 56b45145-8c58-4b1c-a12c-6027f3605b53
--
-- This does not delete auth users, profiles, companies, employees, or manager accounts.
-- It only removes elevated roles from users linked to employees through employees.profile_id.

begin;

update public.profiles p
set user_type = 'employee',
    updated_at = now()
from public.employees e
where p.id = e.profile_id
  and p.company_id = e.company_id
  and e.company_id = '56b45145-8c58-4b1c-a12c-6027f3605b53'::uuid;

insert into public.user_roles (user_id, role, company_id)
select e.profile_id, 'employee', e.company_id
from public.employees e
where e.company_id = '56b45145-8c58-4b1c-a12c-6027f3605b53'::uuid
  and e.profile_id is not null
on conflict (user_id, role, company_id) do nothing;

delete from public.user_roles ur
using public.employees e
where ur.user_id = e.profile_id
  and ur.company_id = e.company_id
  and ur.role in ('admin', 'manager')
  and e.company_id = '56b45145-8c58-4b1c-a12c-6027f3605b53'::uuid;

commit;

select
  e.id as employee_id,
  e.name,
  e.email,
  e.profile_id,
  array_agg(ur.role order by ur.role) as roles
from public.employees e
left join public.user_roles ur
  on ur.user_id = e.profile_id
 and ur.company_id = e.company_id
where e.company_id = '56b45145-8c58-4b1c-a12c-6027f3605b53'::uuid
group by e.id, e.name, e.email, e.profile_id
order by e.name;
