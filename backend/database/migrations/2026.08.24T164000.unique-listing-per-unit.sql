CREATE UNIQUE INDEX IF NOT EXISTS channel_listings_one_per_unit_uq
  ON channel_listings_sellable_unit_lnk (sellable_unit_id);
