import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { SqliteSystemRepository, SystemModuleDto } from '../../infrastructure/repositories/SqliteSystemRepository.js';

export class DeleteSectorUseCase {
  constructor(
    private readonly sectorRepository: ISectorRepository,
    private readonly systemRepository?: SqliteSystemRepository
  ) {}

  async execute(key: string): Promise<boolean> {
    const sectors = await this.sectorRepository.getAllSectors();
    if (Object.keys(sectors).length <= 1) {
      throw new Error('Cannot delete the last remaining sector in the catalog');
    }

    const existing = await this.sectorRepository.getSectorByKey(key);
    if (!existing) {
      throw new Error(`Sector with key "${key}" not found`);
    }

    // Referential Integrity & Governance Gate (SOLID - Business Invariant)
    if (this.systemRepository) {
      const allSystems: Record<string, SystemModuleDto> = await this.systemRepository.getAllSystems();
      const linkedSystems = Object.values(allSystems).filter((sys: SystemModuleDto) => {
        const hasAssociated = (sys.associatedSectorKeys || []).includes(key);
        const hasIntegration = Object.keys(sys.integrations || {}).includes(key);
        return hasAssociated || hasIntegration;
      });

      if (linkedSystems.length > 0) {
        const sysNames = linkedSystems.map((s: SystemModuleDto) => s.name || s.key).join(', ');
        throw new Error(
          `حظر حوكمة: لا يمكن حذف الجهة/القطاع [${existing.name || key}] لوجود تكاملات نشطة مع الأنظمة التالية: (${sysNames}). يجب فك الارتباط من تلك الأنظمة أولاً.`
        );
      }
    }

    return this.sectorRepository.deleteSector(key);
  }
}
