-- Backfill Field Executive UUID assignments for legacy/imported loans.
-- Older Excel data stored only fi_executive_name; collection permissions use
-- assigned_fe_id. Only exact case-insensitive name matches with one unique
-- active Field Executive are linked automatically.
--
-- Important: PostgreSQL has no min(uuid)/max(uuid) aggregate. We use
-- array_agg(... ORDER BY ...) and take the only row after HAVING count(*) = 1.

WITH unique_fe AS (
  SELECT
    lower(trim(full_name)) AS name_key,
    (array_agg(id ORDER BY id))[1] AS id
  FROM users
  WHERE role = 'field_executive'
    AND is_active = true
    AND full_name IS NOT NULL
    AND trim(full_name) <> ''
  GROUP BY lower(trim(full_name))
  HAVING count(*) = 1
)
UPDATE loan_applications AS la
SET
  assigned_fe_id = u.id,
  assigned_at = COALESCE(la.assigned_at, la.fi_send_date::timestamptz, now())
FROM unique_fe AS u
WHERE la.assigned_fe_id IS NULL
  AND la.fi_executive_name IS NOT NULL
  AND trim(la.fi_executive_name) <> ''
  AND lower(trim(la.fi_executive_name)) = u.name_key;

-- Keep the legacy display name for reporting/printing; assigned_fe_id is the
-- authoritative relationship used by Field Executive access checks.
