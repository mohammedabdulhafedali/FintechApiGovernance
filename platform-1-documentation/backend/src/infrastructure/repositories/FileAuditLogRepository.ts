import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository.js';
import { AuditLog } from '../../domain/entities/AuditLog.js';
import { resolveDataPath } from '../data/dataPathResolver.js';

export class FileAuditLogRepository implements IAuditLogRepository {
  private readonly filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || resolveDataPath('audit_logs.json');
  }

  private async readData(): Promise<AuditLog[]> {
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

  private async writeData(data: AuditLog[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, serialized, 'utf-8');
  }

  async record(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const logs = await this.readData();
    const entry: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    if (logs.length > 2000) {
      logs.length = 2000;
    }
    await this.writeData(logs);
    return entry;
  }

  async findAll(limit = 100): Promise<AuditLog[]> {
    const logs = await this.readData();
    return logs.slice(0, limit);
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    const logs = await this.readData();
    return logs.filter(l => l.userId === userId);
  }
}
