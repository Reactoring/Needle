import type { Core } from '@strapi/strapi';

// Seed idempotent : cree un tenant de demo avec une fiche vinyle et une unite
// vendable prets a derouler le workflow Discogs. Ne fait rien si le tenant existe.
export async function seedDemoData(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::tenant.tenant').findFirst({
    filters: { slug: { $eq: 'demo-records' } },
  });
  if (existing) {
    strapi.log.info(`[seed] Demo tenant already present (documentId: ${existing.documentId})`);
    return;
  }

  const tenant = await strapi.documents('api::tenant.tenant').create({
    data: { name: 'Demo Records', slug: 'demo-records', active: true },
  });

  const product = await strapi.documents('api::product.product').create({
    data: {
      tenant: tenant.documentId,
      productType: 'vinyl',
      title: 'Discovery',
      artist: 'Daft Punk',
      description: 'Second album studio, pressage original europeen.',
      label: 'Virgin',
      year: 2001,
      country: 'France',
      format: '2xLP',
    } as any,
  });

  // Le SKU est pose par le lifecycle beforeCreate de sellable-unit.
  const unit = await strapi.documents('api::sellable-unit.sellable-unit').create({
    data: {
      tenant: tenant.documentId,
      product: product.documentId,
      price: 34.99,
      currency: 'EUR',
      mediaCondition: 'near_mint',
      sleeveCondition: 'very_good_plus',
      sellerComment: 'Tres bel exemplaire, pochette legerement marquee sur un coin.',
      saleStatus: 'available',
      quantity: 1,
      internalLocation: 'BAC-A-12',
    } as any,
  });

  strapi.log.info('[seed] Demo data created:');
  strapi.log.info(`[seed]   tenant  "Demo Records"        documentId: ${tenant.documentId}`);
  strapi.log.info(`[seed]   product "Daft Punk - Discovery" documentId: ${product.documentId}`);
  strapi.log.info(`[seed]   unit    ${unit.sku}             documentId: ${unit.documentId}`);
}
