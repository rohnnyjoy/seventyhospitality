import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

const { mockMembershipService, mockMediaService, mockDb } = vi.hoisted(() => ({
  mockMembershipService: {
    syncFromStripe: vi.fn(),
  },
  mockMediaService: {
    cleanupStaleEventImages: vi.fn().mockResolvedValue({
      deletedCount: 1,
      deletedImageUrls: ['/uploads/event-images/old.png'],
      cutoff: new Date('2026-04-03T12:00:00.000Z'),
    }),
  },
  mockDb: {
    member: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/container', () => ({
  membershipService: mockMembershipService,
  mediaService: mockMediaService,
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

import { cronRoutes } from './cron';

describe('cron routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.CRON_SECRET = 'test-secret';
    app = Fastify();
    await app.register(cronRoutes, { prefix: '/' });
    await app.ready();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.member.findMany.mockResolvedValue([]);
    mockMediaService.cleanupStaleEventImages.mockResolvedValue({
      deletedCount: 1,
      deletedImageUrls: ['/uploads/event-images/old.png'],
      cutoff: new Date('2026-04-03T12:00:00.000Z'),
    });
  });

  it('rejects cleanup requests without the cron secret', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/cleanup-event-images',
    });

    expect(response.statusCode).toBe(401);
  });

  it('runs stale event image cleanup with validated query params', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/cleanup-event-images?maxAgeHours=48&limit=25',
      headers: {
        authorization: 'Bearer test-secret',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockMediaService.cleanupStaleEventImages).toHaveBeenCalledWith({
      maxAgeHours: 48,
      limit: 25,
    });
    expect(response.json()).toEqual({
      deletedCount: 1,
      deletedImageUrls: ['/uploads/event-images/old.png'],
      cutoff: '2026-04-03T12:00:00.000Z',
    });
  });
});
