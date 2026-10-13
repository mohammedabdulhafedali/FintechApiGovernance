import { AuditLog } from '../entities/AuditLog.js';

export interface IAuditLogRepository {
  record(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  findAll(limit?: number): Promise<AuditLog[]>;
  findByUserId(userId: string): Promise<AuditLog[]>;
}
