import type { Core } from '@strapi/strapi';

interface DemoProductFixture {
  reference: string;
  title: string;
  artist: string;
  description: string;
  label: string;
  year: number;
  country: string;
  format: string;
  releaseId?: string;
  price: number;
  mediaCondition: string;
  sleeveCondition: string;
  saleStatus: 'available' | 'reserved' | 'sold';
  quantity: number;
  location: string;
  listingStatus?: 'published' | 'removed';
}

interface DemoTenantFixture {
  name: string;
  slug: string;
  products: DemoProductFixture[];
}

export const DEMO_TENANT_SLUGS = ['demo-records', 'second-groove'] as const;

const DEMO_TENANTS: DemoTenantFixture[] = [
  {
    name: 'Demo Records',
    slug: 'demo-records',
    products: [
      {
        reference: 'DR-001',
        title: 'Night Transit',
        artist: 'Neon Meridian',
        description: 'A warm electronic double album with late-night city textures.',
        label: 'Aster Sound',
        year: 1998,
        country: 'France',
        format: '2xLP',
        releaseId: '910001',
        price: 34.99,
        mediaCondition: 'near_mint',
        sleeveCondition: 'very_good_plus',
        saleStatus: 'available',
        quantity: 1,
        location: 'BAC-A-12',
        listingStatus: 'published',
      },
      {
        reference: 'DR-002',
        title: 'Static Bloom',
        artist: 'The Amber Echoes',
        description: 'Textured art rock recorded with an intimate analogue sound.',
        label: 'Copperline',
        year: 1977,
        country: 'United Kingdom',
        format: 'LP',
        releaseId: '910002',
        price: 27.5,
        mediaCondition: 'very_good_plus',
        sleeveCondition: 'very_good',
        saleStatus: 'available',
        quantity: 1,
        location: 'BAC-B-04',
      },
      {
        reference: 'DR-003',
        title: 'Orbits',
        artist: 'Lila Nova',
        description: 'A contemporary synth record awaiting release matching.',
        label: 'Parallel Lines',
        year: 2022,
        country: 'France',
        format: 'LP',
        price: 22,
        mediaCondition: 'mint',
        sleeveCondition: 'mint',
        saleStatus: 'available',
        quantity: 1,
        location: 'NEW-03',
      },
      {
        reference: 'DR-004',
        title: 'Concrete Seasons',
        artist: 'Marble Choir',
        description: 'A sold post-punk title kept to demonstrate listing history.',
        label: 'North Arcade',
        year: 1982,
        country: 'Belgium',
        format: 'LP',
        releaseId: '910003',
        price: 31,
        mediaCondition: 'very_good',
        sleeveCondition: 'very_good',
        saleStatus: 'sold',
        quantity: 0,
        location: 'ARCHIVE-02',
        listingStatus: 'removed',
      },
    ],
  },
  {
    name: 'Second Groove',
    slug: 'second-groove',
    products: [
      {
        reference: 'SG-001',
        title: 'Cold Signals',
        artist: 'Northbound Assembly',
        description: 'Minimal wave and precise machine rhythms from Berlin.',
        label: 'Polar Circuit',
        year: 1984,
        country: 'Germany',
        format: 'LP',
        releaseId: '920001',
        price: 42,
        mediaCondition: 'near_mint',
        sleeveCondition: 'near_mint',
        saleStatus: 'available',
        quantity: 1,
        location: 'WALL-07',
        listingStatus: 'published',
      },
      {
        reference: 'SG-002',
        title: 'Sunday Lines',
        artist: 'Solara Quartet',
        description: 'A relaxed jazz session with bright Brazilian harmonies.',
        label: 'Blue Veranda',
        year: 1969,
        country: 'Brazil',
        format: 'LP',
        releaseId: '920002',
        price: 49.9,
        mediaCondition: 'very_good_plus',
        sleeveCondition: 'good_plus',
        saleStatus: 'reserved',
        quantity: 1,
        location: 'JAZZ-11',
      },
      {
        reference: 'SG-003',
        title: 'Soft Collision',
        artist: 'Paper Satellites',
        description: 'Dream-pop layers awaiting a marketplace release match.',
        label: 'Quiet Current',
        year: 2015,
        country: 'Canada',
        format: 'LP',
        price: 19.5,
        mediaCondition: 'very_good_plus',
        sleeveCondition: 'very_good_plus',
        saleStatus: 'available',
        quantity: 1,
        location: 'INDIE-08',
      },
      {
        reference: 'SG-004',
        title: 'Glass District',
        artist: 'Mira Vale',
        description: 'Luminous ambient pop presented as a ready-to-publish example.',
        label: 'Halflight Editions',
        year: 2020,
        country: 'Netherlands',
        format: '2xLP',
        releaseId: '920003',
        price: 38,
        mediaCondition: 'mint',
        sleeveCondition: 'near_mint',
        saleStatus: 'available',
        quantity: 1,
        location: 'NEW-14',
        listingStatus: 'published',
      },
    ],
  },
];

async function ensureTenant(strapi: Core.Strapi, fixture: DemoTenantFixture) {
  const existing = await strapi.documents('api::tenant.tenant').findFirst({
    filters: { slug: { $eq: fixture.slug } },
  });
  if (existing) return existing;

  return strapi.documents('api::tenant.tenant').create({
    data: { name: fixture.name, slug: fixture.slug, active: true },
  });
}

