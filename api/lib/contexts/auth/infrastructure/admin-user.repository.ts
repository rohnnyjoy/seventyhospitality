import type { PrismaClient } from '@prisma/client';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AppUser | null> {
    return this.prisma.user.findUnique({ where: { email } }) as unknown as AppUser | null;
  }

  async findById(id: string): Promise<AppUser | null> {
    return this.prisma.user.findUnique({ where: { id } }) as unknown as AppUser | null;
  }

  async isAdmin(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { role: true } });
    return user?.role === 'admin';
  }

  async list(): Promise<AppUser[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } }) as unknown as AppUser[];
  }

  async listAdmins(): Promise<AppUser[]> {
    return this.prisma.user.findMany({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' } }) as unknown as AppUser[];
  }

  async create(email: string, name: string, role = 'member'): Promise<AppUser> {
    return this.prisma.user.create({ data: { email, name, role } }) as unknown as AppUser;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
