-- Create overtime rates table for HR-configurable rates per position and day type
CREATE TABLE public.overtime_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_name text NOT NULL,
  day_type text NOT NULL CHECK (day_type IN ('weekday', 'saturday', 'sunday')),
  rate_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (position_name, day_type)
);

-- Enable RLS
ALTER TABLE public.overtime_rates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view rates
CREATE POLICY "All authenticated users can view overtime rates"
ON public.overtime_rates
FOR SELECT
USING (true);

-- HR and Admin can manage rates
CREATE POLICY "HR and Admin can manage overtime rates"
ON public.overtime_rates
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('hr', 'admin')
));

-- Insert default rates as specified by user
INSERT INTO public.overtime_rates (position_name, day_type, rate_amount) VALUES
('Operator', 'weekday', 1000),
('Operator', 'saturday', 1500),
('Operator', 'sunday', 2000),
('Helper', 'weekday', 800),
('Helper', 'saturday', 1200),
('Helper', 'sunday', 1500);

-- Add overtime_amount column to attendance_logs for calculated payment
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS overtime_amount numeric DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_overtime_rates_updated_at
BEFORE UPDATE ON public.overtime_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();