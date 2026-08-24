// Endpoints du workflow Discogs.
// auth: false pour permettre de derouler le parcours de test sans token API
// (choix assume pour le test technique, a remplacer par de vraies permissions en prod).
export default {
  routes: [
    {
      method: 'GET',
      path: '/discogs/info',
      handler: 'discogs.info',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/discogs/listings',
      handler: 'discogs.listings',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/discogs/search',
      handler: 'discogs.search',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/products/:id/attach-discogs-release',
      handler: 'discogs.attachRelease',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/check-discogs-completeness',
      handler: 'discogs.checkCompleteness',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/publish-discogs',
      handler: 'discogs.publish',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/sellable-units/:id/simulate-discogs-sale',
      handler: 'discogs.simulateSale',
      config: { auth: false },
    },
  ],
};
