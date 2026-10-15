import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { GetCatalogUseCase } from '../../application/usecases/GetCatalogUseCase.js';
import { GetSectorEndpointsUseCase } from '../../application/usecases/GetSectorEndpointsUseCase.js';
import { CreateEndpointUseCase } from '../../application/usecases/CreateEndpointUseCase.js';
import { CreateSectorUseCase } from '../../application/usecases/CreateSectorUseCase.js';
import { DeleteSectorUseCase } from '../../application/usecases/DeleteSectorUseCase.js';
import { Sector } from '../../domain/entities/Sector.js';
import { SqliteSystemRepository } from '../../infrastructure/repositories/SqliteSystemRepository.js';

export class CatalogController {
  constructor(
    private readonly getCatalogUseCase: GetCatalogUseCase,
    private readonly getSectorEndpointsUseCase: GetSectorEndpointsUseCase,
    private readonly createEndpointUseCase: CreateEndpointUseCase,
    private readonly createSectorUseCase: CreateSectorUseCase,
    private readonly deleteSectorUseCase: DeleteSectorUseCase,
    private readonly systemRepository?: SqliteSystemRepository
  ) {}

  getCatalog = async (req: Request, res: Response): Promise<void> => {
    try {
      const catalog = await this.getCatalogUseCase.execute();
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      // Scoped Data Isolation: For EXTERNAL users, filter sectors and systems
      let responseCatalog: Record<string, Sector> = catalog;
      if (user && user.userType === 'EXTERNAL' && user.accessScope) {
        responseCatalog = {};
        const allowedSystems = user.accessScope.allowedSystemIds || [];

        for (const [key, sector] of Object.entries(catalog)) {
          const isAllowed =
            allowedSystems.includes('*') ||
            allowedSystems.includes(key) ||
            allowedSystems.includes(sector.code);
          if (isAllowed) {
            responseCatalog[key] = sector;
          }
        }
      }

      res.status(200).json({
        success: true,
        data: responseCatalog,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
  };

  getSectorEndpoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const sectorKey = String(req.params.sectorKey);
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      // Verify scope for external user
      if (user && user.userType === 'EXTERNAL' && user.accessScope) {
        const allowedSystems = user.accessScope.allowedSystemIds || [];
        const isAllowed = allowedSystems.includes('*') || allowedSystems.includes(sectorKey);
        if (!isAllowed) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'لا تملك صلاحية الوصول لهذا النظام أو القطاع المحدد.'
          });
          return;
        }
      }

      const endpoints = await this.getSectorEndpointsUseCase.execute(sectorKey);
      res.status(200).json({
        success: true,
        data: endpoints,
        count: endpoints.length
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
  };

  createEndpoint = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.createEndpointUseCase.execute(req.body);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Endpoint created / updated successfully'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };

  createSector = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.createSectorUseCase.execute(req.body);
      res.status(201).json({
        success: true,
        data: created,
        message: 'Sector created successfully'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };

  deleteSector = async (req: Request, res: Response): Promise<void> => {
    try {
      const sectorKey = String(req.params.sectorKey);
      const success = await this.deleteSectorUseCase.execute(sectorKey);
      res.status(200).json({
        success,
        message: `Sector "${sectorKey}" deleted successfully`
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Bad Request'
      });
    }
  };

  updateSector = async (req: Request, res: Response): Promise<void> => {
    try {
      const sectorKey = String(req.params.sectorKey);
      const catalog = await this.getCatalogUseCase.execute();
      const existing = catalog[sectorKey];
      if (!existing) {
        res.status(404).json({ success: false, error: `Sector "${sectorKey}" not found` });
        return;
      }
      const updated: Sector = {
        ...existing,
        name: req.body.name || existing.name,
        nameEn: req.body.nameEn || existing.nameEn,
        code: req.body.code || existing.code
      };
      const repo = (this.createSectorUseCase as any).sectorRepository;
      if (repo && repo.saveSector) {
        await repo.saveSector(sectorKey, updated);
      }
      res.status(200).json({ success: true, data: updated, message: 'Sector updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };

  getSystems = async (_req: Request, res: Response): Promise<void> => {
    try {
      if (this.systemRepository) {
        const systems = await this.systemRepository.getAllSystems();
        res.status(200).json({ success: true, data: systems });
        return;
      }
      res.status(200).json({ success: true, data: {} });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  };

  createSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.systemRepository) {
        res.status(500).json({ success: false, error: 'System repository not initialized' });
        return;
      }
      const saved = await this.systemRepository.saveSystem(req.body);
      res.status(201).json({ success: true, data: saved, message: 'System saved successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };

  updateSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const systemKey = String(req.params.systemKey);
      if (!this.systemRepository) {
        res.status(500).json({ success: false, error: 'System repository not initialized' });
        return;
      }
      const updated = await this.systemRepository.updateSystem(systemKey, req.body);
      res.status(200).json({ success: true, data: updated, message: 'System updated successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };

  deleteSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const systemKey = String(req.params.systemKey);
      if (!this.systemRepository) {
        res.status(500).json({ success: false, error: 'System repository not initialized' });
        return;
      }
      const success = await this.systemRepository.deleteSystem(systemKey);
      res.status(200).json({ success, message: `System "${systemKey}" deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };

  saveIntegration = async (req: Request, res: Response): Promise<void> => {
    try {
      const systemKey = String(req.params.systemKey);
      if (!this.systemRepository) {
        res.status(500).json({ success: false, error: 'System repository not initialized' });
        return;
      }
      const updated = await this.systemRepository.addOrUpdateIntegration(systemKey, req.body);
      res.status(200).json({ success: true, data: updated, message: 'Integration saved successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };

  deleteIntegration = async (req: Request, res: Response): Promise<void> => {
    try {
      const systemKey = String(req.params.systemKey);
      const entityId = String(req.params.entityId);
      if (!this.systemRepository) {
        res.status(500).json({ success: false, error: 'System repository not initialized' });
        return;
      }
      const updated = await this.systemRepository.deleteIntegration(systemKey, entityId);
      res.status(200).json({ success: true, data: updated, message: 'Integration deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Bad Request' });
    }
  };
}
