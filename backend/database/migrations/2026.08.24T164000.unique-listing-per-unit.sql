-- Only applies to databases that already contain data; fresh installs get the
-- same index from the bootstrap phase (src/bootstrap/db-constraints.ts).
DO $$
BEGIN
  IF to_regclass('channel_listings_sellable_unit_lnk') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS channel_listings_one_per_unit_uq
      ON channel_listings_sellable_unit_lnk (sellable_unit_id);
  END IF;
END $$;
