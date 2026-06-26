-- Keep the signup trigger aligned with the actual public.profiles schema.
-- The original function inserted into profiles.full_name, but the table column
-- is named profiles.name.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  company_name text;
  profile_name text;
BEGIN
  company_name := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'company_name'), ''), 'Minha empresa');
  profile_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)
  );

  INSERT INTO public.companies (name)
  VALUES (company_name)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, name, email, user_type)
  VALUES (NEW.id, new_company_id, profile_name, NEW.email, 'admin');

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (NEW.id, 'admin', new_company_id);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
