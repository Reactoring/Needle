import { DEMO_ROLE_TYPE, DEMO_USER_EMAIL } from '../bootstrap/demo-access';

export const DEMO_SESSION_COOKIE = 'vinyl_demo_session';
export const DEMO_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

export function isDemoUser(user: any): boolean {
  return user?.email === DEMO_USER_EMAIL && user?.role?.type === DEMO_ROLE_TYPE;
}
