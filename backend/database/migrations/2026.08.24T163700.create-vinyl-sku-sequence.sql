CREATE SEQUENCE IF NOT EXISTS vinyl_sku_sequence START WITH 1 INCREMENT BY 1;

SELECT SETVAL(
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

DROP TABLE IF EXISTS vinyl_sku_counters;
