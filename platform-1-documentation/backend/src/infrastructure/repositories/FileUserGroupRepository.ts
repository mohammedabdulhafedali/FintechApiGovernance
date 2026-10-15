import fs from 'fs/promises';
import path from 'path';
import { IUserGroupRepository } from '../../domain/repositories/IUserGroupRepository.js';
import { UserGroup } from '../../domain/entities/UserGroup.js';
import { resolveDataPath } from '../data/dataPathResolver.js';

export class FileUserGroupRepository implements IUserGroupRepository {
  private readonly filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || resolveDataPath('user_groups.json');
  }

  private async readData(): Promise<UserGroup[]> {
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

  private async writeData(data: UserGroup[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, serialized, 'utf-8');
  }

  async findById(id: string): Promise<UserGroup | null> {
    const groups = await this.readData();
    return groups.find(g => g.id === id || g.key.toUpperCase() === id.toUpperCase()) || null;
  }

  async findByKey(key: string): Promise<UserGroup | null> {
    const groups = await this.readData();
    return groups.find(g => g.key.toUpperCase() === key.toUpperCase() || g.id === key) || null;
  }

  async findAll(): Promise<UserGroup[]> {
    return this.readData();
  }

  async save(group: UserGroup): Promise<UserGroup> {
    const groups = await this.readData();
    const existingIndex = groups.findIndex(g => g.id === group.id || g.key.toUpperCase() === group.key.toUpperCase());
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    await this.writeData(groups);
    return group;
  }

  async update(group: UserGroup): Promise<UserGroup> {
    return this.save(group);
  }

  async delete(id: string): Promise<boolean> {
    const groups = await this.readData();
    const group = groups.find(g => g.id === id || g.key.toUpperCase() === id.toUpperCase());
    if (!group) return false;
    if (group.isSystemDefault || group.key === 'ADMIN_GROUP') {
      throw new Error('لا يمكن حذف المجموعات الافتراضية السيادية للنظام.');
    }
    const filtered = groups.filter(g => g.id !== group.id);
    await this.writeData(filtered);
    return true;
  }
}
