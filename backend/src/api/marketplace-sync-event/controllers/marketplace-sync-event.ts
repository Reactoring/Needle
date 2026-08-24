import { factories } from '@strapi/strapi';
import { requireDemoTenantId, scopeQueryToTenant } from '../../../lib/tenant-scope';

export default factories.createCoreController(
  'api::marketplace-sync-event.marketplace-sync-event',
  () => ({
    async find(ctx) {
      const tenantId = requireDemoTenantId(ctx);
      scopeQueryToTenant(ctx, tenantId);
      return super.find(ctx);
    },
  }),
);
