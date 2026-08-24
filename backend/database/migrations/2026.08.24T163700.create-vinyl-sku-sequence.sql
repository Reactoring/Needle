CREATE SEQUENCE IF NOT EXISTS vinyl_sku_sequence START WITH 1 INCREMENT BY 1;

-- Strapi runs migrations before syncing the schema: on a fresh database the
-- business tables do not exist yet, so everything below only applies to
-- databases that already contain data. Fresh installs get the same index from
-- the bootstrap phase (src/bootstrap/db-constraints.ts).
DO $$
BEGIN
  IF to_regclass('sellable_units') IS NOT NULL THEN
    PERFORM SETVAL(
      'vinyl_sku_sequence',
      GREATEST(
        COALESCE(
          (
            SELECT MAX(REGEXP_REPLACE(sku, '[^0-9]', '', 'g')::BIGINT)
            FROM sellable_units
            WHERE sku ~ '^VIN-[0-9]+$'
          ),
          0
        ) + 1,
        1
      ),
      FALSE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS sellable_units_sku_uq
      ON sellable_units (sku)
      WHERE sku IS NOT NULL;
  END IF;
END $$;

DROP TABLE IF EXISTS vinyl_sku_counters;
