import type { Core } from '@strapi/strapi';
import { DEMO_SESSION_COOKIE } from '../lib/demo-session';

export default (_config: unknown, _context: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const token = ctx.cookies.get(DEMO_SESSION_COOKIE);
    if (token && !ctx.request.headers.authorization) {
      ctx.request.headers.authorization = `Bearer ${token}`;
    }
    await next();
  };
};
