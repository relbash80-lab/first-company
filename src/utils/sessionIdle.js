export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
export const IDLE_LOGOUT_NOTICE_KEY = 'first-company-idle-logout';

export function idleTimeRemaining(lastActivity, now = Date.now()) {
  return Math.max(0, IDLE_TIMEOUT_MS - Math.max(0, now - lastActivity));
}
