import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Sector } from '../../domain/entities/Sector.js';
import { Endpoint } from '../../domain/entities/Endpoint.js';
import { prisma } from '../database/prismaClient.js';

export class SqliteSectorRepository implements ISectorRepository {
  private hasInitialized = false;

  private async ensureSeeded(): Promise<void> {
    if (this.hasInitialized) return;
    try {
      const count = await prisma.sector.count();
      if (count === 0) {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const rootDataPath = path.resolve(__dirname, '../../../data/sectors.json');
        const localDataPath = path.resolve(__dirname, '../data/sectors.json');
        const candidate = fsSync.existsSync(rootDataPath) ? rootDataPath : localDataPath;

        if (fsSync.existsSync(candidate)) {
          const raw = await fs.readFile(candidate, 'utf-8');
          const data: Record<string, Sector> = JSON.parse(raw);
          for (const [key, sector] of Object.entries(data)) {
            await prisma.sector.upsert({
              where: { key },
              create: {
                key,
                name: sector.name,
                nameEn: sector.nameEn || null,
                code: sector.code,
                icon: sector.icon || 'Building2',
                services: JSON.stringify(sector.services || {})
              },
              update: {
                name: sector.name,
                nameEn: sector.nameEn || null,
                code: sector.code,
                icon: sector.icon || 'Building2',
                services: JSON.stringify(sector.services || {})
              }
            });
          }
        }
      }
      this.hasInitialized = true;
    } catch (err) {
      console.error('[SqliteSectorRepository] Seeding check failed:', err);
    }
  }

  async getAllSectors(): Promise<Record<string, Sector>> {
    await this.ensureSeeded();
    const records = await prisma.sector.findMany();
    const result: Record<string, Sector> = {};
    for (const r of records) {
      result[r.key] = {
        key: r.key,
        name: r.name,
        nameEn: r.nameEn || undefined,
        code: r.code,
        icon: r.icon,
        services: r.services ? JSON.parse(r.services) : {}
      };
    }
    return result;
  }

  async getSectorByKey(key: string): Promise<Sector | null> {
    await this.ensureSeeded();
    const record = await prisma.sector.findUnique({ where: { key } });
    if (!record) return null;
    return {
      key: record.key,
      name: record.name,
      nameEn: record.nameEn || undefined,
      code: record.code,
      icon: record.icon,
      services: record.services ? JSON.parse(record.services) : {}
    };
  }

  async saveSector(key: string, sector: Sector): Promise<Sector> {
    await this.ensureSeeded();
    const saved = await prisma.sector.upsert({
      where: { key },
      create: {
        key,
        name: sector.name,
        nameEn: sector.nameEn || null,
        code: sector.code || `SECTOR_${key.toUpperCase()}`,
        icon: sector.icon || 'Building2',
        services: JSON.stringify(sector.services || {})
      },
      update: {
        name: sector.name,
        nameEn: sector.nameEn || null,
        code: sector.code || `SECTOR_${key.toUpperCase()}`,
        icon: sector.icon || 'Building2',
        services: JSON.stringify(sector.services || {})
      }
    });

    return {
      key: saved.key,
      name: saved.name,
      nameEn: saved.nameEn || undefined,
      code: saved.code,
      icon: saved.icon,
      services: saved.services ? JSON.parse(saved.services) : {}
    };
  }

  async deleteSector(key: string): Promise<boolean> {
    try {
      await prisma.sector.delete({ where: { key } });
      return true;
    } catch {
      return false;
    }
  }

  async addOrUpdateEndpoint(sectorKey: string, endpoint: Endpoint, serviceKey?: string): Promise<Endpoint> {
    const sector = await this.getSectorByKey(sectorKey);
    if (!sector) {
      throw new Error(`Sector with key "${sectorKey}" does not exist in SQLite database.`);
    }

    if (!sector.services) {
      sector.services = {};
    }

    const targetServiceKey = serviceKey || Object.keys(sector.services)[0] || 'core';
    if (!sector.services[targetServiceKey]) {
      sector.services[targetServiceKey] = {
        title: 'الخدمات الأساسية',
        titleEn: 'Core Services',
        code: targetServiceKey.toUpperCase(),
        baseUrl: 'https://api.gov.fintech',
        versions: ['v2026.2'],
        endpoints: []
      };
    }

    const service = sector.services[targetServiceKey];
    if (!service.endpoints) {
      service.endpoints = [];
    }

    const existingIndex = service.endpoints.findIndex(
      e => e.path.toLowerCase() === endpoint.path.toLowerCase() && e.method === endpoint.method
    );

    if (existingIndex >= 0) {
      service.endpoints[existingIndex] = {
        ...service.endpoints[existingIndex],
        ...endpoint,
        id: service.endpoints[existingIndex].id || endpoint.id
      };
    } else {
      service.endpoints.push(endpoint);
    }

    await this.saveSector(sectorKey, sector);
    return endpoint;
  }
}
