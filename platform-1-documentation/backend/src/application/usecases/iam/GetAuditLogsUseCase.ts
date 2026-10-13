import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository.js';
import { AuditLog } from '../../../domain/entities/AuditLog.js';

export class GetAuditLogsUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  async execute(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.findAll(limit);
  }
}
