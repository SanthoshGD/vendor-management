import type { Vendor } from '../types/vendor';

const toBase64Url = (text: string): string =>
  btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (encoded: string): string => {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))));
};

export function encodeInvite(vendor: Vendor): string {
  return toBase64Url(JSON.stringify({
    v: vendor.id,
    n: vendor.name,
    e: vendor.email,
    c: vendor.country,
    k: vendor.category,
    p: vendor.checklistId,
  }));
}

export function inviteUrl(vendor: Vendor): string {
  const origin = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : 'http://localhost:3000/';
  return `${origin}#/invite/${encodeInvite(vendor)}`;
}

export interface InvitePayload {
  v: string;
  n: string;
  e: string;
  c: string;
  k: string;
  p?: string;
}

export function readInviteFromUrl(): InvitePayload | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const match = hash.match(/#\/?invite\/(.+)$/);
  if (!match) return null;
  try {
    return JSON.parse(fromBase64Url(match[1])) as InvitePayload;
  } catch {
    return null;
  }
}
