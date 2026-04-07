import type { FastifyReply } from 'fastify';

export function success<T>(reply: FastifyReply, data: T, status = 200) {
  return reply.status(status).send({ data });
}

export function error(reply: FastifyReply, code: string, message: string, status = 400, details?: unknown) {
  return reply.status(status).send({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}
