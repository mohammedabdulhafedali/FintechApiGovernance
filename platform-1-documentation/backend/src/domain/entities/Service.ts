import { Endpoint } from './Endpoint.js';

export interface Service {
  name?: string;
  nameEn?: string;
  title?: string;
  titleEn?: string;
  code?: string;
  baseUrl?: string;
  versions?: string[];
  endpoints: Endpoint[];
}
