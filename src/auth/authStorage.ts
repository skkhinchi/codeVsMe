import type { AuthUser } from '../types/auth';

export const CURRENT_USER_KEY = 'currentUser';
export const CONTINUE_AS_GUEST_KEY = 'continueAsGuest';

export function readCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.email || !parsed.name || !parsed.sub) return null;
    return {
      sub: parsed.sub,
      name: parsed.name,
      email: parsed.email,
      picture: parsed.picture ?? '',
    };
  } catch {
    return null;
  }
}

export function writeCurrentUser(user: AuthUser): void {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.removeItem(CONTINUE_AS_GUEST_KEY);
}

export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function readContinueAsGuest(): boolean {
  return localStorage.getItem(CONTINUE_AS_GUEST_KEY) === 'true';
}

export function writeContinueAsGuest(): void {
  clearCurrentUser();
  localStorage.setItem(CONTINUE_AS_GUEST_KEY, 'true');
}

export function clearAuthSession(): void {
  clearCurrentUser();
  localStorage.removeItem(CONTINUE_AS_GUEST_KEY);
}
