/* ================================================================
   AUTH STORE — Single source of truth for session + user store
   ================================================================
   - Deterministic token generation (no randomness)
   - localStorage-backed user store, initialized from fixtures
   - 12-hour session expiry
   ================================================================ */

import type { User, Org } from "./mock-data";
import { mockUsers, mockOrgs } from "./mock-data";

/* ---------- Storage Keys ---------- */
const SESSION_KEY = "aurumshield:session";
const USERS_KEY = "aurumshield:users";
const ORGS_KEY = "aurumshield:orgs";

/* ---------- Session Type ---------- */
export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

/* ---------- Internal Helpers ---------- */
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Initialize users store from fixtures if not present */
function ensureUsersStore(): User[] {
  if (!isBrowser()) return mockUsers;
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try { return JSON.parse(raw) as User[]; } catch { /* fall through */ }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  return mockUsers;
}

/** Initialize orgs store from fixtures if not present */
function ensureOrgsStore(): Org[] {
  if (!isBrowser()) return mockOrgs;
  const raw = localStorage.getItem(ORGS_KEY);
  if (raw) {
    try { return JSON.parse(raw) as Org[]; } catch { /* fall through */ }
  }
  localStorage.setItem(ORGS_KEY, JSON.stringify(mockOrgs));
  return mockOrgs;
}

/* ================================================================
   PUBLIC API
   ================================================================ */

/** Create a new session for a given userId. Token is deterministic. */
export function createSession(userId: string): Session {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const token = `sess_${userId}_${expiresAt}`;
  const session: Session = { token, userId, expiresAt };
  if (isBrowser()) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

/** Retrieve current session, or null if not present / expired. */
export function getSession(): Session | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      // Expired — clean up
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/** Get the current user's ID, or null if no valid session. */
export function getCurrentUserId(): string | null {
  const session = getSession();
  return session?.userId ?? null;
}

/** Get the current User object, or null if no valid session. */
export function getCurrentUser(): User | null {
  const userId = getCurrentUserId();
  if (!userId) return null;
  const users = ensureUsersStore();
  return users.find((u) => u.id === userId) ?? null;
}

/**
 * Get the current User object or throw.
 * Use in UI where auth is guaranteed by <RequireAuth>.
 */
export function requireUser(): User {
  const user = getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED: No authenticated user");
  return user;
}

/** Get the Org for a given orgId. */
export function getOrg(orgId: string): Org | null {
  const orgs = ensureOrgsStore();
  return orgs.find((o) => o.id === orgId) ?? null;
}

/** Destroy the current session. */
export function logout(): void {
  if (isBrowser()) {
    localStorage.removeItem(SESSION_KEY);
  }
}

/* ---------- User Store Management ---------- */

/** Get all users from localStorage-backed store. */
export function getAllUsers(): User[] {
  return ensureUsersStore();
}

/** Find user by email (case-insensitive). */
export function findUserByEmail(email: string): User | null {
  const users = ensureUsersStore();
  const normalized = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

/** Add a new user to the store + persist. Returns the created user. */
export function addUser(user: User): User {
  const users = ensureUsersStore();
  users.push(user);
  if (isBrowser()) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return user;
}

/** Add a new org to the store + persist. */
export function addOrg(org: Org): Org {
  const orgs = ensureOrgsStore();
  orgs.push(org);
  if (isBrowser()) {
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
  }
  return org;
}

/** Update a user in the store (by id). */
export function updateUser(userId: string, patch: Partial<User>): User | null {
  const users = ensureUsersStore();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch };
  if (isBrowser()) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return users[idx];
}
