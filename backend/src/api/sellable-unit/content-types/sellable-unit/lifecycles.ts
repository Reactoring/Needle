import type { Core } from '@strapi/strapi';
import { nextSku } from '../../../../lib/sku';

declare const strapi: Core.Strapi;

export default {
  // Le SKU est toujours genere ici : une valeur saisie a la main est ecrasee.
  // En cas de creation concurrente, la contrainte d'unicite en base sert de garde-fou.
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const latest = await strapi.db.query('api::sellable-unit.sellable-unit').findMany({
      select: ['sku'],
      where: { sku: { $notNull: true } },
      orderBy: { sku: 'desc' },
      limit: 1,
    });

    event.params.data.sku = nextSku(latest[0]?.sku ?? null);
  },
};
