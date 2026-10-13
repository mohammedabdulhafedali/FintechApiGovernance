import { Service } from './Service.js';

export interface Sector {
  key?: string;
  name: string;
  nameEn?: string;
  code: string;
  services: Record<string, Service>;
}
