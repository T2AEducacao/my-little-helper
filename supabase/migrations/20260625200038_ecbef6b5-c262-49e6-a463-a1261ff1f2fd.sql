
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.user_type AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.employee_status AS ENUM ('active', 'vacation', 'leave', 'inactive');
CREATE TYPE public.alert_severity AS ENUM ('info', 'attention', 'risk', 'critical');
CREATE TYPE public.alert_status AS ENUM ('open', 'analyzing', 'resolved', 'ignored');

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  role TEXT,
  avatar_url TEXT,
  user_type public.user_type NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Policies: companies
CREATE POLICY "view own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id());
CREATE POLICY "admins manage company" ON public.companies FOR ALL TO authenticated
  USING (id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- Policies: profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_user_company_id());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- Policies: user_roles
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "view company departments" ON public.departments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "managers write departments" ON public.departments FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- employees
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  seniority TEXT,
  hire_date DATE,
  status public.employee_status NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "view company employees" ON public.employees FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "managers write employees" ON public.employees FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

ALTER TABLE public.departments
  ADD CONSTRAINT departments_manager_fk FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- performance_snapshots
CREATE TABLE public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  overall_score NUMERIC(5,2),
  delivery_score NUMERIC(5,2),
  quality_score NUMERIC(5,2),
  goals_score NUMERIC(5,2),
  behavior_score NUMERIC(5,2),
  evolution_score NUMERIC(5,2),
  status TEXT,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_employee_date ON public.performance_snapshots(employee_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_company_date ON public.performance_snapshots(company_id, snapshot_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_snapshots TO authenticated;
GRANT ALL ON public.performance_snapshots TO service_role;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view company snapshots" ON public.performance_snapshots FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "managers write snapshots" ON public.performance_snapshots FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- performance_alerts
CREATE TABLE public.performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'info',
  category TEXT,
  explanation TEXT,
  suggested_action TEXT,
  status public.alert_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_company_status ON public.performance_alerts(company_id, status, severity);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_alerts TO authenticated;
GRANT ALL ON public.performance_alerts TO service_role;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_alerts_updated BEFORE UPDATE ON public.performance_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "view company alerts" ON public.performance_alerts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "managers write alerts" ON public.performance_alerts FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = public.get_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- activity_logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID,
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_company_date ON public.activity_logs(company_id, created_at DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view company activity" ON public.activity_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "insert company activity" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
