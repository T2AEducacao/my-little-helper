-- Existing employee profiles must not receive admin privileges when the app
-- verifies the Lovable Cloud session. New self-signups remain admin accounts.

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
  current_user_metadata jsonb := '{}'::jsonb;
  existing_company_id uuid;
  existing_user_type public.user_type;
  resolved_company_id uuid;
  resolved_company_name text;
  resolved_profile_name text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT company_id, email, name, user_type
  INTO existing_company_id, current_user_email, resolved_profile_name, existing_user_type
  FROM public.profiles
  WHERE id = current_user_id;

  IF existing_company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (
      current_user_id,
      COALESCE(existing_user_type, 'employee'::public.user_type)::text::public.app_role,
      existing_company_id
    )
    ON CONFLICT (user_id, role, company_id) DO NOTHING;

    RETURN existing_company_id;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO current_user_email, current_user_metadata
  FROM auth.users
  WHERE id = current_user_id;

  resolved_company_name := COALESCE(
    NULLIF(btrim(_company_name), ''),
    NULLIF(btrim(current_user_metadata->>'company_name'), ''),
    'Minha empresa'
  );
  resolved_profile_name := COALESCE(
    NULLIF(btrim(_profile_name), ''),
    NULLIF(btrim(resolved_profile_name), ''),
    NULLIF(btrim(current_user_metadata->>'full_name'), ''),
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

REVOKE EXECUTE ON FUNCTION public.ensure_current_user_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(text, text) TO authenticated;
