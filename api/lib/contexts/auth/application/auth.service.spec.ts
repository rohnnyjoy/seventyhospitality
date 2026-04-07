import { AuthService } from './auth.service';
import { InvalidTokenError, SessionExpiredError, NotAuthorizedError, hashToken } from '../domain';
import type { SessionRepository } from '../infrastructure/session.repository';
import type { MagicLinkRepository } from '../infrastructure/magic-link.repository';
import type { AdminUserRepository } from '../infrastructure/admin-user.repository';
import type { JwtService } from '../infrastructure/jwt.service';
import type { NotificationService } from '@/lib/contexts/communications/application';

function mockSessionRepo(): SessionRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'ses_1',
      userId: 'usr_1',
      email: 'admin@example.com',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
      createdAt: new Date(),
    }),
    findById: vi.fn(),
    updateLastActive: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    evictOldest: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionRepository;
}

function mockMagicLinkRepo(): MagicLinkRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByHash: vi.fn(),
    markUsed: vi.fn().mockResolvedValue(undefined),
  } as unknown as MagicLinkRepository;
}

function mockAdminUserRepo(exists = true): AdminUserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(
      exists ? { id: 'adm_1', email: 'admin@example.com', name: 'Admin', role: 'admin' } : null,
    ),
    exists: vi.fn().mockResolvedValue(exists),
  } as unknown as AdminUserRepository;
}

function mockJwt(): JwtService {
  return {
    sign: vi.fn().mockResolvedValue('jwt_token_here'),
    verify: vi.fn(),
  } as unknown as JwtService;
}

