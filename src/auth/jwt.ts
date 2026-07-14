import type { AuthUser, GoogleJwtPayload } from '../types/auth';

/** Decode a GIS credential JWT client-side (display only — not cryptographically verified). */
export function decodeJwtPayload(credential: string): GoogleJwtPayload {
  const parts = credential.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT credential');
  }

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const json = new TextDecoder().decode(
    Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)),
  );

  return JSON.parse(json) as GoogleJwtPayload;
}

export function authUserFromCredential(credential: string): AuthUser {
  const payload = decodeJwtPayload(credential);
  const email = payload.email?.trim();
  if (!email) {
    throw new Error('Google credential is missing an email');
  }

  return {
    sub: payload.sub,
    email,
    name: payload.name?.trim() || payload.given_name?.trim() || email,
    picture: payload.picture?.trim() || '',
  };
}
