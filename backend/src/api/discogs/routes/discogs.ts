// Endpoints du workflow Discogs.
export default {
  routes: [
    {
      method: 'GET',
      path: '/discogs/info',
      handler: 'discogs.info',
      config: { policies: [{ name: 'global::demo-tenant', config: { tenantOptional: true } }] },
    },
    {
      method: 'GET',
      path: '/discogs/listings',
      handler: 'discogs.listings',
      config: { policies: ['global::demo-tenant'] },
    },
    {
      method: 'GET',
      path: '/discogs/search',
      handler: 'discogs.search',
      config: { policies: ['global::demo-tenant'] },
    },
    {
      method: 'POST',
      path: '/products/:id/attach-discogs-release',
      handler: 'discogs.attachRelease',
      config: { policies: ['global::demo-tenant'] },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/check-discogs-completeness',
      handler: 'discogs.checkCompleteness',
      config: { policies: ['global::demo-tenant'] },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/publish-discogs',
      handler: 'discogs.publish',
      config: { policies: ['global::demo-tenant'] },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/simulate-discogs-sale',
      handler: 'discogs.simulateSale',
      config: { policies: ['global::demo-tenant'] },
    },
  ],
};
