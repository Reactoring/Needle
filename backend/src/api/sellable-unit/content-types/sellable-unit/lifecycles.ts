import type { Core } from '@strapi/strapi';
import { allocateSku } from '../../../../lib/sku-sequence';

declare const strapi: Core.Strapi;

export default {
  // The SKU is always allocated here; any caller-provided value is overwritten.
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    event.params.data.sku = await allocateSku(strapi);
  },
};
