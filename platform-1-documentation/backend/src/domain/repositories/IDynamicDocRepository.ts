import { DynamicDocument } from '../entities/DynamicDocument.js';

export interface IDynamicDocRepository {
  findAll(): Promise<DynamicDocument[]>;
  findById(id: string): Promise<DynamicDocument | null>;
  save(doc: DynamicDocument): Promise<DynamicDocument>;
  delete(id: string): Promise<boolean>;
}
