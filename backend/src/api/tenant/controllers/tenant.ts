import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tenant.tenant', () => ({
  async find(ctx) {
    const allowedIds = ctx.state.demoTenantIds ?? [];
    const requestedFilters = ctx.query?.filters;
    const accessFilter = { documentId: { $in: allowedIds } };
    ctx.query = {
      ...ctx.query,
      filters: requestedFilters ? { $and: [requestedFilters, accessFilter] } : accessFilter,
    };
    return super.find(ctx);
  },
}));
