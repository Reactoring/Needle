import type { Core } from '@strapi/strapi';
import { DEMO_TENANT_SLUGS } from '../../../bootstrap/seed';
import { DEMO_USER_EMAIL } from '../../../bootstrap/demo-access';
import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_MAX_AGE_MS,
  isDemoUser,
} from '../../../lib/demo-session';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async session(ctx: any) {
    const jwtService = strapi.plugin('users-permissions').service('jwt');
    const userService = strapi.plugin('users-permissions').service('user');
    let token = ctx.cookies.get(DEMO_SESSION_COOKIE);
    let user = null;

    if (token) {
      try {
        const payload = await jwtService.verify(token);
        user = await userService.fetchAuthenticatedUser(payload.id);
        if (!isDemoUser(user)) user = null;
      } catch {
        token = null;
      }
    }

    if (!user) {
      user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: DEMO_USER_EMAIL },
        populate: ['role'],
      });
      if (!user) {
        ctx.throw(503, 'Demo access has not been provisioned');
      }
      token = await jwtService.issue({ id: user.id });
    }

    ctx.cookies.set(DEMO_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      overwrite: true,
      maxAge: DEMO_SESSION_MAX_AGE_MS,
    });

    const tenants = await strapi.documents('api::tenant.tenant').findMany({
      filters: { slug: { $in: [...DEMO_TENANT_SLUGS] }, active: { $eq: true } },
      sort: 'name:asc',
      pagination: { pageSize: DEMO_TENANT_SLUGS.length },
    });

    ctx.body = {
      mode: 'demo',
      expiresInSeconds: Math.floor(DEMO_SESSION_MAX_AGE_MS / 1000),
      tenants,
    };
  },
});
