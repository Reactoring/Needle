import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import {
  relationDocumentId,
  requireDemoTenantId,
  scopeQueryToTenant,
} from '../../../lib/tenant-scope';

const { ValidationError } = errors;

const ALLOWED_UNIT_FIELDS = [
  'price',
  'currency',
  'mediaCondition',
  'sleeveCondition',
  'sellerComment',
  'saleStatus',
  'quantity',
  'internalLocation',
] as const;

export default factories.createCoreController('api::sellable-unit.sellable-unit', ({ strapi }) => ({
  async find(ctx) {
    const tenantId = requireDemoTenantId(ctx);
    scopeQueryToTenant(ctx, tenantId);
    return super.find(ctx);
  },

  async create(ctx) {
    const tenantId = requireDemoTenantId(ctx);
    const input = ctx.request.body?.data ?? {};
    const productId = relationDocumentId(input.product);
    if (!productId) {
      throw new ValidationError('A product is required');
    }

    const product = await strapi.documents('api::product.product').findFirst({
      filters: {
        documentId: { $eq: productId },
        tenant: { documentId: { $eq: tenantId } },
      },
    });
    if (!product) {
      throw new ValidationError('The product does not belong to the selected tenant');
    }

    const data = Object.fromEntries(
      ALLOWED_UNIT_FIELDS.filter((field) => input[field] !== undefined).map((field) => [
        field,
        input[field],
      ]),
    );
    ctx.request.body = { data: { ...data, tenant: tenantId, product: product.documentId } };
    return super.create(ctx);
  },
}));
