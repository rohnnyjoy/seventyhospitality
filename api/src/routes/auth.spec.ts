import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { InvalidTokenError, NotAuthorizedError } from '@/lib/contexts/auth';

const mockAuthService = vi.hoisted(() => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
  verifyMagicLink: vi.fn(),
  validateSession: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  getWebUrl: vi.fn().mockReturnValue('https://app.test'),
}));

vi.mock('@/lib/container', () => ({
  authService: mockAuthService,
}));

import { authRoutes } from './auth';

describe('auth routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(cookie);
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.ready();
  });

  afterEach(() => app.close());

  describe('POST /api/auth/magic-link', () => {
    it('returns success for valid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/magic-link',
        payload: { email: 'admin@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: { sent: true } });
      expect(mockAuthService.sendMagicLink).toHaveBeenCalledWith(
        'admin@example.com',
        { redirectTo: undefined },
      );
    });

    it('returns success even when sendMagicLink throws (prevents enumeration)', async () => {
      mockAuthService.sendMagicLink.mockRejectedValueOnce(new Error('boom'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/magic-link',
        payload: { email: 'fail@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: { sent: true } });
    });

    it('rejects invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/magic-link',
        payload: { email: 'not-an-email' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects disallowed mobile redirect target', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/magic-link',
        payload: { email: 'admin@example.com', redirectTo: 'https://evil.com/steal' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('sets cookie and redirects to /members on valid token', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockAuthService.verifyMagicLink.mockResolvedValue({ jwt: 'jwt_token', expiresAt });

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/verify?token=valid_token',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('https://app.test/members');
      expect(res.headers['set-cookie']).toContain('seventy_session=jwt_token');
    });

    it('redirects with error for invalid token', async () => {
      mockAuthService.verifyMagicLink.mockRejectedValue(new InvalidTokenError());

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/verify?token=bad_token',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('https://app.test/sign-in?error=invalid_token');
    });

    it('redirects with unknown error for non-token errors', async () => {
      mockAuthService.verifyMagicLink.mockRejectedValue(new NotAuthorizedError());

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/verify?token=some_token',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('https://app.test/sign-in?error=unknown');
    });

    it('redirects to sign-in with error when token is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('https://app.test/sign-in?error=missing_token');
    });

    it('returns JWT in redirect URL for mobile flow', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockAuthService.verifyMagicLink.mockResolvedValue({ jwt: 'jwt_token', expiresAt });

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/verify?token=valid_token&redirectTo=seventy%3A%2F%2Fauth%2Fcallback',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('seventy://auth/callback');
      expect(res.headers.location).toContain('token=jwt_token');
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user data when session cookie is valid', async () => {
      mockAuthService.validateSession.mockResolvedValue({
        userId: 'usr_1',
        sessionId: 'ses_1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { seventy_session: 'valid_jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        data: { userId: 'usr_1', email: 'admin@example.com' },
      });
    });

    it('returns null when no cookie is present', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: null });
      expect(mockAuthService.validateSession).not.toHaveBeenCalled();
    });

    it('returns null when session is expired', async () => {
      mockAuthService.validateSession.mockRejectedValue(new Error('expired'));

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { seventy_session: 'expired_jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: null });
    });

    it('returns null when admin access is revoked', async () => {
      mockAuthService.validateSession.mockRejectedValue(new NotAuthorizedError());

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: { seventy_session: 'revoked_jwt' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: null });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ data: { loggedOut: true } });
      expect(res.headers['set-cookie']).toContain('seventy_session=');
      expect(res.headers['set-cookie']).toContain('Expires=');
    });
  });
});
