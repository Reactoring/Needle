import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import {
  createDiscogsConnector,
  validateListingPayload,
  type CompletenessResult,
  type DiscogsConnector,
} from '../../../lib/discogs';

const { NotFoundError, ValidationError, ForbiddenError } = errors;

const CHANNEL = 'discogs';

type SyncAction =
  | 'search_release'
  | 'attach_release'
  | 'check_completeness'
  | 'publish_listing'
  | 'simulate_sale'
  | 'mark_out_of_stock';

interface LogInput {
  tenantId: string;
  action: SyncAction;
  status: 'success' | 'error';
  message: string;
  payload?: Record<string, unknown>;
  productId?: string;
  unitId?: string;
  listingId?: string;
}

let connector: DiscogsConnector | null = null;

// Instancie le connecteur une seule fois, d'apres l'environnement.
function getConnector(): DiscogsConnector {
  if (!connector) {
    connector = createDiscogsConnector({
      mode: process.env.DISCOGS_MODE,
    });
  }
  return connector;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getMode(): string {
    return getConnector().mode;
  },

  // Toutes les operations passent par ici : un tenant inconnu ou inactif est rejete.
  async requireTenant(tenantId: string | undefined) {
    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }
    const tenant = await strapi.documents('api::tenant.tenant').findOne({
      documentId: tenantId,
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant ${tenantId} not found`);
    }
    if (!tenant.active) {
      throw new ForbiddenError(`Tenant ${tenant.slug} is inactive`);
    }
    return tenant;
  },

  async logEvent(input: LogInput) {
    await strapi.documents('api::marketplace-sync-event.marketplace-sync-event').create({
      data: {
        tenant: input.tenantId,
        channel: CHANNEL,
        action: input.action,
        status: input.status,
        message: input.message,
        payload: input.payload ?? null,
        product: input.productId ?? null,
        sellableUnit: input.unitId ?? null,
        channelListing: input.listingId ?? null,
        happenedAt: new Date().toISOString(),
      } as any,
    });
  },

  async findUnitForTenant(tenantId: string, unitId: string) {
    const unit = await strapi.documents('api::sellable-unit.sellable-unit').findFirst({
      filters: {
        documentId: { $eq: unitId },
        tenant: { documentId: { $eq: tenantId } },
      },
      populate: ['product', 'tenant'],
    });
    if (!unit) {
      throw new NotFoundError(`Sellable unit ${unitId} not found for this tenant`);
    }
    return unit;
  },

  async findListingForUnit(tenantId: string, unitId: string) {
    return strapi.documents('api::channel-listing.channel-listing').findFirst({
      filters: {
        channel: { $eq: CHANNEL },
        sellableUnit: { documentId: { $eq: unitId } },
        tenant: { documentId: { $eq: tenantId } },
      },
    });
  },

  async listListings(tenantId: string, status?: string) {
    await this.requireTenant(tenantId);
    return strapi.documents('api::channel-listing.channel-listing').findMany({
      filters: {
        channel: { $eq: CHANNEL },
        tenant: { documentId: { $eq: tenantId } },
        ...(status ? { status: { $eq: status } } : {}),
      },
      populate: { sellableUnit: { populate: ['product'] } },
      sort: 'updatedAt:desc',
    } as any);
  },

  async searchReleases(tenantId: string, query: string) {
    const tenant = await this.requireTenant(tenantId);
    if (!query || !query.trim()) {
      throw new ValidationError('query parameter "q" is required');
    }

    try {
      const results = await getConnector().searchReleases(query);
      await this.logEvent({
        tenantId: tenant.documentId,
        action: 'search_release',
        status: 'success',
        message: `Search "${query}" returned ${results.length} release(s)`,
        payload: { query, resultCount: results.length, mode: getConnector().mode },
      });
      return { mode: getConnector().mode, results };
    } catch (error) {
      await this.logEvent({
        tenantId: tenant.documentId,
        action: 'search_release',
        status: 'error',
        message: `Search "${query}" failed: ${(error as Error).message}`,
        payload: { query },
      });
      throw error;
    }
  },

  async attachRelease(tenantId: string, productId: string, releaseId: string) {
    const tenant = await this.requireTenant(tenantId);
    if (!releaseId) {
      throw new ValidationError('releaseId is required');
    }

    const product = await strapi.documents('api::product.product').findFirst({
      filters: {
        documentId: { $eq: productId },
        tenant: { documentId: { $eq: tenantId } },
      },
    });
    if (!product) {
      throw new NotFoundError(`Product ${productId} not found for this tenant`);
    }

    const release = await getConnector().getRelease(releaseId);
    if (!release) {
      await this.logEvent({
        tenantId: tenant.documentId,
        action: 'attach_release',
        status: 'error',
        message: `Release ${releaseId} not found on Discogs`,
        productId: product.documentId,
      });
      throw new NotFoundError(`Discogs release ${releaseId} not found`);
    }

    // On complete la fiche avec les infos de la release sans ecraser
    // ce que le vendeur a deja saisi.
    const updated = await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data: {
        discogsReleaseId: release.releaseId,
        discogsMasterId: release.masterId ?? product.discogsMasterId,
        label: product.label ?? release.label,
        year: product.year ?? release.year,
        country: product.country ?? release.country,
        format: product.format ?? release.format,
      } as any,
    });

    await this.logEvent({
      tenantId: tenant.documentId,
      action: 'attach_release',
      status: 'success',
      message: `Release ${release.releaseId} (${release.artist} - ${release.title}) attached to product`,
      payload: { releaseId: release.releaseId, masterId: release.masterId },
      productId: product.documentId,
    });

    return { product: updated, release };
  },

  async checkCompleteness(tenantId: string, unitId: string): Promise<CompletenessResult> {
    const tenant = await this.requireTenant(tenantId);
    const unit = await this.findUnitForTenant(tenantId, unitId);

    const result = validateListingPayload(unit as any, (unit as any).product);

    await this.logEvent({
      tenantId: tenant.documentId,
      action: 'check_completeness',
      status: 'success',
      message: result.complete
        ? `Unit ${unit.sku} is ready to be published on Discogs`
        : `Unit ${unit.sku} is incomplete: ${[...result.missing, ...result.errors].join(', ')}`,
      payload: result as unknown as Record<string, unknown>,
      unitId: unit.documentId,
      productId: (unit as any).product?.documentId,
    });

    return result;
  },

  async publish(tenantId: string, unitId: string) {
    const tenant = await this.requireTenant(tenantId);
    const unit = await this.findUnitForTenant(tenantId, unitId);
    const product = (unit as any).product;

    const completeness = validateListingPayload(unit as any, product);
    if (!completeness.complete) {
      const reason = [...completeness.missing, ...completeness.errors].join(', ');
      await this.logEvent({
        tenantId: tenant.documentId,
        action: 'publish_listing',
        status: 'error',
        message: `Publish refused for ${unit.sku}: ${reason}`,
        payload: completeness as unknown as Record<string, unknown>,
        unitId: unit.documentId,
        productId: product?.documentId,
      });
      throw new ValidationError(`Unit is not publishable: ${reason}`);
    }

    const published = await getConnector().publishListing({
      sku: unit.sku as string,
      releaseId: product.discogsReleaseId,
      price: unit.price as number,
      currency: unit.currency as string,
      mediaCondition: unit.mediaCondition as string,
      sleeveCondition: unit.sleeveCondition ?? undefined,
      comment: unit.sellerComment ?? undefined,
    });

    const listingData = {
      tenant: tenant.documentId,
      sellableUnit: unit.documentId,
      channel: CHANNEL,
      status: 'published',
      externalListingId: published.externalListingId,
      externalUrl: published.externalUrl,
      publishedPrice: published.publishedPrice,
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    };

    const existing = await this.findListingForUnit(tenantId, unitId);
    const listing = existing
      ? await strapi.documents('api::channel-listing.channel-listing').update({
          documentId: existing.documentId,
          data: listingData as any,
        })
      : await strapi.documents('api::channel-listing.channel-listing').create({
          data: listingData as any,
        });
    if (!listing) {
      throw new Error('Failed to persist channel listing');
    }

    await this.logEvent({
      tenantId: tenant.documentId,
      action: 'publish_listing',
      status: 'success',
      message: `Unit ${unit.sku} published on Discogs as ${published.externalListingId}`,
      payload: { ...published, mode: getConnector().mode },
      unitId: unit.documentId,
      productId: product.documentId,
      listingId: listing.documentId,
    });

    return { listing, mode: getConnector().mode };
  },

  async simulateSale(tenantId: string, unitId: string) {
    const tenant = await this.requireTenant(tenantId);
    const unit = await this.findUnitForTenant(tenantId, unitId);

    const listing = await this.findListingForUnit(tenantId, unitId);
    if (!listing || listing.status !== 'published') {
      throw new ValidationError(
        `Unit ${unit.sku} has no published Discogs listing, nothing to sell`,
      );
    }

    const soldUnit = await strapi.documents('api::sellable-unit.sellable-unit').update({
      documentId: unit.documentId,
      data: { saleStatus: 'sold', quantity: 0 } as any,
    });

    const removedListing = await strapi.documents('api::channel-listing.channel-listing').update({
      documentId: listing.documentId,
      data: { status: 'removed', lastSyncedAt: new Date().toISOString() } as any,
    });

    await this.logEvent({
      tenantId: tenant.documentId,
      action: 'simulate_sale',
      status: 'success',
      message: `Discogs sale simulated for ${unit.sku} (listing ${listing.externalListingId})`,
      payload: { externalListingId: listing.externalListingId },
      unitId: unit.documentId,
      listingId: listing.documentId,
    });

    await this.logEvent({
      tenantId: tenant.documentId,
      action: 'mark_out_of_stock',
      status: 'success',
      message: `Unit ${unit.sku} marked as sold, local stock set to 0`,
      payload: { saleStatus: 'sold', quantity: 0 },
      unitId: unit.documentId,
      listingId: listing.documentId,
    });

    return { unit: soldUnit, listing: removedListing };
  },
});
