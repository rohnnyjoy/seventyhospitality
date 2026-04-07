import type { FastifyInstance } from 'fastify';
import { mediaService, membershipService } from '@/lib/container';
import { db } from '@/lib/db';
import { cleanupManagedImagesQuerySchema } from '@/src/lib/validation';

export async function cronRoutes(app: FastifyInstance) {
  app.get('/sync-memberships', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const members = await db.member.findMany({
      where: { stripeCustomerId: { not: null } },
      select: { id: true, stripeCustomerId: true },
    });

    let synced = 0;
    let errors = 0;

    for (const member of members) {
      try {
        await membershipService.syncFromStripe(member.id, member.stripeCustomerId);
        synced++;
      } catch (e) {
        console.error(`Failed to sync member ${member.id}:`, e);
        errors++;
      }
    }

    return reply.send({ synced, errors, total: members.length });
  });

  app.post('/cleanup-event-images', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = cleanupManagedImagesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const result = await mediaService.cleanupStaleEventImages(parsed.data);
    return reply.send(result);
  });
}
