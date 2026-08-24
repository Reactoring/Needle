import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::channel-listing.channel-listing', {
  only: ['find'],
  config: {
    find: { policies: ['global::demo-tenant'] },
  },
});
