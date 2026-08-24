import type { Core } from '@strapi/strapi';
import { allocateSku } from '../../../../lib/sku-sequence';

declare const strapi: Core.Strapi;

export default {
  // Le SKU est toujours genere ici : une valeur saisie a la main est ecrasee.
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    event.params.data.sku = await allocateSku(strapi);
  },
};
