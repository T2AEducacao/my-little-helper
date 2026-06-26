-- Harden Lovable Cloud auth bootstrap for password signups.
-- New authenticated users must always receive a company, profile, and admin role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  requested_company_name text;
  requested_profile_name text;
BEGIN
  requested_company_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'company_name'), ''),
    'Minha empresa'
  );
  requested_profile_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)
  );

  INSERT INTO public.companies (name)
  VALUES (requested_company_name)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, name, email, user_type)
  VALUES (NEW.id, new_company_id, requested_profile_name, NEW.email, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
    name = COALESCE(NULLIF(btrim(public.profiles.name), ''), EXCLUDED.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    user_type = 'admin',
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (NEW.id, 'admin', new_company_id)
  ON CONFLICT (user_id, role, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile(
  _company_name text DEFAULT NULL,
  _profile_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  existing_company_id uuid;
  resolved_company_id uuid;
  resolved_company_name text;
  resolved_profile_name text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT company_id, email, name
  INTO existing_company_id, current_user_email, resolved_profile_name
  FROM public.profiles
  WHERE id = current_user_id;

  IF existing_company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (current_user_id, 'admin', existing_company_id)
    ON CONFLICT (user_id, role, company_id) DO NOTHING;

    RETURN existing_company_id;
  END IF;

  SELECT email
  INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  resolved_company_name := COALESCE(NULLIF(btrim(_company_name), ''), 'Minha empresa');
  resolved_profile_name := COALESCE(
    NULLIF(btrim(_profile_name), ''),
    NULLIF(btrim(resolved_profile_name), ''),
    split_part(COALESCE(current_user_email, current_user_id::text), '@', 1)
  );

  INSERT INTO public.companies (name)
  VALUES (resolved_company_name)
  RETURNING id INTO resolved_company_id;

  INSERT INTO public.profiles (id, company_id, name, email, user_type)
  VALUES (current_user_id, resolved_company_id, resolved_profile_name, current_user_email, 'admin')
  ON CONFLICT (id) DO UPDATE
  SET
    company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
    name = COALESCE(NULLIF(btrim(public.profiles.name), ''), EXCLUDED.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    user_type = COALESCE(public.profiles.user_type, EXCLUDED.user_type),
    updated_at = now()
  RETURNING company_id INTO resolved_company_id;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (current_user_id, 'admin', resolved_company_id)
  ON CONFLICT (user_id, role, company_id) DO NOTHING;

  RETURN resolved_company_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_current_user_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(text, text) TO authenticated;
