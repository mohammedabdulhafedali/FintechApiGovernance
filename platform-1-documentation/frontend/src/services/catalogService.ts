import { Sector, Endpoint } from '../types/schema';
import { INITIAL_SECTORS } from '../data/mockData';

const BACKEND_BASE_URL = 'http://localhost:4000/api/v1';

export class CatalogService {
  private static instance: CatalogService;
  private isBackendOnline: boolean | null = null;

  private constructor() {}

  public static getInstance(): CatalogService {
    if (!CatalogService.instance) {
      CatalogService.instance = new CatalogService();
    }
    return CatalogService.instance;
  }

  /**
   * Check whether the Sovereign Backend is online
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:4000/health', { method: 'GET', signal: AbortSignal.timeout(1500) });
      this.isBackendOnline = response.ok;
      return response.ok;
    } catch {
      this.isBackendOnline = false;
      return false;
    }
  }

  /**
   * Fetch all sectors from the Backend, with automatic graceful local fallback
   */
  public async fetchCatalog(): Promise<Record<string, Sector>> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/catalog`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (data && data.success && data.data) {
        this.isBackendOnline = true;
        return data.data;
      }
      return INITIAL_SECTORS;
    } catch (err) {
      // Graceful fallback to initial sectors if backend is offline
      this.isBackendOnline = false;
      return INITIAL_SECTORS;
    }
  }

  /**
   * Create or update an endpoint in the Backend
   */
  public async createEndpoint(payload: {
    sectorKey: string;
    path: string;
    method: string;
    summary?: string;
    description?: string;
    parameters?: any[];
    requestPayload?: string;
    responsePayload?: string;
  }): Promise<Endpoint | null> {
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/endpoints`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a sector
   */
  public async deleteSector(sectorKey: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/sectors/${sectorKey}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Create a new sector
   */
  public async createSector(sector: { key: string; name: string; nameEn?: string; code: string }): Promise<Sector | null> {
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/sectors`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sector),
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const catalogService = CatalogService.getInstance();
