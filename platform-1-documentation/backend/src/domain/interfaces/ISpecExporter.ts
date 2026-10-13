import { Sector } from '../entities/Sector.js';

export interface ExportResult {
  format: 'openapi3' | 'postman' | 'markdown';
  content: string;
  contentType: string;
  filename: string;
}

export interface ISpecExporter {
  exportSector(sector: Sector, format: 'openapi3' | 'postman' | 'markdown'): Promise<ExportResult>;
  exportCatalog(sectors: Record<string, Sector>, format: 'openapi3' | 'postman' | 'markdown'): Promise<ExportResult>;
}
