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

    const allSectors = await this.sectorRepository.getAllSectors();

    // 1. Key uniqueness
    if (allSectors[dto.key]) {
      throw new Error(`خرق لقواعد الحوكمة: المعرف البرمجي [${dto.key}] مستخدم مسبقاً لقطاع/جهة أخرى.`);
    }

    // 2. Code uniqueness (Domain Invariant)
    const duplicateCode = Object.values(allSectors).find(
      s => s.code.trim().toUpperCase() === dto.code.trim().toUpperCase()
    );
    if (duplicateCode) {
      throw new Error(`خرق لقواعد الحوكمة: رمز الجهة [${dto.code}] مستخدم بالفعل للجهة [${duplicateCode.name}]. لا يمكن تكرار الرمز الفريد.`);
    }

    // 3. Name uniqueness
    const duplicateName = Object.values(allSectors).find(
      s => s.name.trim().toLowerCase() === dto.name.trim().toLowerCase()
    );
    if (duplicateName) {
      throw new Error(`خرق لقواعد الحوكمة: اسم الجهة [${dto.name}] مسجل مسبقاً في الدليل السيادي.`);
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
