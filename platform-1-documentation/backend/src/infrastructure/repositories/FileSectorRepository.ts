import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { Sector } from '../../domain/entities/Sector.js';
import { Endpoint } from '../../domain/entities/Endpoint.js';

export class FileSectorRepository implements ISectorRepository {
  private readonly filePath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const rootDataPath = path.resolve(__dirname, '../../../data/sectors.json');
      const localDataPath = path.resolve(__dirname, '../data/sectors.json');
      if (fsSync.existsSync(rootDataPath)) {
        this.filePath = rootDataPath;
      } else {
        this.filePath = localDataPath;
      }
    }
  }

  private async readData(): Promise<Record<string, Sector>> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return {};
      }
      throw err;
    }
  }

  private async writeData(data: Record<string, Sector>): Promise<void> {
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, serialized, 'utf-8');
  }

  async getAllSectors(): Promise<Record<string, Sector>> {
    return this.readData();
  }

  async getSectorByKey(key: string): Promise<Sector | null> {
    const data = await this.readData();
    return data[key] || null;
  }

  async saveSector(key: string, sector: Sector): Promise<Sector> {
    const data = await this.readData();
    data[key] = {
      ...sector,
      key
    };
    await this.writeData(data);
    return data[key];
  }

  async deleteSector(key: string): Promise<boolean> {
    const data = await this.readData();
    if (!data[key]) {
      return false;
    }
    delete data[key];
    await this.writeData(data);
    return true;
  }

  async addOrUpdateEndpoint(sectorKey: string, endpoint: Endpoint, serviceKey?: string): Promise<Endpoint> {
    const data = await this.readData();
    const sector = data[sectorKey];
    if (!sector) {
      throw new Error(`Sector with key "${sectorKey}" does not exist.`);
    }

    if (!sector.services) {
      sector.services = {};
    }

    const targetServiceKey = serviceKey || Object.keys(sector.services)[0] || 'core';
    if (!sector.services[targetServiceKey]) {
      sector.services[targetServiceKey] = {
        name: 'الخدمات الأساسية',
        nameEn: 'Core Services',
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
      // Upsert: update existing endpoint
      service.endpoints[existingIndex] = {
        ...service.endpoints[existingIndex],
        ...endpoint,
        id: service.endpoints[existingIndex].id || endpoint.id
      };
      await this.writeData(data);
      return service.endpoints[existingIndex];
    } else {
      // Insert new endpoint
      service.endpoints.push(endpoint);
      await this.writeData(data);
      return endpoint;
    }
  }
}
