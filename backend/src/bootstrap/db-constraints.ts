import type { Core } from '@strapi/strapi';

// Runs after Strapi has synced the schema, so the tables are guaranteed to
// exist. Idempotent: safe to run on every startup. The SQL migrations create
// the same indexes for databases that predate them, but they cannot do it on
// a fresh database because migrations run before the schema sync.
export async function ensureDbConstraints(strapi: Core.Strapi) {
  await strapi.db.connection.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS sellable_units_sku_uq
       ON sellable_units (sku)
       WHERE sku IS NOT NULL`,
  );

  await strapi.db.connection.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS channel_listings_one_per_unit_uq
       ON channel_listings_sellable_unit_lnk (sellable_unit_id)`,
  );
}
