import { Sector, Endpoint, SystemModule, SystemIntegration } from '../types/schema';
import { INITIAL_SECTORS, INITIAL_SYSTEMS } from '../data/mockData';
import { docGovernanceEngine } from './docGovernanceEngine';

const BACKEND_BASE_URL = 'http://localhost:4000/api/v1';
const LOCAL_STORAGE_SYSTEMS_KEY = 'gov_fintech_systems_cache';
const LOCAL_STORAGE_SECTORS_KEY = 'gov_fintech_sectors_cache';

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
        if (data && data.success && data.data !== undefined) {
          this.isBackendOnline = true;
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
            const current: Record<string, SystemModule> = cached ? JSON.parse(cached) : {};
            const merged = { ...current, ...data.data };
            localStorage.setItem(LOCAL_STORAGE_SYSTEMS_KEY, JSON.stringify(merged));
            return merged;
          } catch {
            return data.data;
          }
        }
      }
    } catch (err) {
      this.isBackendOnline = false;
    }

    // Try reading cached systems from localStorage
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
      if (cached !== null) {
        return JSON.parse(cached);
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
   * Save an integration under a system in SQLite Backend + update localStorage cache.
   */
  public async saveIntegration(
    systemKey: string, 
    integration: SystemIntegration,
    bypassDocCheck: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const cached = localStorage.getItem(LOCAL_STORAGE_SYSTEMS_KEY);
    const current: Record<string, SystemModule> = cached ? JSON.parse(cached) : { ...INITIAL_SYSTEMS };
    const targetSystem = current[systemKey];

    if (!targetSystem) {
      return { success: false, error: `النظام المستهدف [${systemKey}] غير موجود في المنظومة.` };
    }

    // ── 1. RULE: NO DUPLICATE INTEGRATION ──
    const isExistingUpdate = targetSystem.integrations && targetSystem.integrations[integration.entityId];
    if (!isExistingUpdate && targetSystem.integrations && Object.keys(targetSystem.integrations).includes(integration.entityId)) {
      return { 
        success: false, 
        error: `خرق لقواعد الحوكمة: النظام [${targetSystem.name}] متكامل بالفعل مع هذه الجهة (${integration.name}). لا يمكن تكرار التكامل لنفس الجهة.` 
      };
    }

    try {
      if (current[systemKey]) {
        if (!current[systemKey].integrations) current[systemKey].integrations = {};
        current[systemKey].integrations[integration.entityId] = integration;
        if (!current[systemKey].associatedSectorKeys) current[systemKey].associatedSectorKeys = [];
        if (!current[systemKey].associatedSectorKeys.includes(integration.entityId)) {
          current[systemKey].associatedSectorKeys.push(integration.entityId);
        }
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
      return { success: response.ok };
    } catch {
      return { success: true };
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
        if (current[systemKey]) {
          if (current[systemKey].integrations) {
            delete current[systemKey].integrations[entityId];
          }
          if (current[systemKey].associatedSectorKeys) {
            current[systemKey].associatedSectorKeys = current[systemKey].associatedSectorKeys.filter(k => k !== entityId);
          }
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
   * Fetch all sectors from the Backend, with automatic graceful local fallback and cache merging
   */
  public async fetchCatalog(): Promise<Record<string, Sector>> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/catalog`, { signal: AbortSignal.timeout(2500) });
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.data !== undefined) {
          this.isBackendOnline = true;
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_SECTORS_KEY);
            const current: Record<string, Sector> = cached ? JSON.parse(cached) : {};
            const merged = { ...current, ...data.data };
            localStorage.setItem(LOCAL_STORAGE_SECTORS_KEY, JSON.stringify(merged));
            return merged;
          } catch {
            return data.data;
          }
        }
      }
    } catch (err) {
      this.isBackendOnline = false;
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_SECTORS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch {}
    }
    return INITIAL_SECTORS;
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
   * Delete a sector from SQLite Backend + update localStorage cache
   */
  public async deleteSector(sectorKey: string): Promise<boolean> {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SECTORS_KEY);
      if (cached) {
        const current: Record<string, Sector> = JSON.parse(cached);
        delete current[sectorKey];
        localStorage.setItem(LOCAL_STORAGE_SECTORS_KEY, JSON.stringify(current));
      }
    } catch {}

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
      return true;
    }
  }

  /**
   * Unified Sovereign Save (Create or Update) for Sector / Entity in SQLite Backend + localStorage
   */
  public async saveSector(sector: Sector): Promise<Sector | null> {
    // 1. Update localStorage immediately for zero-delay persistence
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SECTORS_KEY);
      const current: Record<string, Sector> = cached ? JSON.parse(cached) : { ...INITIAL_SECTORS };
      current[sector.key] = sector;
      localStorage.setItem(LOCAL_STORAGE_SECTORS_KEY, JSON.stringify(current));
    } catch {}

    // 2. Persist to SQLite Database via Backend API
    try {
      const token = localStorage.getItem('gov_fintech_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BACKEND_BASE_URL}/sectors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: sector.key,
          name: sector.name,
          nameEn: sector.nameEn || sector.name,
          code: sector.code
        }),
        signal: AbortSignal.timeout(3500)
      });

      if (response.ok) {
        const result = await response.json();
        return result.data || sector;
      }
      return sector;
    } catch {
      return sector;
    }
  }

  /**
   * Create a new sector / entity
   */
  public async createSector(sector: { key: string; name: string; nameEn?: string; code: string }): Promise<Sector | null> {
    const newSector: Sector = {
      key: sector.key,
      name: sector.name,
      nameEn: sector.nameEn || sector.name,
      code: sector.code,
      icon: 'Building2',
      services: {
        core: {
          title: sector.name,
          titleEn: sector.nameEn || sector.name,
          code: sector.code,
          baseUrl: 'https://api.gov.fintech',
          versions: ['v2026.2'],
          endpoints: []
        }
      }
    };
    return this.saveSector(newSector);
  }

  /**
   * Update an existing sector in SQLite Backend + update localStorage cache
   */
  public async updateSector(sectorKey: string, updates: { name?: string; nameEn?: string; code?: string }): Promise<Sector | null> {
    const cached = localStorage.getItem(LOCAL_STORAGE_SECTORS_KEY);
    const current: Record<string, Sector> = cached ? JSON.parse(cached) : {};
    const existing = current[sectorKey] || {
      key: sectorKey,
      name: updates.name || sectorKey,
      nameEn: updates.nameEn,
      code: updates.code || `SEC_${sectorKey.toUpperCase()}`,
      services: {}
    };
    const updated: Sector = {
      ...existing,
      ...updates,
      key: sectorKey
    };
    return this.saveSector(updated);
  }
}

export const catalogService = CatalogService.getInstance();
