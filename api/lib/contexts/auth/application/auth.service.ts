import {
  AUTH_CONSTANTS,
  generateToken,
  hashToken,
  isSessionValid,
  isMagicLinkExpired,
  isMagicLinkUsed,
  InvalidTokenError,
  SessionExpiredError,
  NotAuthorizedError,
  type AuthenticatedUser,
} from '../domain';
import type { SessionRepository } from '../infrastructure/session.repository';
import type { MagicLinkRepository } from '../infrastructure/magic-link.repository';
import type { UserRepository } from '../infrastructure/admin-user.repository';
import type { JwtService } from '../infrastructure/jwt.service';
import type { NotificationService } from '@/lib/contexts/communications/application';

export class AuthService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly magicLinkRepo: MagicLinkRepository,
    private readonly userRepo: UserRepository,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
    private readonly verifyBaseUrl: string,
    private readonly webUrl: string,
  ) {}

  /**
   * Send a magic link email. Only sends if the email belongs to an admin user.
   * Does not reveal whether the email exists — always returns silently.
   */
  async sendMagicLink(
    email: string,
    options?: {
      redirectTo?: string | null;
    },
  ): Promise<void> {
    const isAdmin = await this.userRepo.isAdmin(email);
    if (!isAdmin) return; // Silent — don't reveal who is/isn't an admin

    const { token, hash } = generateToken();
    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.MAGIC_LINK_TTL_MINUTES * 60 * 1000,
    );

    await this.magicLinkRepo.create(email, hash, expiresAt);

    const verifyUrl = new URL('/api/auth/verify', this.verifyBaseUrl);
    verifyUrl.searchParams.set('token', token);
    if (options?.redirectTo) {
      verifyUrl.searchParams.set('redirectTo', options.redirectTo);
    }

    await this.notifications.sendMagicLink(email, verifyUrl.toString());
  }

  /**
   * Verify a magic link token and create a session.
   */
  async verifyMagicLink(token: string): Promise<{ jwt: string; expiresAt: Date }> {
    const hash = hashToken(token);
    const magicLink = await this.magicLinkRepo.findByHash(hash);

    if (!magicLink) throw new InvalidTokenError();
    if (isMagicLinkUsed(magicLink)) throw new InvalidTokenError();
    if (isMagicLinkExpired(magicLink)) throw new InvalidTokenError();

    await this.magicLinkRepo.markUsed(magicLink.id);

    // Verify user exists and is admin
    const user = await this.userRepo.findByEmail(magicLink.email);
    if (!user || user.role !== 'admin') throw new NotAuthorizedError();

    const expiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.sessionRepo.evictOldest(user.id, AUTH_CONSTANTS.MAX_SESSIONS_PER_USER - 1);
    const session = await this.sessionRepo.create(user.id, expiresAt);

    const jwtToken = await this.jwt.sign({
      sub: user.id,
      sid: session.id,
      email: user.email,
      role: user.role,
    });

    return { jwt: jwtToken, expiresAt };
  }

  /**
   * Validate a JWT and return the authenticated user.
   */
  async validateSession(jwtToken: string): Promise<AuthenticatedUser> {
    const payload = await this.jwt.verify(jwtToken);
    if (!payload) throw new SessionExpiredError();

    const session = await this.sessionRepo.findById(payload.sid);
    if (!session) throw new SessionExpiredError();
    if (!isSessionValid(session)) throw new SessionExpiredError();

    this.sessionRepo.updateLastActive(session.id).catch(() => {});

    // Re-verify user status on each request (catches revoked access)
    const user = await this.userRepo.findById(payload.sub);
    if (!user || user.role !== 'admin') throw new NotAuthorizedError();

    return {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      role: user.role,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }

  getWebUrl(): string {
    return this.webUrl;
  }
}
