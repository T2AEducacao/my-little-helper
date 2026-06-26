-- Productivity monitoring foundation.
-- This prepares the Lovable Cloud database for future usage ingestion without
-- adding a local collector, executable, or desktop agent.

DO $$
BEGIN
  CREATE TYPE public.usage_source_type AS ENUM ('app', 'website');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.monitored_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  platform TEXT,
  external_key TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS public.usage_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type public.usage_source_type NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  CHECK (btrim(name) <> ''),
  CHECK (btrim(identifier) <> '')
);

CREATE TABLE IF NOT EXISTS public.usage_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id UUID NOT NULL,
  source_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usage_intervals_device_company_fk
    FOREIGN KEY (device_id, company_id)
    REFERENCES public.monitored_devices(id, company_id)
    ON DELETE CASCADE,
  CONSTRAINT usage_intervals_source_company_fk
    FOREIGN KEY (source_id, company_id)
    REFERENCES public.usage_sources(id, company_id)
    ON DELETE CASCADE,
  CHECK (ended_at > started_at),
  CHECK (duration_seconds > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS monitored_devices_company_user_external_key_unique
  ON public.monitored_devices (company_id, user_id, lower(external_key))
  WHERE external_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usage_sources_company_type_identifier_unique
  ON public.usage_sources (company_id, source_type, lower(identifier));

CREATE INDEX IF NOT EXISTS monitored_devices_company_last_seen_idx
  ON public.monitored_devices (company_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS usage_sources_company_type_idx
  ON public.usage_sources (company_id, source_type);

CREATE INDEX IF NOT EXISTS usage_intervals_company_started_idx
  ON public.usage_intervals (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS usage_intervals_company_source_started_idx
  ON public.usage_intervals (company_id, source_id, started_at DESC);

CREATE INDEX IF NOT EXISTS usage_intervals_company_device_started_idx
  ON public.usage_intervals (company_id, device_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_intervals TO authenticated;
GRANT ALL ON public.monitored_devices TO service_role;
GRANT ALL ON public.usage_sources TO service_role;
GRANT ALL ON public.usage_intervals TO service_role;

ALTER TABLE public.monitored_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_intervals ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_monitored_devices_updated ON public.monitored_devices;
CREATE TRIGGER trg_monitored_devices_updated
  BEFORE UPDATE ON public.monitored_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_sources_updated ON public.usage_sources;
CREATE TRIGGER trg_usage_sources_updated
  BEFORE UPDATE ON public.usage_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "view company monitored devices" ON public.monitored_devices;
CREATE POLICY "view company monitored devices" ON public.monitored_devices
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "manage company monitored devices" ON public.monitored_devices;
CREATE POLICY "manage company monitored devices" ON public.monitored_devices
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "view company usage sources" ON public.usage_sources;
CREATE POLICY "view company usage sources" ON public.usage_sources
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "manage company usage sources" ON public.usage_sources;
CREATE POLICY "manage company usage sources" ON public.usage_sources
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "view company usage intervals" ON public.usage_intervals;
CREATE POLICY "view company usage intervals" ON public.usage_intervals
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "manage company usage intervals" ON public.usage_intervals;
CREATE POLICY "manage company usage intervals" ON public.usage_intervals
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
