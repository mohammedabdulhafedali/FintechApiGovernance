import { Sector, Endpoint, SystemModule, SystemIntegration } from '../types/schema';
import { INITIAL_SECTORS, INITIAL_SYSTEMS } from '../data/mockData';

const BACKEND_BASE_URL = 'http://localhost:4000/api/v1';
const LOCAL_STORAGE_SYSTEMS_KEY = 'gov_fintech_systems_cache';

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
   * Fetch all systems from SQLite Backend, with automatic localStorage fallback
   */
  public async fetchSystems(): Promise<Record<string, SystemModule>> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/systems`, { signal: AbortSignal.timeout(2500) });
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.data && Object.keys(data.data).length > 0) {
          this.isBackendOnline = true;
          try {
            localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(data.data));
          } catch {}
          return data.data;
        }
      }
    } catch (err) {
      this.isBackendOnline = false;
    }

    // Try reading cached systems from localStorage
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {}

    return INITIAL_SYSTEMS;
  }

  /**
   * Create or update a system in SQLite Backend + update localStorage cache
   */
  public async saveSystem(system: SystemModule): Promise<SystemModule | null> {
    // 1. Update localStorage immediately for zero-delay persistence
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      const current: Record<string, SystemModule> = cached ? JSON.parse(cached) : { ...INITIAL_SYSTEMS };
      current[system.key] = system;
      localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(current));
    } catch {}

    // 2. Persist to SQLite Database via Backend API
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/systems`, {
        method: 'POST',
        headers,
        body: JSON.stringify(system),
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      return system;
    } catch {
      return system;
    }
  }

  /**
   * Update an existing system in SQLite Backend + update localStorage cache
   */
  public async updateSystem(systemKey: string, updates: Partial<SystemModule>): Promise<SystemModule> {
    let updatedSystem: SystemModule | null = null;

    // 1. Update localStorage cache immediately
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      if (cached) {
        const current: Record<string, SystemModule> = JSON.parse(cached);
        if (current[systemKey]) {
          current[systemKey] = {
            ...current[systemKey],
            ...updates,
            key: systemKey
          };
          updatedSystem = current[systemKey];
          localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(current));
        }
      }
    } catch {}

    // 2. Persist to SQLite Database via Backend API
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/systems/${systemKey}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
    } catch {}

    if (updatedSystem) return updatedSystem;
    throw new Error(`System ${systemKey} not found`);
  }

  /**
   * Delete a system from SQLite Backend + update localStorage cache
   */
  public async deleteSystem(systemKey: string): Promise<boolean> {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      if (cached) {
        const current: Record<string, SystemModule> = JSON.parse(cached);
        delete current[systemKey];
        localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(current));
      }
    } catch {}

    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/systems/${systemKey}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return true;
    }
  }

  /**
   * Save an integration under a system in SQLite Backend + update localStorage cache
   */
  public async saveIntegration(systemKey: string, integration: SystemIntegration): Promise<boolean> {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      const current: Record<string, SystemModule> = cached ? JSON.parse(cached) : { ...INITIAL_SYSTEMS };
      if (current[systemKey]) {
        if (!current[systemKey].integrations) current[systemKey].integrations = {};
        current[systemKey].integrations[integration.entityId] = integration;
        localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(current));
      }
    } catch {}

    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/systems/${systemKey}/integrations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(integration),
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return true;
    }
  }

  /**
   * Delete an integration from SQLite Backend + update localStorage cache
   */
  public async deleteIntegration(systemKey: string, entityId: string): Promise<boolean> {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      if (cached) {
        const current: Record<string, SystemModule> = JSON.parse(cached);
        if (current[systemKey]?.integrations) {
          delete current[systemKey].integrations[entityId];
          localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(current));
        }
      }
    } catch {}

    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/systems/${systemKey}/integrations/${entityId}`, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return true;
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

  /**
   * Update an existing sector
   */
  public async updateSector(sectorKey: string, updates: { name?: string; nameEn?: string; code?: string }): Promise<Sector | null> {
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/sectors/${sectorKey}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
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
