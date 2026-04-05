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
}
