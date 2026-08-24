import { factories } from '@strapi/strapi';
import { requireDemoTenantId, scopeQueryToTenant } from '../../../lib/tenant-scope';

export default factories.createCoreController('api::channel-listing.channel-listing', () => ({
  async find(ctx) {
    const tenantId = requireDemoTenantId(ctx);
    scopeQueryToTenant(ctx, tenantId);
    return super.find(ctx);
  },
}));
