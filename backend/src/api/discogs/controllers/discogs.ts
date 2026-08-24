import type { Core } from '@strapi/strapi';

// Le tenant est passe explicitement sur chaque appel (query ou body) :
// pas de tenant, pas de donnee.
function tenantIdFrom(ctx: any): string | undefined {
  return ctx.request.query?.tenantId ?? ctx.request.body?.tenantId;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  service() {
    return strapi.service('api::discogs.discogs') as any;
  },

  async info(ctx: any) {
    ctx.body = { channel: 'discogs', mode: this.service().getMode() };
  },

  async listings(ctx: any) {
    const { status } = ctx.request.query;
    ctx.body = await this.service().listListings(tenantIdFrom(ctx), status);
  },

  async search(ctx: any) {
    const { q } = ctx.request.query;
    ctx.body = await this.service().searchReleases(tenantIdFrom(ctx), q);
  },

  async attachRelease(ctx: any) {
    const { id } = ctx.params;
    const { releaseId } = ctx.request.body ?? {};
    ctx.body = await this.service().attachRelease(tenantIdFrom(ctx), id, releaseId);
  },

  async checkCompleteness(ctx: any) {
    const { id } = ctx.params;
    ctx.body = await this.service().checkCompleteness(tenantIdFrom(ctx), id);
  },

  async publish(ctx: any) {
    const { id } = ctx.params;
    ctx.body = await this.service().publish(tenantIdFrom(ctx), id);
  },

  async simulateSale(ctx: any) {
    const { id } = ctx.params;
    ctx.body = await this.service().simulateSale(tenantIdFrom(ctx), id);
  },
});