function mockNotifications(): NotificationService {
  return {
    sendMagicLink: vi.fn().mockResolvedValue(undefined),
    sendWelcome: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailed: vi.fn().mockResolvedValue(undefined),
    sendMembershipCanceled: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationService;
}

function createService(overrides: {
  sessionRepo?: SessionRepository;
  magicLinkRepo?: MagicLinkRepository;
  adminUserRepo?: AdminUserRepository;
  jwt?: JwtService;
  notifications?: NotificationService;
} = {}) {
  return new AuthService(
    overrides.sessionRepo ?? mockSessionRepo(),
    overrides.magicLinkRepo ?? mockMagicLinkRepo(),
    overrides.adminUserRepo ?? mockAdminUserRepo(),
    overrides.jwt ?? mockJwt(),
    overrides.notifications ?? mockNotifications(),
    'https://app.com',
    'https://app.com',
  );
}

function validMagicLink(email = 'admin@example.com') {
  return {
    id: 'ml_1',
    email,
    tokenHash: hashToken('abc123'),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  };
}

function validSession(email = 'admin@example.com') {
  return {
    id: 'ses_1',
    userId: 'usr_1',
    email,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(),
    createdAt: new Date(),
  };
}

describe('AuthService', () => {
  describe('sendMagicLink', () => {
    it('creates token and sends notification for admin users', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      const notifications = mockNotifications();

      const service = createService({ magicLinkRepo, notifications });
      await service.sendMagicLink('admin@example.com');

      expect(magicLinkRepo.create).toHaveBeenCalledOnce();
      expect(notifications.sendMagicLink).toHaveBeenCalledOnce();
      const [sentTo, url] = (notifications.sendMagicLink as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(sentTo).toBe('admin@example.com');
      expect(url).toContain('https://app.com/api/auth/verify?token=');
    });

    it('silently skips non-admin emails', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      const notifications = mockNotifications();
      const adminUserRepo = mockAdminUserRepo(false);

      const service = createService({ magicLinkRepo, notifications, adminUserRepo });
      await service.sendMagicLink('nobody@example.com');

      expect(magicLinkRepo.create).not.toHaveBeenCalled();
      expect(notifications.sendMagicLink).not.toHaveBeenCalled();
    });

    it('includes the mobile redirect target when provided', async () => {
      const notifications = mockNotifications();
      const service = createService({ notifications });

      await service.sendMagicLink('admin@example.com', {
        redirectTo: 'seventy://auth/callback',
      });

      const [, url] = (notifications.sendMagicLink as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('redirectTo=');
      expect(decodeURIComponent(url)).toContain('seventy://auth/callback');
    });
  });

  describe('verifyMagicLink', () => {
    it('creates session and returns JWT for valid admin token', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      const sessionRepo = mockSessionRepo();
      const jwt = mockJwt();

      (magicLinkRepo.findByHash as ReturnType<typeof vi.fn>).mockResolvedValue(validMagicLink());

      const service = createService({ sessionRepo, magicLinkRepo, jwt });
      const result = await service.verifyMagicLink('abc123');

      expect(magicLinkRepo.markUsed).toHaveBeenCalledWith('ml_1');
      expect(sessionRepo.evictOldest).toHaveBeenCalled();
      expect(sessionRepo.create).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
      );
      expect(result.jwt).toBe('jwt_token_here');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('throws NotAuthorizedError for non-admin email', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      (magicLinkRepo.findByHash as ReturnType<typeof vi.fn>).mockResolvedValue(validMagicLink());

      const service = createService({ magicLinkRepo, adminUserRepo: mockAdminUserRepo(false) });
      await expect(service.verifyMagicLink('abc123')).rejects.toThrow(NotAuthorizedError);
    });

    it('throws InvalidTokenError for unknown token', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      (magicLinkRepo.findByHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const service = createService({ magicLinkRepo });
      await expect(service.verifyMagicLink('unknown')).rejects.toThrow(InvalidTokenError);
    });

    it('throws InvalidTokenError for used token', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      (magicLinkRepo.findByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validMagicLink(),
        usedAt: new Date(),
      });

      const service = createService({ magicLinkRepo });
      await expect(service.verifyMagicLink('token')).rejects.toThrow(InvalidTokenError);
    });

    it('throws InvalidTokenError for expired token', async () => {
      const magicLinkRepo = mockMagicLinkRepo();
      (magicLinkRepo.findByHash as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validMagicLink(),
        expiresAt: new Date(Date.now() - 1000),
      });

      const service = createService({ magicLinkRepo });
      await expect(service.verifyMagicLink('token')).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('validateSession', () => {
    it('returns authenticated user with role for valid admin session', async () => {
      const sessionRepo = mockSessionRepo();
      const jwt = mockJwt();

      (jwt.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        sub: 'usr_1', sid: 'ses_1', email: 'admin@example.com', role: 'admin',
      });
      (sessionRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(validSession());

      const service = createService({ sessionRepo, jwt });
      const user = await service.validateSession('jwt_token');

      expect(user.userId).toBe('usr_1');
      expect(user.sessionId).toBe('ses_1');
      expect(user.email).toBe('admin@example.com');
      expect(user.role).toBe('admin');
    });

    it('throws NotAuthorizedError when admin access is revoked', async () => {
      const sessionRepo = mockSessionRepo();
      const jwt = mockJwt();

      (jwt.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        sub: 'usr_1', sid: 'ses_1', email: 'revoked@example.com', role: 'admin',
      });
      (sessionRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(validSession('revoked@example.com'));

      const service = createService({ sessionRepo, jwt, adminUserRepo: mockAdminUserRepo(false) });
      await expect(service.validateSession('jwt_token')).rejects.toThrow(NotAuthorizedError);
    });

    it('throws SessionExpiredError for invalid JWT', async () => {
      const jwt = mockJwt();
      (jwt.verify as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const service = createService({ jwt });
      await expect(service.validateSession('bad_jwt')).rejects.toThrow(SessionExpiredError);
    });

    it('throws SessionExpiredError for missing session', async () => {
      const sessionRepo = mockSessionRepo();
      const jwt = mockJwt();

      (jwt.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
        sub: 'usr_1', sid: 'ses_gone', email: 'admin@example.com',
      });
      (sessionRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const service = createService({ sessionRepo, jwt });
      await expect(service.validateSession('jwt_token')).rejects.toThrow(SessionExpiredError);
    });
  });

  describe('logout', () => {
    it('deletes the session', async () => {
      const sessionRepo = mockSessionRepo();
      const service = createService({ sessionRepo });

      await service.logout('ses_1');
      expect(sessionRepo.delete).toHaveBeenCalledWith('ses_1');
    });
  });
});
