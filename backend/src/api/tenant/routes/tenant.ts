import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::tenant.tenant', {
  only: ['find'],
  config: {
    find: {
      policies: [{ name: 'global::demo-tenant', config: { tenantOptional: true } }],
    },
  },
});
