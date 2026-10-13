import fs from 'fs/promises';
import path from 'path';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { User } from '../../domain/entities/User.js';
import { resolveDataPath } from '../data/dataPathResolver.js';

export class FileUserRepository implements IUserRepository {
  private readonly filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || resolveDataPath('users.json');
  }

  private async readData(): Promise<User[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  private async writeData(data: User[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, serialized, 'utf-8');
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.readData();
    return users.find(u => u.id === id) || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const users = await this.readData();
    const cleanId = identifier.trim().toLowerCase();
    return (
      users.find(
        u => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
      ) || null
    );
  }

  async findAll(): Promise<User[]> {
    return this.readData();
  }

  async save(user: User): Promise<User> {
    const users = await this.readData();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    await this.writeData(users);
    return user;
  }

  async update(user: User): Promise<User> {
    return this.save(user);
  }

  async delete(id: string): Promise<boolean> {
    const users = await this.readData();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) {
      return false;
    }
    await this.writeData(filtered);
    return true;
  }
}
