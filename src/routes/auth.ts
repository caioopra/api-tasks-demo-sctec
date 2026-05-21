import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { credentialsSchema } from '../schemas/auth';
import { usersDb } from '../auth/usersDb';
import {
  UserRecord,
  hashPassword,
  signToken,
  verifyPassword,
} from '../auth/auth.service';
import { HttpError } from '../middlewares/errorHandler';

/**
 * Router for authentication endpoints. Mounted at `/auth` in
 * {@link createApp}. Both routes are public — they are the only way to
 * obtain a token that later satisfies {@link jwtMiddleware}.
 */
export const authRouter = Router();

/**
 * `POST /auth/register` — create an account and return a token.
 *
 * @returns
 * - 201 with `{ user: PublicUser, token: string }` on success.
 * - 400 when the body fails validation.
 * - 409 when the email is already registered.
 */
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password } = credentialsSchema.parse(req.body);
  const normalised = email.toLowerCase();
  if (usersDb.findByEmail(normalised)) {
    throw new HttpError(409, 'email already registered');
  }
  const user: UserRecord = {
    id: randomUUID(),
    email: normalised,
    passwordHash: hashPassword(password),
  };
  usersDb.create(user);
  const publicUser = { id: user.id, email: user.email };
  res.status(201).json({ user: publicUser, token: signToken(publicUser) });
});

/**
 * `POST /auth/login` — exchange credentials for a token.
 *
 * @returns
 * - 200 with `{ user: PublicUser, token: string }` on success.
 * - 400 when the body fails validation.
 * - 401 when email is unknown or password does not match. The same message
 *   is used for both cases so the response does not reveal which one failed.
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = credentialsSchema.parse(req.body);
  const user = usersDb.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'invalid email or password');
  }
  const publicUser = { id: user.id, email: user.email };
  res.status(200).json({ user: publicUser, token: signToken(publicUser) });
});
