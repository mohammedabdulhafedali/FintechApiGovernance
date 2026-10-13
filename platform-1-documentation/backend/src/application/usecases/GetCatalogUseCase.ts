import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Sector } from '../../domain/entities/Sector.js';

export class GetCatalogUseCase {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  async execute(): Promise<Record<string, Sector>> {
    return this.sectorRepository.getAllSectors();
  }
}
