// src/services/userService.js
//
// Tiny helper around the "lazy provisioning" bootstrap endpoint.
//
// Parent product owns real login (Forgecrux SSO). When the user clicks
// "Start Testing" on the home page, we:
//   1. Hit the admin API to fetch their canonical profile
//   2. Upsert them in our local `users` collection (so X-User-Id validation
//      passes on every subsequent endpoint)
//   3. Cache the profile in localStorage using the EXACT same keys our
//      Profile page already reads — zero UI change needed there.

import { requestApi } from '../lib/apiClient';

// Keys the existing Profile page already reads. Keep in sync!
const LS = {
  isLoggedIn:       'isLoggedIn',
  userId:           'userId',
  userEmail:        'userEmail',
  userName:         'userName',
  userFirstName:    'userFirstName',
  userLastName:     'userLastName',
  userRole:         'userRole',
  userOrganization: 'userOrganization',
  userDetails:      'userDetails',
};

function writeAll(d) {
  localStorage.setItem(LS.isLoggedIn,       'true');
  if (d.userId)           localStorage.setItem(LS.userId,           d.userId);
  if (d.email)            localStorage.setItem(LS.userEmail,        d.email);
  if (d.name)             localStorage.setItem(LS.userName,         d.name);
  // Profile page displays `userFirstName` — split on first space.
  if (d.name) {
    const [first, ...rest] = String(d.name).trim().split(/\s+/);
    localStorage.setItem(LS.userFirstName, first || d.name);
    if (rest.length) localStorage.setItem(LS.userLastName, rest.join(' '));
  }
  if (d.role)             localStorage.setItem(LS.userRole,         d.role);
  if (d.organizationName) localStorage.setItem(LS.userOrganization, d.organizationName);
  localStorage.setItem(LS.userDetails, JSON.stringify(d));
}

/** First-time provisioning: external lookup + local upsert + cache. */
export async function bootstrapUser(email) {
  if (!email) throw new Error('Email is required to start testing.');
  const { data } = await requestApi.get('/api/v1/requests/users/bootstrap', {
    params: { email },
  });
  if (!data?.userId) throw new Error('Bootstrap returned no userId.');
  writeAll(data);
  return data;
}

/** Always-fresh profile lookup. Used by Profile page hard-refresh. */
export async function fetchCurrentUser() {
  const { data } = await requestApi.get('/api/v1/requests/users/me');
  writeAll(data);
  return data;
}

/** Synchronous read from localStorage. `null` if not bootstrapped yet. */
export function cachedUser() {
  try { return JSON.parse(localStorage.getItem(LS.userDetails) || 'null'); }
  catch { return null; }
}

export function getUserId()    { return localStorage.getItem(LS.userId); }
export function getUserEmail() { return localStorage.getItem(LS.userEmail); }

export function clearUser() {
  Object.values(LS).forEach(k => localStorage.removeItem(k));
}
