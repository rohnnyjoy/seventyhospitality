import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminUserRepo } from '@/lib/container';
import { error, success } from '@/src/lib/responses';

export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', async (_req, reply) => {
    const users = await adminUserRepo.list();
    return success(reply, users);
  });

  app.post('/users', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }).safeParse(req.body);

    if (!body.success) {
      return error(reply, 'VALIDATION_ERROR', 'Invalid admin user data');
    }

    const exists = await adminUserRepo.exists(body.data.email);
    if (exists) {
      return error(reply, 'CONFLICT', 'Admin user already exists');
    }

    const user = await adminUserRepo.create(body.data.email, body.data.name);
    return success(reply, user);
  });

  app.delete('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string };

    // Prevent deleting yourself
    if (req.user?.email) {
      const target = await adminUserRepo.list();
      const targetUser = target.find(u => u.id === id);
      if (targetUser?.email === req.user.email) {
        return error(reply, 'FORBIDDEN', 'Cannot remove yourself');
      }
    }

    await adminUserRepo.delete(id);
    return success(reply, { deleted: true });
  });
}
