import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';

export class DeleteSectorUseCase {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  async execute(key: string): Promise<boolean> {
    const sectors = await this.sectorRepository.getAllSectors();
    if (Object.keys(sectors).length <= 1) {
      throw new Error('Cannot delete the last remaining sector in the catalog');
    }

    const existing = await this.sectorRepository.getSectorByKey(key);
    if (!existing) {
      throw new Error(`Sector with key "${key}" not found`);
    }

    return this.sectorRepository.deleteSector(key);
  }
}
