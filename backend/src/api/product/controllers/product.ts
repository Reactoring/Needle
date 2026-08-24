import { factories } from '@strapi/strapi';
import { requireDemoTenantId, scopeQueryToTenant } from '../../../lib/tenant-scope';

const ALLOWED_PRODUCT_FIELDS = [
  'title',
  'artist',
  'description',
  'label',
  'year',
  'country',
  'format',
  'catalogReference',
  'barcode',
] as const;

export default factories.createCoreController('api::product.product', () => ({
  async find(ctx) {
    const tenantId = requireDemoTenantId(ctx);
    scopeQueryToTenant(ctx, tenantId);
    return super.find(ctx);
  },

  async create(ctx) {
    const tenantId = requireDemoTenantId(ctx);
    const input = ctx.request.body?.data ?? {};
    const data = Object.fromEntries(
      ALLOWED_PRODUCT_FIELDS.filter((field) => input[field] !== undefined).map((field) => [
        field,
        input[field],
      ]),
    );
    ctx.request.body = { data: { ...data, tenant: tenantId, productType: 'vinyl' } };
    return super.create(ctx);
  },
}));
