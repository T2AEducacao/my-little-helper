ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS behavioral_profile text;

-- Prevent duplicate emails per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS employees_company_email_unique
  ON public.employees (company_id, lower(email))
  WHERE email IS NOT NULL;