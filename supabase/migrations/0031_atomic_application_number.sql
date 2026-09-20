-- Atomic CHF application-number generation.
-- Avoid count()+1 collisions when two loan submissions arrive close together.

CREATE TABLE IF NOT EXISTS public.chf_application_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL
);

CREATE OR REPLACE FUNCTION public.next_chf_application_no()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  next_number INTEGER;
BEGIN
  INSERT INTO public.chf_application_counters(year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_number = public.chf_application_counters.last_number + 1
  RETURNING last_number INTO next_number;

  RETURN format('CHF-%s-%s', current_year, lpad(next_number::text, 4, '0'));
END;
$$;
