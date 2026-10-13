import { Endpoint } from './Endpoint.js';

export interface Service {
  name: string;
  nameEn?: string;
  title?: string;
  code?: string;
  endpoints: Endpoint[];
}
