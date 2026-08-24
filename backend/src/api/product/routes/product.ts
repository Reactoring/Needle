import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product.product', {
  only: ['find', 'create'],
  config: {
    find: { policies: ['global::demo-tenant'] },
    create: { policies: ['global::demo-tenant'] },
  },
});
