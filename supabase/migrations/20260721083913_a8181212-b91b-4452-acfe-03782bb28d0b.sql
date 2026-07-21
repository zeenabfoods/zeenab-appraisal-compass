
CREATE OR REPLACE FUNCTION public.recalc_appraisal_overall_score(_appraisal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score numeric;
BEGIN
  WITH per_section AS (
    SELECT
      CASE
        WHEN s.name ILIKE '%Behaviour%'  THEN 20
        WHEN s.name ILIKE '%Compliance%' THEN 10
        WHEN s.name ILIKE '%Leadership%' THEN 10
        WHEN s.name ILIKE '%Operational%' THEN 60
        ELSE 0
      END AS cap,
      SUM(COALESCE(r.mgr_rating,0))::numeric AS sum_mgr,
      COUNT(r.mgr_rating) AS answered
    FROM appraisal_responses r
    JOIN appraisal_questions q ON q.id = r.question_id
    JOIN appraisal_question_sections s ON s.id = q.section_id
    WHERE r.appraisal_id = _appraisal_id
      AND r.mgr_rating IS NOT NULL
    GROUP BY s.name
  )
  SELECT ROUND(SUM((sum_mgr / NULLIF(answered*5,0)) * cap)::numeric, 2)
  INTO new_score
  FROM per_section
  WHERE cap > 0;

  UPDATE public.appraisals
  SET overall_score = COALESCE(new_score, 0),
      updated_at = now()
  WHERE id = _appraisal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_overall_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _appraisal_id uuid;
BEGIN
  _appraisal_id := COALESCE(NEW.appraisal_id, OLD.appraisal_id);
  IF _appraisal_id IS NOT NULL THEN
    PERFORM public.recalc_appraisal_overall_score(_appraisal_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS appraisal_responses_recalc_score ON public.appraisal_responses;
CREATE TRIGGER appraisal_responses_recalc_score
AFTER INSERT OR UPDATE OF mgr_rating OR DELETE
ON public.appraisal_responses
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalc_overall_score();
