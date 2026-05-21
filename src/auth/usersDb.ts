import { UserRecord } from './auth.service';

/**
 * Backing store for registered users. Keyed by lowercased email so lookup
 * during login is case-insensitive. In-memory only — like {@link tasksDb},
 * data does not survive a process restart.
 */
const users = new Map<string, UserRecord>();

/**
 * Thin repository over {@link users}. Kept separate from auth.service so the
 * service layer can be tested without owning storage concerns.
 */
export const usersDb = {
  /** @returns the user with the given email, or `undefined` if unknown. */
  findByEmail(email: string): UserRecord | undefined {
    return users.get(email.toLowerCase());
  },

  /** Insert a fully-formed user record. Caller owns id/hash generation. */
  create(user: UserRecord): UserRecord {
    users.set(user.email.toLowerCase(), user);
    return user;
  },

  /** Test-only helper — wipes the store. See {@link tasksDb._reset}. */
  _reset(): void {
    users.clear();
  },
};
