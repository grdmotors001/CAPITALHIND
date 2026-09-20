-- GRD dealer identity mirror
-- GRD is the source of truth for dealer identity.

ALTER TABLE public.dealer_master
  ADD COLUMN IF NOT EXISTS grd_dealer_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.dealer_master'::regclass
      AND conname = 'dealer_master_grd_dealer_id_key'
  ) THEN
    ALTER TABLE public.dealer_master
      ADD CONSTRAINT dealer_master_grd_dealer_id_key
      UNIQUE (grd_dealer_id);
  END IF;
END $$;
