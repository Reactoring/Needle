import type { Core } from '@strapi/strapi';
import { formatSku } from './sku';

export async function allocateSku(strapi: Core.Strapi): Promise<string> {
  const result = await strapi.db.connection.raw(
    "SELECT NEXTVAL('vinyl_sku_sequence') AS value",
  );
  const value = Number(result.rows?.[0]?.value);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Unable to allocate a SKU');
  }
  return formatSku(value);
}
