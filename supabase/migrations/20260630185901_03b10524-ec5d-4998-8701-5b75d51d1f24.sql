
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS employees_profile_id_idx ON public.employees(profile_id);

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE profile_id = auth.uid() LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  deadline date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_company_idx ON public.goals(company_id);
CREATE INDEX IF NOT EXISTS goals_employee_idx ON public.goals(employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Goals: company members select"
  ON public.goals FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'manager')
      OR employee_id = public.current_employee_id()
    )
  );

CREATE POLICY "Goals: managers insert"
  ON public.goals FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  );

CREATE POLICY "Goals: managers update"
  ON public.goals FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  );

CREATE POLICY "Goals: managers delete"
  ON public.goals FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  );

CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
