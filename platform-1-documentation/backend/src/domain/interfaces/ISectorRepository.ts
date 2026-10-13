import { Sector } from '../entities/Sector.js';
import { Endpoint } from '../entities/Endpoint.js';

export interface ISectorRepository {
  getAllSectors(): Promise<Record<string, Sector>>;
  getSectorByKey(key: string): Promise<Sector | null>;
  saveSector(key: string, sector: Sector): Promise<Sector>;
  deleteSector(key: string): Promise<boolean>;
  addOrUpdateEndpoint(sectorKey: string, endpoint: Endpoint, serviceKey?: string): Promise<Endpoint>;
}
