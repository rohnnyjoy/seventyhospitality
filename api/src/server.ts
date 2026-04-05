import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { authHook } from './middleware/auth';
import { memberRoutes } from './routes/members';
import { authRoutes } from './routes/auth';
import { stripeRoutes } from './routes/stripe';
import { webhookRoutes } from './routes/webhooks';
import { cronRoutes } from './routes/cron';
import { bookingRoutes } from './routes/bookings';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_URL ?? 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'],
});

await app.register(cookie);

app.addHook('preHandler', authHook);

// Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(memberRoutes, { prefix: '/api/members' });
await app.register(stripeRoutes, { prefix: '/api/stripe' });
await app.register(webhookRoutes, { prefix: '/api/webhooks' });
await app.register(cronRoutes, { prefix: '/api/cron' });
await app.register(bookingRoutes, { prefix: '/api' });

// Plans
import { planRepo } from '@/lib/container';
app.get('/api/plans', async (_req, reply) => {
  const plans = await planRepo.list();
  return reply.send({ data: plans });
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Serve bundled web app in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

if (existsSync(publicDir)) {
  const fastifyStatic = await import('@fastify/static');
  await app.register(fastifyStatic.default, {
    root: publicDir,
    wildcard: false,
  });

  // SPA fallback: serve index.html for non-API routes
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    }
    return reply.sendFile('index.html');
  });
}

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`Seventy API running on http://localhost:${port}`);
