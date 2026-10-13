import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Sector } from '../../domain/entities/Sector.js';

export interface CreateSectorDTO {
  key: string;
  name: string;
  nameEn?: string;
  code: string;
}

export class CreateSectorUseCase {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  async execute(dto: CreateSectorDTO): Promise<Sector> {
    if (!dto.key || !dto.name || !dto.code) {
      throw new Error('key, name, and code are required to create a sector');
    }

    const existing = await this.sectorRepository.getSectorByKey(dto.key);
    if (existing) {
      throw new Error(`Sector with key "${dto.key}" already exists`);
    }

    const newSector: Sector = {
      name: dto.name,
      nameEn: dto.nameEn || dto.name,
      code: dto.code,
      services: {
        core: {
          name: 'الخدمات الأساسية',
          nameEn: 'Core Services',
          endpoints: []
        }
      }
    };

    return this.sectorRepository.saveSector(dto.key, newSector);
  }
}
