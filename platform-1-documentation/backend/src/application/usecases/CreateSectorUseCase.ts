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
    if (!dto.name || !dto.name.trim()) {
      throw new Error('اسم الجهة أو القطاع مطلوب لتسجيله في المنظومة');
    }

    const cleanKey = (dto.key && dto.key.trim())
      ? dto.key.trim()
      : (dto.nameEn ? dto.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') : '') || `sec_${Date.now()}`;

    const cleanCode = (!dto.code || dto.code.trim().toUpperCase() === 'SEC_')
      ? `SEC_${cleanKey.replace(/^sec_/, '').toUpperCase()}`
      : dto.code.trim().toUpperCase();

    const allSectors = await this.sectorRepository.getAllSectors();

    // 1. Code uniqueness (Domain Invariant - exclude current entity if updating)
    const duplicateCode = Object.values(allSectors).find(
      s => s.key !== cleanKey && (s.code || '').trim().toUpperCase() === cleanCode
    );
    if (duplicateCode) {
      throw new Error(`خرق لقواعد الحوكمة: رمز الجهة [${cleanCode}] مستخدم بالفعل للجهة [${duplicateCode.name}]. لا يمكن تكرار الرمز الفريد.`);
    }

    // 2. Name uniqueness (exclude current entity if updating)
    const duplicateName = Object.values(allSectors).find(
      s => s.key !== cleanKey && (s.name || '').trim().toLowerCase() === dto.name.trim().toLowerCase()
    );
    if (duplicateName) {
      throw new Error(`خرق لقواعد الحوكمة: اسم الجهة [${dto.name}] مسجل مسبقاً في الدليل السيادي.`);
    }

    // 3. Upsert: If entity key exists, preserve its existing services and update metadata
    if (allSectors[cleanKey]) {
      const existing = allSectors[cleanKey];
      const updatedSector: Sector = {
        ...existing,
        name: dto.name,
        nameEn: dto.nameEn || dto.name,
        code: cleanCode
      };
      return this.sectorRepository.saveSector(cleanKey, updatedSector);
    }

    const newSector: Sector = {
      name: dto.name,
      nameEn: dto.nameEn || dto.name,
      code: cleanCode,
      services: {
        core: {
          name: 'الخدمات الأساسية',
          nameEn: 'Core Services',
          endpoints: []
        }
      }
    };

    return this.sectorRepository.saveSector(cleanKey, newSector);
  }
}
