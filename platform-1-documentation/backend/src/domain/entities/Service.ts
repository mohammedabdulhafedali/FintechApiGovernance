import { Endpoint } from './Endpoint.js';

export interface Service {
  name: string;
  nameEn?: string;
  endpoints: Endpoint[];
}
