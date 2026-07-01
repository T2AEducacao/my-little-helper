DROP POLICY IF EXISTS "Goals: employees complete own goals" ON public.goals;

CREATE POLICY "Goals: employees complete own goals"
  ON public.goals FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND employee_id = public.current_employee_id()
    AND status = 'pending'
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND employee_id = public.current_employee_id()
    AND status = 'completed'
  );