async function ensureProduct(
  strapi: Core.Strapi,
  tenantId: string,
  fixture: DemoProductFixture,
) {
  const existing = await strapi.documents('api::product.product').findFirst({
    filters: {
      tenant: { documentId: { $eq: tenantId } },
      catalogReference: { $eq: fixture.reference },
    },
  });
  if (existing) return existing;

  return strapi.documents('api::product.product').create({
    data: {
      tenant: tenantId,
      productType: 'vinyl',
      title: fixture.title,
      artist: fixture.artist,
      description: fixture.description,
      label: fixture.label,
      year: fixture.year,
      country: fixture.country,
      format: fixture.format,
      catalogReference: fixture.reference,
      discogsReleaseId: fixture.releaseId ?? null,
    } as any,
  });
}

async function ensureUnit(
  strapi: Core.Strapi,
  tenantId: string,
  productId: string,
  fixture: DemoProductFixture,
) {
  const existing = await strapi.documents('api::sellable-unit.sellable-unit').findFirst({
    filters: {
      tenant: { documentId: { $eq: tenantId } },
      product: { documentId: { $eq: productId } },
    },
  });
  if (existing) return existing;

  return strapi.documents('api::sellable-unit.sellable-unit').create({
    data: {
      tenant: tenantId,
      product: productId,
      price: fixture.price,
      currency: 'EUR',
      mediaCondition: fixture.mediaCondition,
      sleeveCondition: fixture.sleeveCondition,
      sellerComment: 'Fictitious demo inventory item.',
      saleStatus: fixture.saleStatus,
      quantity: fixture.quantity,
      internalLocation: fixture.location,
    } as any,
  });
}

async function ensureListing(
  strapi: Core.Strapi,
  tenantId: string,
  productId: string,
  unit: any,
  fixture: DemoProductFixture,
) {
  if (!fixture.listingStatus) return null;

  const existing = await strapi.documents('api::channel-listing.channel-listing').findFirst({
    filters: {
      tenant: { documentId: { $eq: tenantId } },
      sellableUnit: { documentId: { $eq: unit.documentId } },
      channel: { $eq: 'discogs' },
    },
  });
  if (existing) return existing;

  const listingCode = fixture.reference.toLowerCase();
  const listing = await strapi.documents('api::channel-listing.channel-listing').create({
    data: {
      tenant: tenantId,
      sellableUnit: unit.documentId,
      channel: 'discogs',
      status: fixture.listingStatus,
      externalListingId: `demo-listing-${listingCode}`,
      externalUrl: `https://example.invalid/discogs/listings/demo-listing-${listingCode}`,
      publishedPrice: fixture.price,
      lastSyncedAt: new Date().toISOString(),
    } as any,
  });

  await strapi.documents('api::marketplace-sync-event.marketplace-sync-event').create({
    data: {
      tenant: tenantId,
      channel: 'discogs',
      action: fixture.listingStatus === 'published' ? 'publish_listing' : 'mark_out_of_stock',
      status: 'success',
      product: productId,
      sellableUnit: unit.documentId,
      channelListing: listing.documentId,
      message:
        fixture.listingStatus === 'published'
          ? `${unit.sku} published in the simulated marketplace`
          : `${unit.sku} removed after a simulated sale`,
      payload: { mode: 'mock', fixture: fixture.reference },
      happenedAt: new Date().toISOString(),
    } as any,
  });

  return listing;
}

export async function seedDemoData(strapi: Core.Strapi) {
  for (const tenantFixture of DEMO_TENANTS) {
    const tenant = await ensureTenant(strapi, tenantFixture);

    for (const productFixture of tenantFixture.products) {
      const product = await ensureProduct(strapi, tenant.documentId, productFixture);
      const unit = await ensureUnit(
        strapi,
        tenant.documentId,
        product.documentId,
        productFixture,
      );
      await ensureListing(
        strapi,
        tenant.documentId,
        product.documentId,
        unit,
        productFixture,
      );
    }

    strapi.log.info(`[demo] ${tenantFixture.name} is ready (${tenant.documentId})`);
  }
}

async function deleteDocumentsForTenant(strapi: Core.Strapi, uid: string, tenantId: string) {
  const documents = await (strapi.documents as any)(uid).findMany({
    filters: { tenant: { documentId: { $eq: tenantId } } },
    pagination: { pageSize: 1000 },
  });
  for (const document of documents) {
    await (strapi.documents as any)(uid).delete({ documentId: document.documentId });
  }
}

export async function resetDemoData(strapi: Core.Strapi) {
  for (const slug of DEMO_TENANT_SLUGS) {
    const tenant = await strapi.documents('api::tenant.tenant').findFirst({
      filters: { slug: { $eq: slug } },
    });
    if (!tenant) continue;

    for (const uid of [
      'api::marketplace-sync-event.marketplace-sync-event',
      'api::channel-listing.channel-listing',
      'api::sellable-unit.sellable-unit',
      'api::product.product',
    ]) {
      await deleteDocumentsForTenant(strapi, uid, tenant.documentId);
    }

    await strapi.documents('api::tenant.tenant').delete({ documentId: tenant.documentId });
  }

  await seedDemoData(strapi);
}
