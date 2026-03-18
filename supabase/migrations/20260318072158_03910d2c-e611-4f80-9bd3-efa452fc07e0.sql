
-- Department Rating Cycles
CREATE TABLE public.department_rating_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_rating_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view active rating cycles"
  ON public.department_rating_cycles FOR SELECT TO authenticated
  USING (status IN ('active', 'completed'));

CREATE POLICY "HR and Admin can manage rating cycles"
  ON public.department_rating_cycles FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));

-- Department Rating Questions
CREATE TABLE public.department_rating_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.department_rating_cycles(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_rating_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view active rating questions"
  ON public.department_rating_questions FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "HR and Admin can manage rating questions"
  ON public.department_rating_questions FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));

-- Department Rating Assignments (which questions apply to which departments)
CREATE TABLE public.department_rating_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.department_rating_cycles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.department_rating_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, department_id, question_id)
);

ALTER TABLE public.department_rating_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view rating assignments"
  ON public.department_rating_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "HR and Admin can manage rating assignments"
  ON public.department_rating_assignments FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));

-- Department Ratings (employee responses)
CREATE TABLE public.department_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.department_rating_cycles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.department_rating_questions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, department_id, question_id, employee_id)
);

ALTER TABLE public.department_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can insert their own ratings"
  ON public.department_ratings FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their own ratings"
  ON public.department_ratings FOR UPDATE TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can view their own ratings"
  ON public.department_ratings FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "HR and Admin can view all ratings"
  ON public.department_ratings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));

CREATE POLICY "HR and Admin can manage all ratings"
  ON public.department_ratings FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')));
