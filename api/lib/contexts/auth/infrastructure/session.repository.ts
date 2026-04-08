import type { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import type { Session } from '../domain';

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, expiresAt: Date): Promise<Session> {
    const session = await this.prisma.session.create({
      data: {
        id: createId(),
        userId,
        expiresAt,
        lastActiveAt: new Date(),
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: session.id,
      userId: session.userId,
      email: (session as any).user.email,
      expiresAt: session.expiresAt,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
    };
  }

  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      email: (session as any).user.email,
      expiresAt: session.expiresAt,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
    };
  }

  async updateLastActive(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    }).catch(() => {}); // Non-critical
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } }).catch(() => {});
  }

  async evictOldest(userId: string, keepCount: number): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      skip: keepCount,
      select: { id: true },
    });

    if (sessions.length > 0) {
      await this.prisma.session.deleteMany({
        where: { id: { in: sessions.map((s) => s.id) } },
      });
    }
  }
}
