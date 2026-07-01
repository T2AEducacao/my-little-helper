DROP POLICY IF EXISTS "Goals: company members select" ON public.goals;

CREATE POLICY "Goals: company members select"
  ON public.goals FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND (
      (
        public.current_employee_id() IS NOT NULL
        AND employee_id = public.current_employee_id()
      )
      OR (
        public.current_employee_id() IS NULL
        AND (
          public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'manager')
        )
      )
    )
  );
