import type { PrismaClient } from '@prisma/client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { email } }) as unknown as AdminUser | null;
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.prisma.adminUser.count({ where: { email } });
    return count > 0;
  }

  async list(): Promise<AdminUser[]> {
    return this.prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }) as unknown as AdminUser[];
  }

  async create(email: string, name: string): Promise<AdminUser> {
    return this.prisma.adminUser.create({
      data: { email, name },
    }) as unknown as AdminUser;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adminUser.delete({ where: { id } });
  }
}
